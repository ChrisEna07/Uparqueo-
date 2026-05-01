import { supabase } from '../lib/supabase';
import { registrarAuditoria } from './auditService';

export const getGastos = async () => {
  try {
    const { data, error } = await supabase
      .from('egresos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    return { success: false, error: error.message };
  }
};

export const registrarGasto = async (gastoData, adminUsername) => {
  try {
    const { data, error } = await supabase
      .from('egresos')
      .insert([{
        monto: gastoData.monto,
        descripcion: gastoData.descripcion,
        categoria: gastoData.categoria || 'Varios',
        registrado_por: adminUsername
      }])
      .select();

    if (error) throw error;

    // Registrar en trazabilidad con los parámetros correctos (modulo, accion, descripcion, usuario)
    await registrarAuditoria(
      'gastos', 
      'EGRESO', 
      `Gasto registrado: $${Number(gastoData.monto).toLocaleString()} - ${gastoData.descripcion}`,
      adminUsername
    );

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    return { success: false, error: error.message };
  }
};

export const actualizarGasto = async (id, nuevosDatos, datosAnteriores, adminUsername) => {
  try {
    const { data, error } = await supabase
      .from('egresos')
      .update({
        monto: nuevosDatos.monto,
        descripcion: nuevosDatos.descripcion,
        categoria: nuevosDatos.categoria
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    // Generar descripción detallada del cambio para la trazabilidad
    let cambios = [];
    if (Number(datosAnteriores.monto) !== Number(nuevosDatos.monto)) {
      cambios.push(`Monto: $${Number(datosAnteriores.monto).toLocaleString()} -> $${Number(nuevosDatos.monto).toLocaleString()}`);
    }
    if (datosAnteriores.descripcion !== nuevosDatos.descripcion) {
      cambios.push(`Desc: "${datosAnteriores.descripcion}" -> "${nuevosDatos.descripcion}"`);
    }
    if (datosAnteriores.categoria !== nuevosDatos.categoria) {
      cambios.push(`Cat: ${datosAnteriores.categoria} -> ${nuevosDatos.categoria}`);
    }

    if (cambios.length > 0) {
      await registrarAuditoria(
        'gastos', 
        'EDICION', 
        `Gasto Editado ID ${id.substring(0,8)}: ${cambios.join(' | ')}`,
        adminUsername
      );
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    return { success: false, error: error.message };
  }
};
