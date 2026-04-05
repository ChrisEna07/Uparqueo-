import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { calcularCobro, registrarSalida } from '../services/parqueoService';
import { Car, Bike, Clock, Receipt, Search, DollarSign, TrendingUp, AlertCircle, X, History } from 'lucide-react';
import Swal from 'sweetalert2';
import HistorialRegistros from './HistorialRegistros';

const ListaActivos = ({ refreshKey, onVehiculoSalida }) => {
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [estadisticas, setEstadisticas] = useState({ total: 0, carros: 0, motos: 0 });

  const cargarVehiculos = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('estado', 'activo')
      .order('entrada', { ascending: false });

    if (!error) {
      setVehiculos(data);
      const carros = data.filter(v => v.tipo_vehiculo === 'carro').length;
      const motos = data.filter(v => v.tipo_vehiculo === 'moto').length;
      setEstadisticas({
        total: data.length,
        carros: carros,
        motos: motos
      });
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarVehiculos();
  }, [refreshKey]);

  const handleCobrar = async (id, placa, tipoVehiculo) => {
    try {
      const { total, minutos, unidades, valorFraccion } = await calcularCobro(id);
      
      const result = await Swal.fire({
        title: 'Confirmar Cobro',
        html: `
          <div class="text-left">
            <div class="bg-blue-50 p-4 rounded-lg mb-4">
              <p class="text-sm text-gray-600 mb-2">Vehículo:</p>
              <p class="text-2xl font-bold text-blue-900">${placa}</p>
              <p class="text-sm text-gray-500">${tipoVehiculo === 'carro' ? '🚗 Automóvil' : '🏍️ Motocicleta'}</p>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Tiempo estacionado:</span>
                <span class="font-semibold">${minutos} minutos</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Fracciones (${unidades}):</span>
                <span class="font-semibold">${unidades} × $${valorFraccion.toLocaleString()}</span>
              </div>
              <div class="border-t pt-2 mt-2">
                <div class="flex justify-between items-center">
                  <span class="text-lg font-bold text-gray-800">Total a pagar:</span>
                  <span class="text-2xl font-bold text-green-600">$${total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '✅ Confirmar Cobro',
        cancelButtonText: '❌ Cancelar',
        backdrop: true,
        allowOutsideClick: false
      });

      if (result.isConfirmed) {
        await registrarSalida(id, total);
        
        await Swal.fire({
          title: '¡Cobro Exitoso!',
          html: `
            <div class="text-center">
              <div class="text-6xl mb-4">💰</div>
              <p class="text-lg mb-2">Se ha registrado la salida del vehículo</p>
              <p class="text-2xl font-bold text-green-600">$${total.toLocaleString()}</p>
              <p class="text-sm text-gray-500 mt-2">Placa: ${placa}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar',
          timer: 3000,
          timerProgressBar: true
        });
        
        cargarVehiculos();
        if (onVehiculoSalida) onVehiculoSalida();
      }
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error.message || 'Error al procesar el cobro',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
    }
  };

  const vehiculosFiltrados = vehiculos.filter(v => {
    const matchPlaca = v.placa.toLowerCase().includes(filtro.toLowerCase());
    const matchTipo = tipoFiltro === 'todos' || v.tipo_vehiculo === tipoFiltro;
    return matchPlaca && matchTipo;
  });

  if (cargando) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl shadow-lg p-12"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Cargando vehículos activos...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-visible w-full"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-t-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <div className="flex-shrink-0">
              <h2 className="text-white font-bold flex items-center gap-2 text-xl">
                <Clock className="animate-pulse" size={24} />
                Vehículos en el Parqueadero
                <span className="bg-blue-500 text-white px-2 py-1 rounded-lg text-sm ml-2">
                  {estadisticas.total}
                </span>
              </h2>
              <p className="text-gray-300 text-sm mt-1">Gestión de vehículos activos</p>
            </div>
            
            <button
              onClick={() => setMostrarHistorial(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all flex-shrink-0"
            >
              <History size={18} />
              Historial
            </button>
            
            <div className="flex flex-wrap gap-3">
              <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-2">
                <div className="flex items-center gap-2">
                  <Car size={16} className="text-blue-400" />
                  <span className="text-white font-bold text-sm md:text-base">{estadisticas.carros}</span>
                  <span className="text-gray-300 text-xs">Carros</span>
                </div>
              </div>
              <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-2">
                <div className="flex items-center gap-2">
                  <Bike size={16} className="text-orange-400" />
                  <span className="text-white font-bold text-sm md:text-base">{estadisticas.motos}</span>
                  <span className="text-gray-300 text-xs">Motos</span>
                </div>
              </div>
              <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-400" />
                  <span className="text-white font-bold text-sm md:text-base">
                    ${(estadisticas.carros * 2000 + estadisticas.motos * 1000).toLocaleString()}
                  </span>
                  <span className="text-gray-300 text-xs">Potencial</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros - Usando clases globales */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 input-icon-container">
              <div className="input-icon">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar por placa..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="input-with-icon"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setTipoFiltro('todos')}
                className={`px-3 py-2 md:px-4 rounded-lg transition-all whitespace-nowrap ${
                  tipoFiltro === 'todos' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTipoFiltro('carro')}
                className={`px-3 py-2 md:px-4 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  tipoFiltro === 'carro' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Car size={16} /> Carros
              </button>
              <button
                onClick={() => setTipoFiltro('moto')}
                className={`px-3 py-2 md:px-4 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  tipoFiltro === 'moto' 
                    ? 'bg-orange-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Bike size={16} /> Motos
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de vehículos */}
        <div className="p-0 w-full">
          <AnimatePresence>
            {vehiculosFiltrados.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 text-center"
              >
                <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 text-lg">No hay vehículos que coincidan con los filtros</p>
                {(filtro || tipoFiltro !== 'todos') && (
                  <button
                    onClick={() => { setFiltro(''); setTipoFiltro('todos'); }}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 justify-center"
                  >
                    <X size={14} /> Limpiar filtros
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 uppercase text-xs font-bold">
                      <th className="p-4 border-b w-[80px] text-center">Tipo</th>
                      <th className="p-4 border-b w-[120px]">Placa</th>
                      <th className="p-4 border-b">Cliente</th>
                      <th className="p-4 border-b w-[180px]">Entrada</th>
                      <th className="p-4 border-b w-[100px]">Tiempo</th>
                      <th className="p-4 border-b w-[140px] text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiculosFiltrados.map((v, index) => {
                      const tiempoTranscurrido = Math.floor((new Date() - new Date(v.entrada)) / 60000);
                      const horas = Math.floor(tiempoTranscurrido / 60);
                      const minutos = tiempoTranscurrido % 60;
                      
                      return (
                        <motion.tr
                          key={v.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ backgroundColor: '#F3F4F6' }}
                          className="transition-all duration-300 group"
                        >
                          <td className="p-4 border-b text-center">
                            {v.tipo_vehiculo === 'carro' 
                              ? <Car className="text-blue-500 group-hover:scale-110 transition-transform inline" size={24} /> 
                              : <Bike className="text-orange-500 group-hover:scale-110 transition-transform inline" size={24} />
                            }
                          </td>
                          <td className="p-4 border-b">
                            <span className="font-bold text-lg text-gray-800">{v.placa}</span>
                          </td>
                          <td className="p-4 border-b text-gray-600">
                            {v.cliente_nombre || 'Cliente ocasional'}
                          </td>
                          <td className="p-4 border-b text-sm text-gray-500">
                            {new Date(v.entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <br />
                            <span className="text-xs">{new Date(v.entrada).toLocaleDateString()}</span>
                          </td>
                          <td className="p-4 border-b">
                            <div className="flex items-center gap-1">
                              <Clock size={14} className="text-gray-400" />
                              <span className="font-mono text-sm">
                                {horas > 0 ? `${horas}h ` : ''}{minutos}min
                              </span>
                            </div>
                          </td>
                          <td className="p-4 border-b text-center">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCobrar(v.id, v.placa, v.tipo_vehiculo)}
                              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg transition-all mx-auto"
                            >
                              <DollarSign size={16} />
                              <span>Cobrar</span>
                              <Receipt size={14} />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {vehiculosFiltrados.length > 0 && (
          <div className="bg-gray-50 p-4 border-t rounded-b-2xl">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Mostrando {vehiculosFiltrados.length} de {vehiculos.length} vehículos</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Activos
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Carros: {estadisticas.carros}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Motos: {estadisticas.motos}
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal de Historial */}
      {mostrarHistorial && (
        <HistorialRegistros onClose={() => setMostrarHistorial(false)} />
      )}
    </>
  );
};

export default ListaActivos;