import { supabase } from '../lib/supabase';
import { registrarAuditoria } from './auditService';

/**
 * Consulta egresos filtrando por rango de fechas, módulo obligatorio y organizacion_id opcional.
 */
export const getGastosPorFechas = async (inicio, fin, modulo = 'parqueadero', organizacionId = null) => {
  try {
    let query = supabase
      .from('egresos')
      .select('*')
      .gte('created_at', inicio)
      .lte('created_at', fin)
      .is('deleted_at', null);

    if (modulo) {
      query = query.eq('modulo', modulo);
    }

    if (organizacionId) {
      query = query.eq('organizacion_id', organizacionId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error al obtener gastos por fechas:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Consulta todos los egresos activos para el módulo actual ('parqueadero' o 'informal'),
 * filtrando por organizacion_id si el contexto lo provee.
 */
export const getGastos = async (modulo = 'parqueadero', organizacionId = null) => {
  try {
    let query = supabase
      .from('egresos')
      .select('*')
      .is('deleted_at', null);

    if (modulo) {
      query = query.eq('modulo', modulo);
    }

    if (organizacionId) {
      query = query.eq('organizacion_id', organizacionId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Registra un nuevo gasto inyectando de forma automática y transparente
 * 'modulo' y 'organizacion_id'.
 */
export const registrarGasto = async (gastoData, adminUsername, modulo = 'parqueadero', organizacionId = null) => {
  try {
    const moduloFinal = gastoData.modulo || modulo || 'parqueadero';
    const orgIdFinal = gastoData.organizacion_id !== undefined ? gastoData.organizacion_id : (organizacionId || null);

    const { data, error } = await supabase
      .from('egresos')
      .insert([{
        monto: gastoData.monto,
        descripcion: gastoData.descripcion,
        categoria: gastoData.categoria || 'Varios',
        registrado_por: adminUsername,
        modulo: moduloFinal,
        organizacion_id: orgIdFinal
      }])
      .select();

    if (error) throw error;

    // Registrar en trazabilidad con los parámetros correctos
    await registrarAuditoria(
      moduloFinal === 'informal' ? 'informales' : 'gastos', 
      'EGRESO', 
      `Gasto registrado [${moduloFinal}]: $${Number(gastoData.monto).toLocaleString()} - ${gastoData.descripcion}`,
      adminUsername
    );

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Actualiza un gasto existente preservando modulo y organizacion_id.
 */
export const actualizarGasto = async (id, nuevosDatos, datosAnteriores, adminUsername) => {
  try {
    const updatePayload = {
      monto: nuevosDatos.monto,
      descripcion: nuevosDatos.descripcion,
      categoria: nuevosDatos.categoria
    };

    if (nuevosDatos.modulo) {
      updatePayload.modulo = nuevosDatos.modulo;
    }
    if (nuevosDatos.organizacion_id !== undefined) {
      updatePayload.organizacion_id = nuevosDatos.organizacion_id;
    }

    const { data, error } = await supabase
      .from('egresos')
      .update(updatePayload)
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
