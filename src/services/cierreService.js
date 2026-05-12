import { supabase } from '../lib/supabase';
import { registrarAuditoria } from './auditService';

/**
 * Obtiene el último cierre de caja registrado en la nueva tabla dedicada
 */
export const getUltimoCierre = async (modulo) => {
  try {
    const { data, error } = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('modulo', modulo)
      .order('fecha_cierre', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error al obtener último cierre:", error);
    
    // Fallback: Si la tabla cierres_caja aún no existe, buscamos en auditoría (retrocompatibilidad)
    const { data: oldData } = await supabase
      .from('historial_auditoria')
      .select('*')
      .eq('accion', 'CIERRE_CAJA')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    return { success: true, data: oldData };
  }
};

/**
 * Registra un cierre formal y bloquea las transacciones actuales
 */
export const registrarCierreCaja = async (datosCierre, adminUsername, modulo) => {
  try {
    // 1. Crear el registro en cierres_caja
    const { data: nuevoCierre, error: errCierre } = await supabase
      .from('cierres_caja')
      .insert([{
        total_ingresos_parqueo: datosCierre.totalIngresos || 0,
        total_abonos_informales: datosCierre.totalAbonos || datosCierre.totalRecaudado || 0,
        total_gastos: datosCierre.totalGastos || 0,
        balance_neto: datosCierre.balanceNeto || 0,
        usuario_cierre: adminUsername,
        fecha_cierre: new Date().toISOString(),
        modulo: modulo
      }])
      .select()
      .single();

    if (errCierre) throw errCierre;

    const cierreId = nuevoCierre.id;

    // 2. Bloquear transacciones vinculándolas al cierre de manera INDEPENDIENTE
    // Solo bloqueamos egresos generales por ahora (idealmente se separarían por módulo también)
    await supabase.from('egresos').update({ cierre_id: cierreId }).is('cierre_id', null);
    
    if (modulo === 'parqueadero') {
      await supabase.from('registros_parqueadero').update({ cierre_id: cierreId }).is('cierre_id', null);
    } else if (modulo === 'informales') {
      await supabase.from('historial_pagos_informales').update({ cierre_id: cierreId }).is('cierre_id', null);
    }

    // 3. Registrar en auditoría para trazabilidad histórica
    const descripcion = `CIERRE FORMAL ID ${cierreId.substring(0,8)}: Neto $${datosCierre.balanceNeto.toLocaleString()}`;
    await registrarAuditoria('reportes', 'CIERRE_CAJA', descripcion, adminUsername);

    return { success: true, data: nuevoCierre };
  } catch (error) {
    console.error("Error al registrar cierre de caja:", error);
    return { success: false, error: error.message };
  }
};
