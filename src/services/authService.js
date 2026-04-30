import { supabase } from '../lib/supabase';

// Iniciar sesión
export const loginAdmin = async (username, password) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) return { success: false, message: 'Usuario o clave incorrecta' };
    return { success: true, data };
  } catch (err) {
    return { success: false, message: 'Error de conexión' };
  }
};

// Obtener lista filtrada por contexto para privacidad y segmentación de módulos
export const getAdmins = async (currentAdmin = null, selectedModule = null, includeSelf = false) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('username', { ascending: true });

    if (error) throw error;
    
    let filteredData = data || [];

    // Si no es el Super Admin Master (ambos o admin_master), aplicamos filtros estrictos
    if (currentAdmin && currentAdmin.rol !== 'ambos' && currentAdmin.rol !== 'admin_master') {
      filteredData = filteredData.filter(u => {
        // No mostrarse a sí mismo si no se requiere
        if (!includeSelf && u.id === currentAdmin.id) return false;

        // Lógica de segmentación por módulo
        if (selectedModule === 'parqueadero') {
          return u.rol === 'parqueadero' || u.rol === 'empleado_parqueo' || u.rol === 'empleado_ambos';
        }
        
        if (selectedModule === 'informales') {
          return u.rol === 'informales' || u.rol === 'empleado_informales' || u.rol === 'empleado_ambos';
        }

        return u.rol === currentAdmin.rol;
      });
    } else if (currentAdmin && !includeSelf) {
      // El Super Admin Master ve a todos excepto a sí mismo (si no se pide incluirse)
      filteredData = filteredData.filter(u => u.id !== currentAdmin.id);
    }

    return { success: true, data: filteredData };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

// Crear nuevo usuario (Admin o Empleado)
export const createAdmin = async (adminData) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .insert([{
        username: adminData.username.toLowerCase(),
        password: adminData.password,
        rol: adminData.rol,
        nombre_completo: adminData.nombre_completo || adminData.username,
        foto_perfil: adminData.foto_perfil || ''
      }])
      .select();

    if (error) {
      if (error.code === '23505') return { success: false, message: 'El nombre de usuario ya existe' };
      throw error;
    }
    return { success: true, data: data[0] };
  } catch (err) {
    console.error("Error creando admin:", err);
    return { success: false, message: err.message };
  }
};

// Actualizar cualquier dato del usuario
export const updateAdmin = async (id, updateData) => {
  try {
    const cleanData = { ...updateData };
    if (cleanData.username) cleanData.username = cleanData.username.toLowerCase();
    
    const { data, error } = await supabase
      .from('admins')
      .update(cleanData)
      .eq('id', id)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (err) {
    console.error("Error actualizando admin:", err);
    return { success: false, message: err.message };
  }
};

// Eliminar usuario
export const deleteAdmin = async (id) => {
  try {
    // Antes de borrar el admin, limpiar referencias
    await supabase.from('mensajes').delete().or(`remitente_id.eq.${id},destinatario_id.eq.${id}`);
    await supabase.from('evidencias').delete().eq('subido_por', id);

    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error eliminando admin:", err);
    return { success: false, message: err.message };
  }
};
