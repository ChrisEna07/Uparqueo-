import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Clock, Search, ExternalLink, 
  DollarSign, AlertCircle, RefreshCw,
  Filter, Calendar, Hash, FileText, Info,
  ShieldAlert, UserX
} from 'lucide-react';
import { 
  getRegistrosActivos, 
  calcularCobro, 
  registrarSalida, 
  getHistorialCliente,
  addToBlacklist,
  getTarifas
} from '../services/parqueoService';
import { generarPDFHistorialCliente } from '../services/pdfService';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const ListaActivos = ({ onVehiculoSalida, refreshKey, admin }) => {
  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [tarifas, setTarifas] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clienteSel, setClienteSel] = useState(null);

  useEffect(() => {
    cargarDatos();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    // Sincronización en tiempo real silenciosa
    const channel = supabase.channel('sync_parqueo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_parqueadero' }, payload => {
        cargarDatos();
      })
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [refreshKey]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [vRes, tRes] = await Promise.all([getRegistrosActivos(), getTarifas()]);
      
      if (vRes.success) setVehiculos(vRes.data);
      
      const tMap = {};
      tRes.forEach(t => tMap[t.tipo_vehiculo] = t.valor_fraccion);
      setTarifas(tMap);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const calcularTiempoReal = (entradaStr, tipo) => {
    const entrada = new Date(entradaStr);
    const diffMs = currentTime - entrada;
    const minutos = Math.max(1, Math.ceil(diffMs / (1000 * 60)));
    const unidades = Math.ceil(minutos / 60);
    const valorFraccion = tarifas[tipo] || 0;
    const total = unidades * valorFraccion;

    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    return { 
      tiempo: `${h}h ${m}m`, 
      total,
      unidades
    };
  };

  const verDetallesCliente = async (placa) => {
    setProcesando(true);
    const res = await getHistorialCliente(placa);
    if (res.success) {
      setClienteSel({
        placa,
        historial: res.data,
        resumen: res.resumen
      });
    }
    setProcesando(false);
  };

  const handleNoPago = async (id, placa) => {
    const { value: motivo } = await Swal.fire({
      title: 'REGISTRAR NO PAGO',
      text: `El vehículo ${placa} será enviado a la LISTA NEGRA y no podrá ingresar nuevamente.`,
      input: 'textarea',
      inputPlaceholder: 'Escribe el motivo del no pago o incidente...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'SÍ, LISTA NEGRA',
      cancelButtonText: 'Cancelar'
    });

    if (motivo) {
      setProcesando(true);
      try {
        await addToBlacklist(placa, motivo, admin?.username || 'admin'); // En producción usar ID real del admin
        await registrarSalida(id, 0, admin?.username || 'admin'); // Cerramos el registro con $0
        await Swal.fire('Bloqueado', 'Cliente agregado a lista negra con éxito.', 'success');
        cargarDatos();
        if (onVehiculoSalida) onVehiculoSalida();
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      } finally {
        setProcesando(false);
      }
    }
  };

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
              <div class="flex justify-between">
                <span>Tiempo:</span>
                <span>${minutos} min</span>
              </div>
              <div class="flex justify-between">
                <span>Fracciones:</span>
                <span>${unidades} × $${valorFraccion.toLocaleString()}</span>
              </div>
              <div class="border-t pt-2 mt-2 flex justify-between">
                <span class="font-bold">Total:</span>
                <span class="text-green-600 font-bold">$${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '✅ Cobrar',
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280'
      });

      if (result.isConfirmed) {
        setProcesando(true);
        await registrarSalida(id, total, admin?.username || 'admin');
        await Swal.fire('¡Cobro Exitoso!', `Total: $${total.toLocaleString()}`, 'success');
        cargarDatos();
        if (onVehiculoSalida) onVehiculoSalida();
      }
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setProcesando(false);
    }
  };



  const vehiculosFiltrados = vehiculos.filter(v => {
    const coincideBusqueda = v.placa.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo === 'todos' || v.tipo_vehiculo === filtroTipo;
    return coincideBusqueda && coincideTipo;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex-1 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 md:py-4 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
          <Search className="text-gray-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por placa..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent border-none outline-none font-bold text-gray-700 placeholder-gray-400"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['todos', 'carro', 'moto'].map(tipo => (
            <button 
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs transition-all uppercase whitespace-nowrap ${filtroTipo === tipo ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
            >
              {tipo === 'todos' ? 'TODOS' : tipo === 'carro' ? 'CARROS' : 'MOTOS'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {cargando ? (
            <div className="col-span-full py-20 text-center text-gray-300 font-black animate-pulse uppercase tracking-[0.4em]">Sincronizando...</div>
          ) : vehiculosFiltrados.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
              <Car size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sin vehículos en el radar</p>
            </div>
          ) : (
            vehiculosFiltrados.map((v) => {
              const infoReal = calcularTiempoReal(v.entrada, v.tipo_vehiculo);
              return (
                <motion.div 
                  layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  key={v.id}
                  className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl hover:shadow-blue-900/5 transition-all border border-gray-50 group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 ${v.tipo_vehiculo === 'carro' ? 'bg-blue-600' : 'bg-orange-600'}`}></div>

                  <div className="flex justify-between items-start mb-8 relative">
                    <div className={`p-5 rounded-3xl ${v.tipo_vehiculo === 'carro' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {v.tipo_vehiculo === 'carro' ? <Car size={32} /> : <Car size={32} className="rotate-12" />}
                    </div>
                    <button 
                      onClick={() => verDetallesCliente(v.placa)}
                      className="p-3 bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white rounded-2xl transition-all"
                    >
                      <Info size={20} />
                    </button>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-5xl font-black text-gray-900 tracking-tighter mb-2 uppercase">{v.placa}</h3>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {v.tipo_vehiculo === 'carro' ? 'Automóvil' : 'Motocicleta'}
                      </span>
                      {v.cliente_nombre && (
                        <span className="text-xs text-blue-500 font-bold">👤 {v.cliente_nombre}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-5 rounded-[2rem]">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Transcurrido</p>
                      <p className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" /> {infoReal.tiempo}
                      </p>
                    </div>
                    <div className="bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100/50">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Costo Actual</p>
                      <p className="text-xl font-black text-blue-600">
                        ${infoReal.total.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      disabled={procesando} onClick={() => handleCobrar(v.id, v.placa, v.tipo_vehiculo)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <DollarSign size={20} /> REGISTRAR PAGO
                    </button>
                    <button 
                      disabled={procesando} onClick={() => handleNoPago(v.id, v.placa)}
                      className="w-full bg-red-50 text-red-500 hover:bg-red-600 hover:text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      <UserX size={20} /> REGISTRAR NO PAGO (LISTA NEGRA)
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DETALLES CLIENTE */}
      <AnimatePresence>
        {clienteSel && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="bg-gray-900 p-10 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-4xl font-black tracking-tighter uppercase">{clienteSel.placa}</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Expediente del Cliente</p>
                </div>
                <button onClick={() => setClienteSel(null)} className="p-3 bg-white/10 rounded-2xl hover:bg-red-500/20 transition-all text-white"><XIcon size={24}/></button>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Aportado</p>
                    <p className="text-3xl font-black">${clienteSel.resumen.totalPagado.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-100 p-8 rounded-[2.5rem] text-gray-900">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Visitas Totales</p>
                    <p className="text-3xl font-black">{clienteSel.resumen.visitas} <span className="text-sm opacity-40">Veces</span></p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Últimos Registros</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {clienteSel.historial.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="text-sm font-black text-gray-800">{new Date(h.entrada).toLocaleDateString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{h.tipo_vehiculo.toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-600">${h.total_pagar?.toLocaleString() || '0'}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${h.estado === 'activo' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                            {h.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => generarPDFHistorialCliente(clienteSel)}
                    className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
                  >
                    <FileText size={18} /> DESCARGAR HISTORIAL
                  </button>
                  <button onClick={() => setClienteSel(null)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                    CERRAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const XIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default ListaActivos;