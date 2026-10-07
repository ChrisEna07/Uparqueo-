import { supabase } from '../lib/supabase';

/**
 * Obtiene la lista completa de Organizaciones y Tenants / Negocios registrados.
 * Prioriza la entidad 'organizaciones', y si existen, las lista junto a los módulos y clientes.
 */
export const getTenantsList = async () => {
  try {
    const list = [
      { id: 'default', nombre: 'Tenant Global / Todos los Negocios', tipo: 'global' },
      { id: 'parqueadero', nombre: 'Módulo Parqueadero (Todos)', tipo: 'modulo' },
      { id: 'informales', nombre: 'Módulo Informales (Todos)', tipo: 'modulo' }
    ];

    // 1. Consultar Organizaciones registradas en public.organizaciones
    try {
      const { data: orgs, error: orgError } = await supabase
        .from('organizaciones')
        .select('id, nombre, slug, estado')
        .order('nombre', { ascending: true });

      if (!orgError && Array.isArray(orgs) && orgs.length > 0) {
        orgs.forEach(o => {
          list.push({
            id: o.id,
            slug: o.slug,
            nombre: `🏢 Org: ${o.nombre} (${o.estado})`,
            tipo: 'organizacion'
          });
        });
      }
    } catch (e) {
      // Tabla puede no existir aún en entornos sin migrar
    }

    // 2. Consultar puestos/locales registrados en negocios_informales
    try {
      const { data: negocios, error: negError } = await supabase
        .from('negocios_informales')
        .select('id, nombre_negocio, nombre_cliente')
        .order('nombre_negocio', { ascending: true });

      if (!negError && Array.isArray(negocios)) {
        negocios.forEach(n => {
          list.push({
            id: n.id,
            nombre: `📍 Puesto: ${n.nombre_negocio} (${n.nombre_cliente || 'Sin titular'})`,
            tipo: 'negocio_informal'
          });
        });
      }
    } catch (e) {
      // Error silencioso
    }

    return { success: true, data: list };
  } catch (err) {
    console.error("Error al obtener lista de tenants:", err);
    return { 
      success: false, 
      data: [
        { id: 'default', nombre: 'Tenant Global / Todos', tipo: 'global' },
        { id: 'parqueadero', nombre: 'Módulo Parqueadero', tipo: 'modulo' },
        { id: 'informales', nombre: 'Módulo Informales', tipo: 'modulo' }
      ] 
    };
  }
};
