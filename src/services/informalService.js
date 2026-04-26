import { supabase } from '../lib/supabase';

/**
 * Calcula la deuda basada en: (Días calendario + Días manuales) * Tarifa - Abonos
 * @param {Object} negocio - El objeto del negocio desde la DB
 * @param {Number} tarifa - El valor por día (traído de la tabla configuracion)
 */
export const calcularDeudaDetallada = (negocio, tarifa = 5000) => {
  if (!negocio.activo) return { deudaTotal: 0, diasTotales: 0 };

  const fechaInicio = new Date(negocio.fecha_inicio);
  const hoy = new Date();
  
  // Normalizar fechas a medianoche UTC para contar días exactos
  const inicioUTC = Date.UTC(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  
  const diffTime = hoyUTC - inicioUTC;
  const diasCalendario = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Días totales = Transcurridos + Ajustes manuales
  const diasTotales = (diasCalendario < 0 ? 0 : diasCalendario) + (negocio.dias_manuales || 0);
  
  // Cálculo final restando lo que ya ha pagado (abonos)
  const deudaTotal = (diasTotales * tarifa) - (negocio.abonos || 0);

  return {
    diasTotales,
    deudaTotal
  };
};


/**
 * Obtiene todos los negocios informales registrados
 */
export const getNegociosInformales = async () => {
  try {
    const { data, error } = await supabase
      .from('negocios_informales')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;

    // Obtener la tarifa global primero
    const tarifaGlobal = await getTarifaInformal();

    // Procesar datos para calcular deuda y asegurar campos requeridos por el componente
    const procesados = (data || []).map(n => {
      const { deudaTotal, diasTotales } = calcularDeudaDetallada(n, tarifaGlobal);
      return {
        ...n,
        abonos_hoy: n.abonos || 0,
        deuda_acumulada: deudaTotal,
        dias_totales: diasTotales
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
export const registrarAbono = async (id, abonoAnterior, nuevoAbono) => {
  const sumaTotal = parseFloat(abonoAnterior || 0) + parseFloat(nuevoAbono);
  
  // 1. Actualizar el acumulado en el negocio
  const { error: errorUpdate } = await supabase
    .from('negocios_informales')
    .update({ abonos: sumaTotal })
    .eq('id', id);

  if (errorUpdate) throw errorUpdate;

  // 2. Registrar en el historial de abonos
  const { error: errorHistorial } = await supabase
    .from('historial_pagos_informales')
    .insert([{
      negocio_id: id,
      monto: parseFloat(nuevoAbono),
      fecha: new Date().toISOString()
    }]);

  if (errorHistorial) console.error("Error al guardar historial de abono:", errorHistorial);
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
export const agregarDiasManuales = async (id, diasActuales, diasNuevos = 1) => {
  try {
    const { error } = await supabase
      .from('negocios_informales')
      .update({ dias_manuales: (diasActuales || 0) + diasNuevos })
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error en agregarDiasManuales:", error);
    throw error;
  }
};

/**
 * Cambia el estado (activar/desactivar) de un negocio
 */
export const desactivarNegocio = async (id, nuevoEstado) => {
  try {
    const { error } = await supabase
      .from('negocios_informales')
      .update({ activo: nuevoEstado })
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error en desactivarNegocio:", error);
    throw error;
  }
};


/**
 * Crea un nuevo registro de negocio informal
 */
export const registrarNegocio = async (datos) => {
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
        fecha_inicio: new Date().toISOString().split('T')[0]
      }])
      .select();
      
    if (error) throw error;
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
