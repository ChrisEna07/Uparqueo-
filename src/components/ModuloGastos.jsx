import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, Plus, Edit2, Calendar, 
  AlertCircle, X, Lock, Loader2
} from 'lucide-react';
import { getGastos, registrarGasto, actualizarGasto } from '../services/gastosService';
import Swal from 'sweetalert2';

const ModuloGastos = ({ admin }) => {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState(null); // ID del gasto a editar
  const [datosOriginales, setDatosOriginales] = useState(null);
  
  const [nuevoGasto, setNuevoGasto] = useState({
    monto: '',
    descripcion: '',
    categoria: 'Mantenimiento'
  });

  const categorias = [
    'Mantenimiento', 'Servicios', 'Suministros', 
    'Limpieza', 'Impuestos', 'Varios', 'Sueldos'
  ];

  useEffect(() => {
    cargarGastos();
  }, []);

  const [stats, setStats] = useState({ hoy: 0, semana: 0, mes: 0, total: 0 });

  const cargarGastos = async () => {
    setCargando(true);
    const res = await getGastos();
    if (res.success) {
      setGastos(res.data);
      calcularStats(res.data);
    }
    setCargando(false);
  };

  const calcularStats = (data) => {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    let h = 0, s = 0, m = 0, t = 0;
    
    data.forEach(g => {
      const fecha = new Date(g.created_at);
      const monto = Number(g.monto);
      t += monto;
      if (fecha >= hoy) h += monto;
      if (fecha >= inicioSemana) s += monto;
      if (fecha >= inicioMes) m += monto;
    });

    setStats({ hoy: h, semana: s, mes: m, total: t });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nuevoGasto.monto || Number(nuevoGasto.monto) <= 0) {
      return Swal.fire('Monto Inválido', 'Ingresa un monto mayor a 0', 'warning');
    }

    setEnviando(true);
    try {
      let res;
      if (editando) {
        res = await actualizarGasto(editando, nuevoGasto, datosOriginales, admin.username);
      } else {
        res = await registrarGasto(nuevoGasto, admin.username);
      }
      
      if (res.success) {
        await Swal.fire({
          title: editando ? '¡Gasto Actualizado!' : '¡Gasto Registrado!',
          text: editando ? 'Los cambios han sido auditados.' : 'El egreso se ha aplicado.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        
        cerrarModal();
        await cargarGastos();
      } else {
        Swal.fire('Error', res.error || 'No se pudo procesar la solicitud', 'error');
      }
    } catch (err) {
      Swal.fire('Error Crítico', err.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setEditando(null);
    setDatosOriginales(null);
    setNuevoGasto({ monto: '', descripcion: '', categoria: 'Mantenimiento' });
  };

  const prepararEdicion = (g) => {
    setEditando(g.id);
    setDatosOriginales({ ...g });
    setNuevoGasto({
      monto: g.monto,
      descripcion: g.descripcion,
      categoria: g.categoria
    });
    setMostrarModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header & Total Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-rose-600 to-red-700 p-6 rounded-3xl text-white shadow-lg shadow-rose-100 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Gasto de Hoy</p>
          <p className="text-3xl font-black">${stats.hoy.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Esta Semana</p>
          <p className="text-2xl font-black text-gray-800">${stats.semana.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Este Mes</p>
          <p className="text-2xl font-black text-gray-800">${stats.mes.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">Total Histórico</p>
          <p className="text-2xl font-black text-rose-500">${stats.total.toLocaleString()}</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-gray-800 uppercase tracking-widest text-xs flex items-center gap-2">
          <Calendar size={16} className="text-rose-600" /> Historial de Egresos
        </h3>
        <button 
          onClick={() => setMostrarModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg hover:shadow-rose-200"
        >
          <Plus size={18} /> Registrar Gasto
        </button>
      </div>

      {/* Main List */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
        {cargando ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-medium">Cargando registros...</p>
          </div>
        ) : gastos.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 opacity-60">
            <AlertCircle size={48} className="mb-4" />
            <p className="font-black uppercase tracking-widest text-sm text-center">No hay gastos registrados en el sistema</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(
              gastos.reduce((groups, g) => {
                const date = new Date(g.created_at).toLocaleDateString();
                if (!groups[date]) groups[date] = [];
                groups[date].push(g);
                return groups;
              }, {})
            ).map(([fecha, gastosDelDia]) => (
              <div key={fecha} className="bg-white">
                <div className="bg-gray-50/50 px-8 py-3 flex justify-between items-center border-b border-gray-100">
                   <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                     <Calendar size={12} /> {fecha}
                   </h4>
                   <span className="text-[10px] font-black text-rose-600">
                     Total Día: -${gastosDelDia.reduce((sum, g) => sum + Number(g.monto), 0).toLocaleString()}
                   </span>
                </div>
                
                {/* VISTA PARA MÓVILES (CARDS) */}
                <div className="md:hidden p-4 space-y-4">
                  {gastosDelDia.map((g) => (
                    <div key={g.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        {g.cierre_id ? (
                          <div className="p-2 text-gray-300 bg-gray-50 rounded-lg" title="Transacción cerrada y bloqueada">
                            <Lock size={18} />
                          </div>
                        ) : (
                          <button onClick={() => prepararEdicion(g)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                            <Edit2 size={18} />
                          </button>
                        )}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-lg border border-rose-100">
                          {g.categoria}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          {new Date(g.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800 font-bold text-sm mb-2">{g.descripcion}</p>
                      <div className="flex justify-between items-end">
                        <p className="text-xl font-black text-rose-600">-${Number(g.monto).toLocaleString()}</p>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">By @{g.registrado_por}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VISTA PARA DESKTOP (TABLA) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {gastosDelDia.map((g) => (
                        <tr key={g.id} className="hover:bg-rose-50/30 transition-colors group">
                          <td className="px-8 py-5 text-xs font-bold text-gray-500 w-48">
                            {new Date(g.created_at).toLocaleTimeString()}
                          </td>
                          <td className="px-8 py-5 w-40">
                            <span className="px-3 py-1 bg-gray-50 text-gray-600 text-[10px] font-black uppercase rounded-full border border-gray-100">
                              {g.categoria}
                            </span>
                          </td>
                          <td className="px-8 py-5 font-bold text-gray-800 text-sm">{g.descripcion}</td>
                          <td className="px-8 py-5 text-right text-lg font-black text-rose-600">-${Number(g.monto).toLocaleString()}</td>
                          <td className="px-8 py-5 w-32">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                              @{g.registrado_por}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center w-24">
                            {g.cierre_id ? (
                              <div className="flex justify-center text-gray-300" title="Registro cerrado">
                                <Lock size={18} />
                              </div>
                            ) : (
                              <button 
                                onClick={() => prepararEdicion(g)}
                                className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Registro */}
      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setMostrarModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-gray-900 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{editando ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
                    {editando ? 'Modificando registro auditado' : 'Registrar salida de dinero'}
                  </p>
                </div>
                <button onClick={cerrarModal} className="p-2 hover:bg-white/10 rounded-lg text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto del Egreso</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">$</span>
                    <input 
                      type="number" 
                      className="w-full pl-8 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-500 rounded-2xl font-black text-xl outline-none transition-all"
                      placeholder="0.00"
                      value={nuevoGasto.monto}
                      onChange={(e) => setNuevoGasto({...nuevoGasto, monto: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categorias.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNuevoGasto({...nuevoGasto, categoria: c})}
                        className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                          nuevoGasto.categoria === c 
                          ? 'bg-rose-50 border-rose-500 text-rose-600' 
                          : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción / Concepto</label>
                  <textarea 
                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-rose-500 rounded-2xl font-bold text-sm outline-none transition-all"
                    rows="3"
                    placeholder="¿En qué se gastó el dinero?"
                    value={nuevoGasto.descripcion}
                    onChange={(e) => setNuevoGasto({...nuevoGasto, descripcion: e.target.value})}
                  />
                </div>

                <button 
                  disabled={enviando}
                  type="submit"
                  className={`w-full py-5 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50 ${
                    editando ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                  }`}
                >
                  {enviando ? <Loader2 className="animate-spin mx-auto" /> : editando ? 'Guardar Cambios' : 'Confirmar Egreso'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuloGastos;
