import { supabase } from '../lib/supabase';

// ============================================
// SERVICIOS DE CONFIGURACIÓN Y TARIFAS
// ============================================

// 1. OBTENER TARIFAS (Corregido para usar configuracion)
export const getTarifas = async () => {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .order('tipo_vehiculo', { ascending: true });
    
    if (error) {
      console.error("Error al obtener tarifas:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error en getTarifas:", error);
    throw new Error("No se pudieron cargar las tarifas");
  }
};

// 2. OBTENER TARIFA POR TIPO
export const getTarifaByTipo = async (tipoVehiculo) => {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('valor_fraccion')
      .eq('tipo_vehiculo', tipoVehiculo)
      .single();
    
    if (error) {
      console.error("Error al obtener tarifa por tipo:", error);
      throw error;
    }
    
    return data?.valor_fraccion || 0;
  } catch (error) {
    console.error("Error en getTarifaByTipo:", error);
    return 0;
  }
};

// 3. ACTUALIZAR TARIFA
export const updateTarifa = async (tipo, nuevoValor) => {
  try {
    const valorNumerico = parseInt(nuevoValor);
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      throw new Error("El valor debe ser un número válido mayor o igual a 0");
    }

    const { data, error } = await supabase
      .from('configuracion')
      .update({ 
        valor_fraccion: valorNumerico, 
        updated_at: new Date().toISOString()
      })
      .eq('tipo_vehiculo', tipo)
      .select();
    
    if (error) {
      console.error("Error al actualizar tarifa:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error en updateTarifa:", error);
    throw new Error(`No se pudo actualizar la tarifa de ${tipo}`);
  }
};

// 4. OBTENER TODA LA CONFIGURACIÓN
export const getConfiguracion = async () => {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en getConfiguracion:", error);
    throw new Error("No se pudo cargar la configuración");
  }
};

// ============================================
// SERVICIOS DE REGISTRO DE VEHÍCULOS
// ============================================

// 5. REGISTRAR ENTRADA
export const registrarEntrada = async (placa, cliente, tipo) => {
  try {
    if (!placa || placa.trim() === '') {
      throw new Error("La placa es obligatoria");
    }

    // Verificar si el vehículo ya está activo
    const { data: vehiculoActivo, error: checkError } = await supabase
      .from('registros_parqueadero')
      .select('id, placa')
      .eq('placa', placa.toUpperCase())
      .eq('estado', 'activo')
      .maybeSingle();

    if (checkError) throw checkError;

    if (vehiculoActivo) {
      throw new Error(`El vehículo con placa ${placa} ya está en el parqueadero`);
    }

    const { data, error } = await supabase
      .from('registros_parqueadero')
      .insert([{ 
        placa: placa.toUpperCase(), 
        cliente_nombre: cliente || null, 
        tipo_vehiculo: tipo,
        estado: 'activo',
        entrada: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error("Error al registrar entrada:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error en registrarEntrada:", error);
    throw error;
  }
};

// 6. OBTENER REGISTROS ACTIVOS
export const getRegistrosActivos = async () => {
  try {
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('estado', 'activo')
      .order('entrada', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error en getRegistrosActivos:", error);
    throw new Error("No se pudieron cargar los vehículos activos");
  }
};

// 7. OBTENER HISTORIAL DE REGISTROS
export const getHistorialRegistros = async (limite = 100) => {
  try {
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('estado', 'finalizado')
      .order('salida', { ascending: false })
      .limit(limite);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error en getHistorialRegistros:", error);
    throw new Error("No se pudo cargar el historial");
  }
};

// ============================================
// SERVICIOS DE COBRO Y SALIDA
// ============================================

// 8. CALCULAR COBRO (Basado en Horas o Fracción)
export const calcularCobro = async (idRegistro) => {
  try {
    // Traer el registro de entrada
    const { data: registro, error: errorReg } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('id', idRegistro)
      .single();

    if (errorReg || !registro) {
      throw new Error("No se encontró el registro del vehículo");
    }

    if (registro.estado !== 'activo') {
      throw new Error("Este vehículo ya ha salido del parqueadero");
    }

    // Traer la tarifa configurada
    const { data: tarifa, error: errorTar } = await supabase
      .from('configuracion')
      .select('valor_fraccion')
      .eq('tipo_vehiculo', registro.tipo_vehiculo)
      .single();

    if (errorTar) {
      console.error("Error al obtener tarifa:", errorTar);
      throw new Error("No se encontró la tarifa configurada para este tipo de vehículo");
    }

    const entrada = new Date(registro.entrada);
    const ahora = new Date();
    
    const diffMs = ahora - entrada;
    const minutos = Math.max(1, Math.ceil(diffMs / (1000 * 60)));
    
    // Lógica de hora o fracción: cada 60 min se cobra una unidad
    const unidades = Math.ceil(minutos / 60);
    const valorFraccion = tarifa?.valor_fraccion || 0;
    const total = unidades * valorFraccion;

    return { 
      total, 
      minutos, 
      unidades,
      valorFraccion,
      entrada: registro.entrada,
      placa: registro.placa,
      tipo: registro.tipo_vehiculo
    };
  } catch (error) {
    console.error("Error en calcularCobro:", error);
    throw error;
  }
};

// 9. REGISTRAR SALIDA
export const registrarSalida = async (idRegistro, totalPagar) => {
  try {
    const ahora = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .update({ 
        salida: ahora,
        total_pagar: totalPagar,
        estado: 'finalizado'
      })
      .eq('id', idRegistro)
      .eq('estado', 'activo')
      .select();

    if (error) {
      console.error("Error al registrar salida:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No se encontró el registro activo para finalizar");
    }
    
    return data[0];
  } catch (error) {
    console.error("Error en registrarSalida:", error);
    throw new Error("No se pudo registrar la salida del vehículo");
  }
};

// 10. COBRO RÁPIDO (Combina cálculo y salida)
export const procesarCobroYSalida = async (idRegistro) => {
  try {
    const calculo = await calcularCobro(idRegistro);
    const salida = await registrarSalida(idRegistro, calculo.total);
    return { ...calculo, salida };
  } catch (error) {
    console.error("Error en procesarCobroYSalida:", error);
    throw error;
  }
};

// ============================================
// SERVICIOS DE ESTADÍSTICAS
// ============================================

// 11. OBTENER ESTADÍSTICAS DEL DÍA
export const getEstadisticasDia = async () => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .gte('entrada', hoy.toISOString());
    
    if (error) throw error;
    
    const ingresos = data.reduce((sum, reg) => sum + (reg.total_pagar || 0), 0);
    const activos = data.filter(reg => reg.estado === 'activo').length;
    const finalizados = data.filter(reg => reg.estado === 'finalizado').length;
    
    return {
      total: data.length,
      activos,
      finalizados,
      ingresos,
      carros: data.filter(reg => reg.tipo_vehiculo === 'carro').length,
      motos: data.filter(reg => reg.tipo_vehiculo === 'moto').length
    };
  } catch (error) {
    console.error("Error en getEstadisticasDia:", error);
    return {
      total: 0,
      activos: 0,
      finalizados: 0,
      ingresos: 0,
      carros: 0,
      motos: 0
    };
  }
};

// 12. VALIDAR SI VEHÍCULO ESTÁ ACTIVO
export const validarVehiculoActivo = async (placa) => {
  try {
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('id, entrada, tipo_vehiculo')
      .eq('placa', placa.toUpperCase())
      .eq('estado', 'activo')
      .maybeSingle();
    
    if (error) throw error;
    
    return {
      activo: !!data,
      registro: data || null
    };
  } catch (error) {
    console.error("Error en validarVehiculoActivo:", error);
    return { activo: false, registro: null };
  }
};

// ============================================
// SERVICIOS DE REPORTES
// ============================================

// 13. GENERAR REPORTE POR RANGO DE FECHAS
export const getReportePorFechas = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .gte('entrada', fechaInicio)
      .lte('entrada', fechaFin)
      .order('entrada', { ascending: false });
    
    if (error) throw error;
    
    const totalIngresos = data.reduce((sum, reg) => sum + (reg.total_pagar || 0), 0);
    const totalVehiculos = data.length;
    const carros = data.filter(reg => reg.tipo_vehiculo === 'carro').length;
    const motos = data.filter(reg => reg.tipo_vehiculo === 'moto').length;
    
    return {
      data,
      resumen: {
        totalVehiculos,
        totalIngresos,
        carros,
        motos,
        promedioIngreso: totalVehiculos > 0 ? totalIngresos / totalVehiculos : 0
      }
    };
  } catch (error) {
    console.error("Error en getReportePorFechas:", error);
    throw new Error("No se pudo generar el reporte");
  }
};

export default {
  getTarifas,
  getTarifaByTipo,
  updateTarifa,
  getConfiguracion,
  registrarEntrada,
  getRegistrosActivos,
  getHistorialRegistros,
  calcularCobro,
  registrarSalida,
  procesarCobroYSalida,
  getEstadisticasDia,
  validarVehiculoActivo,
  getReportePorFechas
};