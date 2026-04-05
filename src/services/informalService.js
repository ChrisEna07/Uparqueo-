import { supabase } from '../lib/supabase';

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
 * Registra un nuevo abono sumándolo al acumulado actual
 */
export const registrarAbono = async (id, abonoAnterior, nuevoAbono) => {
  const sumaTotal = parseFloat(abonoAnterior || 0) + parseFloat(nuevoAbono);
  
  const { error } = await supabase
    .from('negocios_informales')
    .update({ abonos: sumaTotal })
    .eq('id', id);

  if (error) throw error;
};

/**
 * Suma un día extra manualmente (Botón +)
 */
export const agregarDiasManuales = async (id, diasActuales) => {
  const { error } = await supabase
    .from('negocios_informales')
    .update({ dias_manuales: (diasActuales || 0) + 1 })
    .eq('id', id);
    
  if (error) throw error;
};

/**
 * Desactiva un negocio (cuando se retira definitivamente)
 */
export const desactivarNegocio = async (id) => {
  const { error } = await supabase
    .from('negocios_informales')
    .update({ activo: false })
    .eq('id', id);
    
  if (error) throw error;
};

/**
 * Crea un nuevo registro de negocio informal
 */
export const registrarNegocioInformal = async (datos) => {
  const { data, error } = await supabase
    .from('negocios_informales')
    .insert([{
      ...datos,
      activo: true,
      abonos: 0,
      dias_manuales: 0,
      fecha_inicio: new Date().toISOString().split('T')[0] // Guarda solo YYYY-MM-DD
    }]);
    
  if (error) throw error;
  return data;
};