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
        .select('*')
        .order('nombre', { ascending: true });

      if (!orgError && Array.isArray(orgs) && orgs.length > 0) {
        orgs.forEach(o => {
          list.push({
            id: o.id,
            slug: o.slug,
            nombre: `🏢 Org: ${o.nombre} (${o.estado})`,
            tipo: 'organizacion',
            modulos_activos: o.modulos_activos,
            estado: o.estado
          });
        });
      }
    } catch (e) {
      // Tabla puede no existir aún en entornos sin migrar
    }

    // Nota: Los puestos de negocios_informales son entidades internas de la organización,
    // NO se listan aquí para evitar mezclar clientes/tenants con puestos individuales.

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
