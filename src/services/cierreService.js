import { supabase } from '../lib/supabase';
import { registrarAuditoria } from './auditService';

export const getUltimoCierre = async () => {
  try {
    const { data, error } = await supabase
      .from('historial_auditoria')
      .select('*')
      .eq('accion', 'CIERRE_CAJA')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error al obtener último cierre:", error);
    return { success: false, data: null };
  }
};

export const registrarCierreCaja = async (datosCierre, adminUsername) => {
  try {
    const descripcion = `CIERRE DE CAJA: Recaudado: $${datosCierre.totalRecaudado.toLocaleString()} | Gastos: $${datosCierre.totalGastos.toLocaleString()} | Neto: $${datosCierre.balanceNeto.toLocaleString()}`;
    
    await registrarAuditoria(
      'reportes',
      'CIERRE_CAJA',
      descripcion,
      adminUsername
    );

    return { success: true };
  } catch (error) {
    console.error("Error al registrar cierre de caja:", error);
    return { success: false, error: error.message };
  }
};
