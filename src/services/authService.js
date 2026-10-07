import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * Inicia sesión con email y contraseña
 */
export const login = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error("Error en login:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Cierra la sesión actual
 */
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Error en logout:", error.message);
};

/**
 * Obtiene los datos del perfil del usuario actual
 */
export const getPerfil = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Suscribirse a cambios en el estado de autenticación
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

/**
 * Obtiene todos los perfiles (empleados/admins) para el Módulo de Empleados
 * Permite filtrar por módulo ('parqueadero', 'informal') respetando superadmins o accesos globales ('ambos').
 */
export const getAdmins = async (adminObj, moduloStr, esDevConsole = false) => {
  try {
    let query = supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Si no es desde la consola Dev o superadmin global, filtramos por módulo
    const esSuper = adminObj?.rol === 'ambos' || adminObj?.rol === 'admin_master' || adminObj?.rol === 'superadmin' || adminObj?.rol === 'dev';

    if (!esDevConsole && !esSuper) {
      if (adminObj?.organizacion_id) {
        query = query.eq('organizacion_id', adminObj.organizacion_id);
      }
      if (moduloStr) {
        // Normalizar nombre de módulo ('parqueadero' o 'informal')
        const targetModulo = moduloStr === 'informales' ? 'informal' : moduloStr;
        // Permitir ver los que tienen ese módulo o 'ambos'/'todos'
        query = query.or(`modulo.eq.${targetModulo},modulo.eq.ambos,modulo.eq.todos`);
      }
    } else if (!esDevConsole && moduloStr && esSuper) {
      // Si el superadmin seleccionó ver un módulo específico en la vista operativa
      const targetModulo = moduloStr === 'informales' ? 'informal' : moduloStr;
      query = query.or(`modulo.eq.${targetModulo},modulo.eq.ambos,modulo.eq.todos`);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error en getAdmins:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Actualiza un perfil existente
 */
export const updateAdmin = async (id, dataToUpdate) => {
  try {
    const { error } = await supabase
      .from('perfiles')
      .update(dataToUpdate)
      .eq('id', id);

    if (error) throw error;
    return { success: true, data: dataToUpdate };
  } catch (error) {
    console.error('Error en updateAdmin:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Elimina un perfil (Soft delete o eliminar de auth.users es complejo desde el cliente,
 * por ahora podemos eliminarlo de la tabla 'perfiles' si las políticas lo permiten)
 */
export const deleteAdmin = async (id) => {
  try {
    // Al eliminar de perfiles, el usuario ya no podrá operar
    const { error } = await supabase
      .from('perfiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error en deleteAdmin:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Crea un nuevo empleado. Utiliza un cliente secundario para no cerrar la sesión del admin.
 * Asigna automáticamente la columna 'modulo' ('parqueadero', 'informal' o 'ambos').
 */
export const createAdmin = async (formData) => {
  try {
    // 1. Obtener URL y Key para el cliente secundario
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://gsytgctqtsdrwvimfkop.supabase.co';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';
    
    // Cliente sin persistencia de sesión
    const secondarySupabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const email = `${formData.username.trim().toLowerCase()}@uparqueo.com`;

    // 2. Registrar en Supabase Auth
    const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
      email,
      password: formData.password
    });

    if (authError) throw authError;

    // Determinar módulo correspondiente según rol o parámetro explícito
    let moduloAsignado = formData.modulo || 'parqueadero';
    if (!formData.modulo) {
      if (formData.rol === 'informales' || formData.rol === 'empleado_informales') {
        moduloAsignado = 'informal';
      } else if (formData.rol === 'ambos' || formData.rol === 'empleado_ambos' || formData.rol === 'admin_master' || formData.rol === 'superadmin' || formData.rol === 'dev') {
        moduloAsignado = 'ambos';
      } else {
        moduloAsignado = 'parqueadero';
      }
    }

    // 3. El trigger de la DB habrá creado un perfil con el nuevo ID. 
    // Lo actualizamos con los datos del formulario incluyendo 'modulo' y 'organizacion_id'.
    if (authData?.user) {
      const updatePayload = {
        username: formData.username.trim().toLowerCase(),
        nombre_completo: formData.nombre_completo,
        rol: formData.rol,
        modulo: moduloAsignado,
        foto_perfil: formData.foto_perfil
      };

      if (formData.organizacion_id) {
        updatePayload.organizacion_id = formData.organizacion_id;
      }

      const { error: profileError } = await supabase
        .from('perfiles')
        .update(updatePayload)
        .eq('id', authData.user.id);
        
      if (profileError) {
        console.error("Error al actualizar perfil:", profileError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error en createAdmin:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Retorna la lista de módulos permitidos para el usuario ('parqueadero', 'informal')
 */
export const getUserAllowedModules = (admin) => {
  if (!admin) return [];
  
  // Superadmin, dev, admin_master o rol 'ambos'
  const rol = (admin.rol || '').toLowerCase();
  if (rol === 'superadmin' || rol === 'dev' || rol === 'admin_master' || rol === 'ambos' || rol === 'empleado_ambos') {
    return ['parqueadero', 'informal'];
  }

  // Si tiene modulos_permitidos explícito (array)
  if (Array.isArray(admin.modulos_permitidos) && admin.modulos_permitidos.length > 0) {
    return admin.modulos_permitidos.map(m => m === 'informales' ? 'informal' : m);
  }

  // Si tiene 'modulo' asignado en el perfil
  const modulo = (admin.modulo || '').toLowerCase();
  if (modulo === 'ambos' || modulo === 'todos') {
    return ['parqueadero', 'informal'];
  }
  if (modulo === 'informal' || modulo === 'informales') {
    return ['informal'];
  }
  if (modulo === 'parqueadero') {
    return ['parqueadero'];
  }

  // Por roles tradicionales de empleado
  if (rol === 'empleado_parqueo' || rol === 'parqueadero') {
    return ['parqueadero'];
  }
  if (rol === 'empleado_informales' || rol === 'informales' || rol === 'empleado') {
    return ['informal'];
  }

  // Default para rol 'admin'
  return ['parqueadero'];
};

/**
 * Crea un nuevo Administrador de Organización desde el DevPortal.
 * Registra en Supabase Auth y crea/actualiza el perfil en public.perfiles
 * asignando rol='admin', organizacion_id y modulos_permitidos (junto con modulo compatible).
 */
export const createOrganizationAdmin = async ({ organizacion_id, nombre_completo, username, password, modulos_permitidos }) => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL || 'https://gsytgctqtsdrwvimfkop.supabase.co';
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ti60-o1v70dpDQvM73ILsQ_dhhUJv8O';

    const secondarySupabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const cleanUsername = username.trim().toLowerCase();
    const email = `${cleanUsername}@uparqueo.com`;

    // 1. Registrar usuario en Supabase Auth
    const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
      email,
      password: password.trim()
    });

    if (authError) throw authError;
    if (!authData?.user) throw new Error("No se pudo crear el usuario en autenticación.");

    // 2. Determinar columna 'modulo' compatible
    const hasParqueo = modulos_permitidos.includes('parqueadero');
    const hasInformal = modulos_permitidos.includes('informal') || modulos_permitidos.includes('informales');
    
    let moduloCompat = 'parqueadero';
    if (hasParqueo && hasInformal) {
      moduloCompat = 'ambos';
    } else if (hasInformal) {
      moduloCompat = 'informal';
    } else {
      moduloCompat = 'parqueadero';
    }

    // 3. Upsert en public.perfiles
    const profilePayload = {
      id: authData.user.id,
      username: cleanUsername,
      nombre_completo: nombre_completo.trim(),
      rol: 'admin',
      modulo: moduloCompat,
      organizacion_id: organizacion_id || null,
      modulos_permitidos: modulos_permitidos
    };

    let { error: profileError } = await supabase
      .from('perfiles')
      .upsert(profilePayload, { onConflict: 'id' });

    // Si la columna modulos_permitidos no existiera todavía en la base de datos, reintentar sin ella
    if (profileError && (profileError.message?.includes('modulos_permitidos') || profileError.code === '42703')) {
      delete profilePayload.modulos_permitidos;
      const retry = await supabase
        .from('perfiles')
        .upsert(profilePayload, { onConflict: 'id' });
      profileError = retry.error;
    }

    if (profileError) throw profileError;

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Error en createOrganizationAdmin:', error);
    return { success: false, message: error.message };
  }
};

