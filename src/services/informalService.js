import { supabase } from '../lib/supabase';
import { registrarAuditoria } from './auditService';
/**
 * Calcula la deuda basada en: (Días calendario + Días manuales) * Tarifa - Abonos
 * @param {Object} negocio - El objeto del negocio desde la DB
 * @param {Number} tarifa - El valor por día (traído de la tabla configuracion)
 */
export const calcularDeudaDetallada = (negocio, tarifa = 5000, cargosAdicionales = []) => {
  if (!negocio.activo) return { deudaTotal: 0, diasTotales: 0, sumaCargos: 0 };

  const ahoraColombia = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Bogota"}));
  ahoraColombia.setHours(0,0,0,0);

  const [year, month, day] = negocio.fecha_inicio.split('-').map(Number);
  const inicioColombia = new Date(year, month - 1, day);
  inicioColombia.setHours(0,0,0,0);
  
  const diffTime = ahoraColombia - inicioColombia;
  const diasCalendario = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const diasTotales = (diasCalendario < 0 ? 0 : diasCalendario) + (negocio.dias_manuales || 0);
  const tarifaAplicar = negocio.valor_diario || tarifa;
  
  // Sumar todos los cargos adicionales registrados para este negocio
  const sumaCargos = cargosAdicionales.reduce((acc, c) => acc + Number(c.monto), 0);
  
  const deudaTotal = (diasTotales * tarifaAplicar) + sumaCargos - (negocio.abonos || 0);

  return {
    diasTotales,
    sumaCargos,
    deudaTotal: deudaTotal > 0 ? deudaTotal : 0
  };
};

export const registrarCargoAdicional = async (negocioId, nombreCargo, monto, adminUsername = 'sistema', nombreNegocio = '') => {
  try {
    const { data, error } = await supabase
      .from('cargos_adicionales_informales')
      .insert([{
        negocio_id: negocioId,
        nombre_cargo: nombreCargo,
        monto: parseFloat(monto),
        registrado_por: adminUsername
      }])
      .select();

    if (error) throw error;

    await registrarAuditoria(
      'informales', 
      'CARGO_EXTRA', 
      `Nuevo cargo adicional en ${nombreNegocio}: ${nombreCargo} ($${parseFloat(monto).toLocaleString()})`, 
      adminUsername
    );

    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Error en registrarCargoAdicional:", error);
    return { success: false, error };
  }
};

export const getNegociosInformales = async () => {
  try {
    const { data, error } = await supabase
      .from('negocios_informales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Obtener todos los cargos adicionales para procesar
    const { data: cargos } = await supabase.from('cargos_adicionales_informales').select('*');
    const tarifaGlobal = await getTarifaInformal();

    const procesados = (data || []).map(n => {
      const cargosNegocio = (cargos || []).filter(c => c.negocio_id === n.id);
      const { deudaTotal, diasTotales, sumaCargos } = calcularDeudaDetallada(n, tarifaGlobal, cargosNegocio);
      return {
        ...n,
        abonos_hoy: n.abonos || 0,
        deuda_acumulada: deudaTotal,
        dias_totales: diasTotales,
        suma_cargos_extra: sumaCargos,
        lista_cargos: cargosNegocio
      };
    });

    return { success: true, data: procesados };
  } catch (error) {
    console.error("Error en getNegociosInformales:", error);
    return { success: false, data: [] };
  }
};


/**
 * Obtiene la tarifa actual para negocios informales desde la tabla configuracion
 */
export const getTarifaInformal = async () => {
  const { data, error } = await supabase
    .from('configuracion')
    .select('valor_fraccion')
    .eq('tipo_vehiculo', 'informal')
    .single();

  if (error) {
    console.error("Error al obtener tarifa informal, usando 5000 por defecto:", error);
    return 5000; // Valor de respaldo si no existe en la DB
  }
  return data.valor_fraccion;
};

/**
 * Obtiene el límite máximo de días sin pago para negocios informales
 */
export const getLimiteDiasInformal = async () => {
  const { data, error } = await supabase
    .from('configuracion')
    .select('valor_fraccion')
    .eq('tipo_vehiculo', 'limite_dias_informal')
    .single();

  if (error) {
    // Si no existe, usamos 0 o un valor muy alto por defecto (ej. 30 días)
    return 30; 
  }
  return data.valor_fraccion;
};


/**
 * Registra un nuevo abono sumándolo al acumulado actual
 */
export const registrarAbono = async (id, abonoAnterior, nuevoAbono, adminUsername = 'sistema', nombreNegocio = '') => {
  const sumaTotal = parseFloat(abonoAnterior || 0) + parseFloat(nuevoAbono);
  
  // 1. Actualizar el acumulado en el negocio
  const { error: errorUpdate } = await supabase
    .from('negocios_informales')
    .update({ 
      abonos: sumaTotal
    })
    .eq('id', id);

  if (errorUpdate) throw errorUpdate;

  // 2. Registrar en el historial de abonos
  const { error: errorHistorial } = await supabase
    .from('historial_pagos_informales')
    .insert([{
      negocio_id: id,
      monto: parseFloat(nuevoAbono),
      registrado_por: adminUsername,
      fecha: new Date().toISOString()
    }]);

  if (errorHistorial) {
    console.error("Error al guardar historial de abono:", errorHistorial);
  } else {
    await registrarAuditoria('informales', 'ABONO', `Abono de $${parseFloat(nuevoAbono).toLocaleString()} al negocio ${nombreNegocio || `ID #${id.slice(0,5)}`}`, adminUsername);
  }
};

/**
 * Obtiene el historial de abonos de un negocio específico
 */
export const getHistorialAbonos = async (negocioId) => {
  try {
    const { data, error } = await supabase
      .from('historial_pagos_informales')
      .select('*')
      .eq('negocio_id', negocioId)
      .order('fecha', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error en getHistorialAbonos:", error);
    return { success: false, data: [] };
  }
};

/**
 * Agrega días adicionales manualmente
 */
export const agregarDiasManuales = async (id, diasActuales, diasNuevos = 1, adminUsername = 'sistema', nombreNegocio = '') => {
  try {
    const { error } = await supabase
      .from('negocios_informales')
      .update({ dias_manuales: (diasActuales || 0) + diasNuevos })
      .eq('id', id);
      
    if (error) throw error;
    await registrarAuditoria('informales', 'EXTENSION_DIAS', `Se agregaron ${diasNuevos} días al negocio ${nombreNegocio || `ID #${id.slice(0,5)}`}`, adminUsername);
    return { success: true };
  } catch (error) {
    console.error("Error en agregarDiasManuales:", error);
    throw error;
  }
};

/**
 * Cambia el estado (activar/desactivar) de un negocio
 */
export const desactivarNegocio = async (id, nuevoEstado, adminUsername = 'sistema', nombreNegocio = '') => {
  try {
    const { error } = await supabase
      .from('negocios_informales')
      .update({ activo: nuevoEstado })
      .eq('id', id);
      
    if (error) throw error;
    await registrarAuditoria('informales', 'ESTADO', `El negocio ${nombreNegocio || `ID #${id.slice(0,5)}`} fue ${nuevoEstado ? 'activado' : 'desactivado'}`, adminUsername);
    return { success: true };
  } catch (error) {
    console.error("Error en desactivarNegocio:", error);
    throw error;
  }
};

/**
 * Actualiza la tarifa diaria de un negocio y registra el cambio en auditoría
 */
export const actualizarTarifaNegocio = async (id, nombreNegocio, tarifaAnterior, tarifaNueva, adminUsername = 'sistema') => {
  try {
    const { error } = await supabase
      .from('negocios_informales')
      .update({ valor_diario: parseFloat(tarifaNueva) })
      .eq('id', id);
      
    if (error) throw error;

    await registrarAuditoria(
      'informales', 
      'AJUSTE_TARIFA', 
      `Cambio de tarifa en ${nombreNegocio}: de $${parseFloat(tarifaAnterior).toLocaleString()} a $${parseFloat(tarifaNueva).toLocaleString()}`, 
      adminUsername
    );

    return { success: true };
  } catch (error) {
    console.error("Error en actualizarTarifaNegocio:", error);
    throw error;
  }
};


/**
 * Crea un nuevo registro de negocio informal
 */
export const registrarNegocio = async (datos, adminUsername = 'sistema') => {
  try {
    // Solo enviamos los campos que existen en la DB según la captura del usuario
    const { nombre_cliente, nombre_negocio, celular, valor_diario } = datos;

    const { data, error } = await supabase
      .from('negocios_informales')
      .insert([{
        nombre_cliente,
        nombre_negocio,
        celular,
        valor_diario,
        activo: true,
        abonos: 0,
        dias_manuales: 0,
        registrado_por: adminUsername,
        fecha_inicio: new Date().toLocaleDateString("en-CA", {timeZone: "America/Bogota"}) // Formato YYYY-MM-DD
      }])
      .select();
      
    if (error) throw error;
    await registrarAuditoria('informales', 'CREACION', `Se creó el negocio ${nombre_negocio} con tarifa diaria de $${parseFloat(valor_diario).toLocaleString()}`, adminUsername);
    return { success: true, data };
  } catch (error) {
    console.error("Error en registrarNegocio:", error);
    return { success: false, error };
  }
};
/**
 * Obtiene un resumen financiero para reportes de negocios informales
 */
export const getReporteInformal = async () => {
  try {
    const { data, error } = await supabase
      .from('negocios_informales')
      .select('*');
    
    if (error) throw error;

    const { data: tarifaData } = await supabase
      .from('configuracion')
      .select('valor_fraccion')
      .eq('tipo_vehiculo', 'informal')
      .single();
    
    const tarifaGlobal = tarifaData?.valor_fraccion || 5000;
    
    const totalRecaudado = data.reduce((sum, n) => sum + (n.abonos || 0), 0);
    
    const totalDeuda = data.reduce((sum, n) => {
      const fechaInicio = new Date(n.fecha_inicio);
      const hoy = new Date();
      const inicioUTC = Date.UTC(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
      const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const diffTime = hoyUTC - inicioUTC;
      const diasCalendario = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diasTotales = (diasCalendario < 0 ? 0 : diasCalendario) + (n.dias_manuales || 0);
      const deudaTotal = (diasTotales * tarifaGlobal) - (n.abonos || 0);
      
      return sum + (deudaTotal > 0 ? deudaTotal : 0);
    }, 0);

    return {
      success: true,
      data: data || [],
      resumen: {
        totalRecaudado,
        totalDeuda,
        totalNegocios: data.length,
        activos: data.filter(n => n.activo).length
      }
    };
  } catch (error) {
    console.error("Error en getReporteInformal:", error);
    return { success: false, resumen: { totalRecaudado: 0, totalDeuda: 0, totalNegocios: 0 } };
  }
};
