import { supabase } from '../lib/supabase';

/**
 * Registra una acción en el historial de auditoría
 * @param {string} modulo - 'informales' o 'parqueadero'
 * @param {string} accion - Tipo de acción (e.g., 'CREACION', 'ABONO', 'LIQUIDACION', 'EXTENSION_DIAS', 'DESACTIVACION')
 * @param {string} descripcion - Detalles legibles de la acción
 * @param {string} usuario - Username del admin/empleado
 */
export const registrarAuditoria = async (modulo, accion, descripcion, usuario) => {
  try {
    const { error } = await supabase
      .from('historial_auditoria')
      .insert([{
        modulo,
        accion,
        descripcion,
        usuario: usuario || 'sistema',
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error("Error al registrar auditoría:", error);
    }
  } catch (err) {
    console.error("Error crítico en registrarAuditoria:", err);
  }
};

/**
 * Obtiene el historial de auditoría con filtros opcionales
 * @param {string} modulo - Filtro opcional por módulo
 */
export const getAuditoria = async (modulo = 'informales') => {
  try {
    const { data, error } = await supabase
      .from('historial_auditoria')
      .select('*')
      .eq('modulo', modulo)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error("Error en getAuditoria:", error);
    return { success: false, data: [] };
  }
};
