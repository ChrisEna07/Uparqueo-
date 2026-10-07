import { supabase } from '../lib/supabase';

/**
 * Obtiene la lista completa de Tenants / Negocios registrados.
 * Combina las opciones globales del sistema con los negocios individuales registrados.
 */
export const getTenantsList = async () => {
  try {
    const list = [
      { id: 'default', nombre: 'Tenant Global / Todos los Negocios', tipo: 'global' },
      { id: 'parqueadero', nombre: 'Gestor de Parqueadero (Principal)', tipo: 'modulo' },
      { id: 'informales', nombre: 'Gestor de Negocios Informales (Todos)', tipo: 'modulo' }
    ];

    // Consultar clientes/puestos registrados en negocios_informales
    const { data: negocios, error } = await supabase
      .from('negocios_informales')
      .select('id, nombre_negocio, nombre_cliente')
      .order('nombre_negocio', { ascending: true });

    if (!error && Array.isArray(negocios)) {
      negocios.forEach(n => {
        list.push({
          id: n.id,
          nombre: `${n.nombre_negocio} (${n.nombre_cliente || 'Sin titular'})`,
          tipo: 'negocio_informal'
        });
      });
    }

    return { success: true, data: list };
  } catch (err) {
    console.error("Error al obtener lista de tenants:", err);
    return { 
      success: false, 
      data: [
        { id: 'default', nombre: 'Tenant Global / Todos', tipo: 'global' },
        { id: 'parqueadero', nombre: 'Gestor de Parqueadero', tipo: 'modulo' },
        { id: 'informales', nombre: 'Gestor de Informales', tipo: 'modulo' }
      ] 
    };
  }
};
