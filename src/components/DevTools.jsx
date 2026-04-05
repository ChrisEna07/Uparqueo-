import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  Trash2, 
  Car, 
  Bike, 
  Store, 
  Database, 
  AlertTriangle, 
  X, 
  CheckCircle,
  Loader,
  RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';

const DevTools = ({ onClose }) => {
  const [cargando, setCargando] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    vehiculos: 0,
    vehiculosActivos: 0,
    negocios: 0,
    negociosActivos: 0,
    ingresosTotales: 0
  });

  // Cargar estadísticas actuales
  const cargarEstadisticas = async () => {
    try {
      // Contar vehículos
      const { count: totalVehiculos } = await supabase
        .from('registros_parqueadero')
        .select('*', { count: 'exact', head: true });
      
      const { count: vehiculosActivos } = await supabase
        .from('registros_parqueadero')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activo');
      
      // Contar negocios
      const { count: totalNegocios } = await supabase
        .from('negocios_informales')
        .select('*', { count: 'exact', head: true });
      
      const { count: negociosActivos } = await supabase
        .from('negocios_informales')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);
      
      // Calcular ingresos totales
      const { data: ingresosData } = await supabase
        .from('registros_parqueadero')
        .select('total_pagar')
        .not('total_pagar', 'is', null);
      
      const ingresosTotales = ingresosData?.reduce((sum, reg) => sum + (reg.total_pagar || 0), 0) || 0;
      
      setEstadisticas({
        vehiculos: totalVehiculos || 0,
        vehiculosActivos: vehiculosActivos || 0,
        negocios: totalNegocios || 0,
        negociosActivos: negociosActivos || 0,
        ingresosTotales
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  React.useEffect(() => {
    cargarEstadisticas();
  }, []);

  const limpiarVehiculos = async () => {
    const result = await Swal.fire({
      title: '¿Limpiar registros de vehículos?',
      html: `
        <div class="text-left">
          <div class="bg-red-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-red-600 font-semibold">⚠️ ADVERTENCIA</p>
            <p class="text-sm text-gray-600 mt-1">Esta acción eliminará permanentemente:</p>
            <ul class="text-sm text-gray-600 mt-2 list-disc list-inside">
              <li>Todos los registros de vehículos (${estadisticas.vehiculos} registros)</li>
              <li>Historial de entradas y salidas</li>
              <li>Registros de cobros</li>
            </ul>
          </div>
          <p class="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '✅ Sí, eliminar todos',
      cancelButtonText: '❌ Cancelar'
    });

    if (result.isConfirmed) {
      setCargando(true);
      try {
        const { error } = await supabase
          .from('registros_parqueadero')
          .delete()
          .neq('id', 0);
        
        if (error) throw error;
        
        await Swal.fire({
          title: '¡Registros eliminados!',
          text: `Se han eliminado ${estadisticas.vehiculos} registros de vehículos`,
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
        
        cargarEstadisticas();
      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudieron eliminar los registros',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      } finally {
        setCargando(false);
      }
    }
  };

  const limpiarNegocios = async () => {
    const result = await Swal.fire({
      title: '¿Limpiar negocios informales?',
      html: `
        <div class="text-left">
          <div class="bg-red-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-red-600 font-semibold">⚠️ ADVERTENCIA</p>
            <p class="text-sm text-gray-600 mt-1">Esta acción eliminará permanentemente:</p>
            <ul class="text-sm text-gray-600 mt-2 list-disc list-inside">
              <li>Todos los negocios informales (${estadisticas.negocios} negocios)</li>
              <li>Historial de abonos y deudas</li>
            </ul>
          </div>
          <p class="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '✅ Sí, eliminar todos',
      cancelButtonText: '❌ Cancelar'
    });

    if (result.isConfirmed) {
      setCargando(true);
      try {
        const { error } = await supabase
          .from('negocios_informales')
          .delete()
          .neq('id', 0);
        
        if (error) throw error;
        
        await Swal.fire({
          title: '¡Negocios eliminados!',
          text: `Se han eliminado ${estadisticas.negocios} negocios informales`,
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
        
        cargarEstadisticas();
      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudieron eliminar los negocios',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      } finally {
        setCargando(false);
      }
    }
  };

  const limpiarTodo = async () => {
    const result = await Swal.fire({
      title: '⚠️ LIMPIEZA COMPLETA ⚠️',
      html: `
        <div class="text-left">
          <div class="bg-red-100 p-4 rounded-lg mb-4 border-2 border-red-500">
            <p class="text-sm text-red-700 font-bold">¡ATENCIÓN! ESTA ACCIÓN ES DEFINITIVA</p>
            <p class="text-sm text-gray-700 mt-2">Se eliminarán TODOS los datos:</p>
            <ul class="text-sm text-gray-700 mt-2 space-y-1">
              <li>🚗 ${estadisticas.vehiculos} registros de vehículos</li>
              <li>🏪 ${estadisticas.negocios} negocios informales</li>
              <li>💰 $${estadisticas.ingresosTotales.toLocaleString()} en ingresos registrados</li>
            </ul>
          </div>
          <p class="text-sm font-bold text-red-600 mt-2">⚠️ Esta acción no se puede deshacer ⚠️</p>
        </div>
      `,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '🗑️ ELIMINAR TODO',
      cancelButtonText: '❌ Cancelar'
    });

    if (result.isConfirmed) {
      setCargando(true);
      try {
        // Eliminar vehículos
        await supabase.from('registros_parqueadero').delete().neq('id', 0);
        // Eliminar negocios
        await supabase.from('negocios_informales').delete().neq('id', 0);
        
        await Swal.fire({
          title: '¡Limpieza completa!',
          html: `
            <div class="text-center">
              <div class="text-6xl mb-4">🧹</div>
              <p class="text-lg mb-2">Todos los datos han sido eliminados</p>
              <p class="text-sm text-gray-500">La base de datos está completamente limpia</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar'
        });
        
        cargarEstadisticas();
        // Recargar la página después de 1 segundo
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        await Swal.fire({
          title: 'Error',
          text: 'No se pudieron eliminar los datos',
          icon: 'error',
          confirmButtonColor: '#EF4444'
        });
      } finally {
        setCargando(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 to-red-800 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Shield className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Herramientas de Desarrollador</h2>
                <p className="text-red-200 text-sm">Modo de mantenimiento - Limpieza de datos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Estadísticas actuales */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Database size={18} />
            Estado actual de la base de datos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Car size={14} />
                Vehículos registrados
              </div>
              <div className="text-2xl font-bold text-white">{estadisticas.vehiculos}</div>
              <div className="text-xs text-gray-500">Activos: {estadisticas.vehiculosActivos}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Store size={14} />
                Negocios informales
              </div>
              <div className="text-2xl font-bold text-white">{estadisticas.negocios}</div>
              <div className="text-xs text-gray-500">Activos: {estadisticas.negociosActivos}</div>
            </div>
          </div>
          <div className="mt-3 bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              💰 Ingresos totales registrados
            </div>
            <div className="text-2xl font-bold text-green-400">
              ${estadisticas.ingresosTotales.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-6 space-y-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Trash2 size={18} />
            Acciones de limpieza
          </h3>

          <button
            onClick={limpiarVehiculos}
            disabled={cargando || estadisticas.vehiculos === 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-lg flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <Car size={20} />
              <span className="font-semibold">Limpiar registros de vehículos</span>
            </div>
            <span className="text-sm bg-red-700 px-2 py-1 rounded">
              {estadisticas.vehiculos} registros
            </span>
          </button>

          <button
            onClick={limpiarNegocios}
            disabled={cargando || estadisticas.negocios === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-lg flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <Store size={20} />
              <span className="font-semibold">Limpiar negocios informales</span>
            </div>
            <span className="text-sm bg-orange-700 px-2 py-1 rounded">
              {estadisticas.negocios} negocios
            </span>
          </button>

          <div className="border-t border-gray-700 pt-4 mt-2">
            <button
              onClick={limpiarTodo}
              disabled={cargando || (estadisticas.vehiculos === 0 && estadisticas.negocios === 0)}
              className="w-full bg-red-800 hover:bg-red-900 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-4 rounded-lg flex items-center justify-between transition-all border-2 border-red-600"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-bold">LIMPIEZA COMPLETA (TODO)</span>
              </div>
              {cargando ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <Trash2 size={20} />
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              ⚠️ Esta acción eliminará TODOS los datos de la base de datos
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Modo desarrollador - Acciones irreversibles</span>
            <button
              onClick={cargarEstadisticas}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DevTools;