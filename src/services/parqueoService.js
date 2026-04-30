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

// 3.5. ACTUALIZAR CLAVE DEV
export const updateDevKey = async (nuevaClave) => {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .upsert({ 
        tipo_vehiculo: 'dev_key',
        valor_texto: nuevaClave, 
        updated_at: new Date().toISOString()
      }, { onConflict: 'tipo_vehiculo' })
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error en updateDevKey:", error);
    // Si falla por falta de columna, intentamos usar valor_fraccion (aunque sea texto, algunos DBs lo permiten si es cast)
    // Pero lo mejor es informar al usuario.
    throw new Error("No se pudo actualizar la clave. Asegúrese de que la tabla 'configuracion' tenga la columna 'valor_texto'.");
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

// 5. REGISTRAR ENTRADA (Con validación de Lista Negra)
export const registrarEntrada = async (placa, tipo, cliente, adminUsername = 'sistema') => {
  try {
    if (!placa || placa.trim() === '') {
      throw new Error("La placa es obligatoria");
    }

    const placaFinal = placa.toUpperCase();

    // A. Verificar si está en la Lista Negra
    try {
      const { data: blacklisted, error: blackError } = await supabase
        .from('lista_negra')
        .select('*')
        .eq('placa_relacionada', placaFinal)
        .maybeSingle();

      if (blackError) {
        // Si la tabla no existe, ignoramos el error y permitimos continuar
        if (blackError.message.includes('not found')) {
          console.warn("Tabla 'lista_negra' no existe. Saltando validación.");
        } else {
          console.error("Error checking blacklist:", blackError);
        }
      } else if (blacklisted) {
        throw new Error(`ACCESO DENEGADO: El vehículo ${placaFinal} está en la lista negra. Motivo: ${blacklisted.motivo || 'No pago'}`);
      }
    } catch (e) {
      if (e.message.includes('ACCESO DENEGADO')) throw e;
      console.warn("Error en validación de lista negra (posible tabla faltante):", e.message);
    }

    // B. Verificar si el vehículo ya está activo
    const { data: vehiculoActivo, error: checkError } = await supabase
      .from('registros_parqueadero')
      .select('id, placa')
      .eq('placa', placaFinal)
      .eq('estado', 'activo')
      .maybeSingle();

    if (checkError) throw checkError;

    if (vehiculoActivo) {
      throw new Error(`El vehículo con placa ${placaFinal} ya está en el parqueadero`);
    }

    const { data, error } = await supabase
      .from('registros_parqueadero')
      .insert([{ 
        placa: placaFinal, 
        cliente_nombre: cliente || null, 
        tipo_vehiculo: tipo,
        estado: 'activo',
        registrado_por: adminUsername,
        entrada: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
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
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error en getRegistrosActivos:", error);
    throw new Error("No se pudieron cargar los vehículos activos");
  }
};

// 6.5. ELIMINAR VEHÍCULO (Borrado lógico o físico)
export const eliminarVehiculo = async (id) => {
  try {
    const { error } = await supabase
      .from('registros_parqueadero')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error en eliminarVehiculo:", error);
    throw new Error("No se pudo eliminar el registro");
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
export const registrarSalida = async (idRegistro, totalPagar, adminUsername = 'sistema') => {
  try {
    const ahora = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .update({ 
        salida: ahora,
        total_pagar: totalPagar,
        estado: 'finalizado',
        usuario_recibe: adminUsername
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
// SERVICIOS DE CLIENTES Y LISTA NEGRA
// ============================================

// 14. OBTENER HISTORIAL DE UN CLIENTE ESPECÍFICO
export const getHistorialCliente = async (placa) => {
  try {
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('placa', placa.toUpperCase())
      .order('entrada', { ascending: false });
    
    if (error) throw error;
    
    const totalPagado = data.reduce((sum, reg) => sum + (reg.total_pagar || 0), 0);
    const visitas = data.length;
    
    return { success: true, data, resumen: { totalPagado, visitas } };
  } catch (error) {
    console.error("Error en getHistorialCliente:", error);
    return { success: false, data: [], resumen: { totalPagado: 0, visitas: 0 } };
  }
};

// 15. AGREGAR A LISTA NEGRA
export const addToBlacklist = async (placa, motivo, adminId) => {
  try {
    const { error } = await supabase
      .from('lista_negra')
      .insert([{
        placa_relacionada: placa.toUpperCase(),
        nombre_completo: 'CLIENTE PARQUEADERO',
        identificacion: 'S/N',
        motivo,
        registrado_por: adminId,
        modulo: 'parqueadero',
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error en addToBlacklist:", error);
    throw new Error("No se pudo agregar a la lista negra");
  }
};

// 16. ELIMINAR DE LISTA NEGRA
export const removeFromBlacklist = async (placa) => {
  try {
    const { error } = await supabase
      .from('lista_negra')
      .delete()
      .eq('placa_relacionada', placa.toUpperCase());
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error en removeFromBlacklist:", error);
    throw new Error("No se pudo eliminar de la lista negra");
  }
};

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
  updateDevKey,
  getConfiguracion,
  registrarEntrada,
  getRegistrosActivos,
  eliminarVehiculo,
  getHistorialRegistros,
  calcularCobro,
  registrarSalida,
  procesarCobroYSalida,
  getEstadisticasDia,
  validarVehiculoActivo,
  getReportePorFechas,
  getHistorialCliente,
  addToBlacklist,
  removeFromBlacklist
};