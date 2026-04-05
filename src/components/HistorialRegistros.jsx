import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  History, 
  Search, 
  Download, 
  Calendar, 
  Car, 
  Bike, 
  DollarSign, 
  Clock, 
  X,
  Eye,
  TrendingUp
} from 'lucide-react';
import Swal from 'sweetalert2';

const HistorialRegistros = ({ onClose }) => {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    ingresos: 0,
    activos: 0,
    finalizados: 0
  });

  const cargarRegistros = async () => {
    setCargando(true);
    try {
      let query = supabase
        .from('registros_parqueadero')
        .select('*')
        .order('entrada', { ascending: false });

      if (fechaInicio && fechaFin) {
        query = query.gte('entrada', fechaInicio).lte('entrada', fechaFin);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRegistros(data || []);
      
      const ingresos = data.reduce((sum, reg) => sum + (reg.total_pagar || 0), 0);
      const activos = data.filter(reg => reg.estado === 'activo').length;
      const finalizados = data.filter(reg => reg.estado === 'finalizado').length;
      
      setEstadisticas({
        total: data.length,
        ingresos,
        activos,
        finalizados
      });
    } catch (error) {
      console.error('Error cargando registros:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los registros',
        icon: 'error',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRegistros();
  }, [fechaInicio, fechaFin]);

  const registrosFiltrados = registros.filter(reg => {
    const matchPlaca = reg.placa.toLowerCase().includes(filtro.toLowerCase());
    const matchTipo = tipoFiltro === 'todos' || reg.tipo_vehiculo === tipoFiltro;
    const matchEstado = estadoFiltro === 'todos' || reg.estado === estadoFiltro;
    return matchPlaca && matchTipo && matchEstado;
  });

  const exportarCSV = () => {
    const headers = ['ID', 'Placa', 'Cliente', 'Tipo', 'Entrada', 'Salida', 'Total Pagar', 'Estado'];
    const data = registrosFiltrados.map(reg => [
      reg.id,
      reg.placa,
      reg.cliente_nombre || '---',
      reg.tipo_vehiculo === 'carro' ? 'Automóvil' : 'Motocicleta',
      new Date(reg.entrada).toLocaleString(),
      reg.salida ? new Date(reg.salida).toLocaleString() : 'Activo',
      reg.total_pagar ? `$${reg.total_pagar.toLocaleString()}` : '---',
      reg.estado === 'activo' ? 'Activo' : 'Finalizado'
    ]);

    const csvContent = [headers, ...data].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registros_parqueadero_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Swal.fire({
      title: 'Exportado',
      text: 'El archivo CSV se ha descargado correctamente',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const verDetalle = async (registro) => {
    await Swal.fire({
      title: 'Detalle del Registro',
      html: `
        <div class="text-left">
          <div class="bg-gray-50 p-4 rounded-lg mb-3">
            <p class="text-sm text-gray-600">Placa:</p>
            <p class="text-2xl font-bold text-blue-600">${registro.placa}</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-blue-50 p-3 rounded-lg">
              <p class="text-xs text-gray-600">Cliente</p>
              <p class="font-semibold">${registro.cliente_nombre || 'No registrado'}</p>
            </div>
            <div class="bg-green-50 p-3 rounded-lg">
              <p class="text-xs text-gray-600">Tipo</p>
              <p class="font-semibold">${registro.tipo_vehiculo === 'carro' ? '🚗 Automóvil' : '🏍️ Motocicleta'}</p>
            </div>
            <div class="bg-purple-50 p-3 rounded-lg">
              <p class="text-xs text-gray-600">Entrada</p>
              <p class="font-semibold text-sm">${new Date(registro.entrada).toLocaleString()}</p>
            </div>
            <div class="bg-orange-50 p-3 rounded-lg">
              <p class="text-xs text-gray-600">Salida</p>
              <p class="font-semibold text-sm">${registro.salida ? new Date(registro.salida).toLocaleString() : 'En parqueadero'}</p>
            </div>
            <div class="bg-yellow-50 p-3 rounded-lg col-span-2">
              <p class="text-xs text-gray-600">Total Pagado</p>
              <p class="text-2xl font-bold text-green-600">${registro.total_pagar ? `$${registro.total_pagar.toLocaleString()}` : 'Pendiente'}</p>
            </div>
          </div>
          <div class="mt-3 p-3 bg-gray-100 rounded-lg">
            <p class="text-xs text-gray-600">Estado</p>
            <span class="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-xs font-semibold ${registro.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
              ${registro.estado === 'activo' ? '🟢 Activo' : '🔴 Finalizado'}
            </span>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonColor: '#3B82F6',
      confirmButtonText: 'Cerrar'
    });
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
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <History className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Historial de Registros</h2>
                <p className="text-gray-300 text-sm">Gestión completa de ingresos y salidas</p>
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

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-800/50 border-b border-gray-700">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Registros</p>
                <p className="text-2xl font-bold text-white">{estadisticas.total}</p>
              </div>
              <History className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-400">${estadisticas.ingresos.toLocaleString()}</p>
              </div>
              <DollarSign className="text-green-400" size={24} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Activos</p>
                <p className="text-2xl font-bold text-blue-400">{estadisticas.activos}</p>
              </div>
              <Car className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Finalizados</p>
                <p className="text-2xl font-bold text-gray-400">{estadisticas.finalizados}</p>
              </div>
              <TrendingUp className="text-gray-400" size={24} />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-6 border-b border-gray-700 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] input-icon-container">
              <div className="input-icon">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar por placa..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="input-with-icon bg-gray-800 text-white border-gray-600"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los tipos</option>
                <option value="carro">🚗 Automóviles</option>
                <option value="moto">🏍️ Motocicletas</option>
              </select>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">🟢 Activos</option>
                <option value="finalizado">🔴 Finalizados</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">a</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
              }}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Limpiar filtros
            </button>
            <button
              onClick={exportarCSV}
              className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
            >
              <Download size={18} />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Tabla de registros - CON AJUSTE DE COLUMNAS */}
        <div className="overflow-x-auto p-6">
          {cargando ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto text-gray-500 mb-3" size={48} />
              <p className="text-gray-400">No hay registros que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-800 border-b border-gray-700">
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 w-[100px]">Placa</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400">Cliente</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 w-[80px]">Tipo</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 w-[160px]">Entrada</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 w-[160px]">Salida</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 w-[100px]">Total</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-400 w-[100px]">Estado</th>
                    <th className="p-3 text-center text-xs font-semibold text-gray-400 w-[60px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map((reg) => (
                    <tr key={reg.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{reg.placa}</td>
                      <td className="p-3 text-gray-300">{reg.cliente_nombre || '---'}</td>
                      <td className="p-3">
                        {reg.tipo_vehiculo === 'carro' ? (
                          <span className="flex items-center gap-1 text-blue-400"><Car size={16} /> Auto</span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-400"><Bike size={16} /> Moto</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-400">{new Date(reg.entrada).toLocaleString()}</td>
                      <td className="p-3 text-sm text-gray-400">
                        {reg.salida ? new Date(reg.salida).toLocaleString() : '---'}
                      </td>
                      <td className="p-3 font-bold text-green-400">
                        {reg.total_pagar ? `$${reg.total_pagar.toLocaleString()}` : '---'}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          reg.estado === 'activo' 
                            ? 'bg-green-900/50 text-green-300' 
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {reg.estado === 'activo' ? '🟢 Activo' : '🔴 Finalizado'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => verDetalle(reg)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>Mostrando {registrosFiltrados.length} de {registros.length} registros</span>
            <span>Última actualización: {new Date().toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HistorialRegistros;