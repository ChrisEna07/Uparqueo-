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
 */
export const getAdmins = async (adminObj, moduloStr, arg3) => {
  try {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('created_at', { ascending: false });
    
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

    // 3. El trigger de la DB habrá creado un perfil vacío con el nuevo ID. 
    // Lo actualizamos con los datos del formulario.
    if (authData?.user) {
      const { error: profileError } = await supabase
        .from('perfiles')
        .update({
          username: formData.username.trim().toLowerCase(),
          nombre_completo: formData.nombre_completo,
          rol: formData.rol,
          foto_perfil: formData.foto_perfil
        })
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
