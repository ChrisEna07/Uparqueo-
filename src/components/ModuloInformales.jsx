import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, Plus, Search, DollarSign, 
  Trash2, AlertCircle, CheckCircle, 
  Calendar, Clock, User, Phone, MapPin,
  MoreVertical, Edit2, Power, History,
  Loader2, ArrowRight, FileText, X as XIcon
} from 'lucide-react';
import { 
  getNegociosInformales, 
  registrarNegocio, 
  registrarAbono,
  desactivarNegocio,
  agregarDiasManuales
} from '../services/informalService';
import { getTarifaInformal } from '../services/informalService';
import { generarPDFInformal } from '../services/pdfService';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const ModuloInformales = () => {
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [montoAbono, setMontoAbono] = useState({});

  const [tarifaGlobal, setTarifaGlobal] = useState(0);

  const [form, setForm] = useState({
    nombre_cliente: '',
    nombre_negocio: '',
    celular: ''
  });

  useEffect(() => {
    cargarNegocios();
    obtenerTarifa();
  }, []);

  const obtenerTarifa = async () => {
    const t = await getTarifaInformal();
    setTarifaGlobal(t);
  };

  const cargarNegocios = async () => {
    setCargando(true);
    const res = await getNegociosInformales();
    if (res.success) setNegocios(res.data);
    setCargando(false);
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setProcesando(true);
    
    Swal.fire({
      title: 'Registrando negocio...',
      text: 'Estamos dando de alta el nuevo local',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await registrarNegocio({ 
        ...form, 
        valor_diario: tarifaGlobal
      });
      if (res.success) {
        Swal.close();
        await Swal.fire('¡Éxito!', 'Negocio registrado correctamente', 'success');
        setMostrarForm(false);
        setForm({ nombre_cliente: '', nombre_negocio: '', celular: '' });
        cargarNegocios();
      } else {
        Swal.fire('Error', res.error?.message || 'No se pudo registrar el negocio', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Ocurrió un error inesperado al registrar', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const handleAbono = async (id, abonosActuales, valor) => {
    if (!valor || valor <= 0) return;
    
    const result = await Swal.fire({
      title: 'Confirmar Abono',
      text: `¿Registrar abono de $${valor.toLocaleString()}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, abonar'
    });

    if (result.isConfirmed) {
      setProcesando(true);
      
      Swal.fire({
        title: 'Procesando abono...',
        text: 'Registrando información en el sistema',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        await registrarAbono(id, abonosActuales, valor);
        Swal.close();
        await Swal.fire('¡Abono Registrado!', `$${valor.toLocaleString()}`, 'success');
        setMontoAbono({ ...montoAbono, [id]: '' });
        cargarNegocios();
      } catch (err) {
        Swal.fire('Error', 'Fallo al abonar', 'error');
      } finally {
        setProcesando(false);
      }
    }
  };

  const handlePagoTotal = async (negocio) => {
    const faltante = negocio.deuda_acumulada;
    if (faltante <= 0) return;

    const result = await Swal.fire({
      title: 'Liquidar Deuda',
      text: `¿Pagar el total de $${faltante.toLocaleString()}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Sí, liquidar todo'
    });

    if (result.isConfirmed) {
      setProcesando(true);
      Swal.fire({
        title: 'Procesando pago total...',
        text: 'Liquidando cuenta pendiente',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        await registrarAbono(negocio.id, negocio.abonos_hoy, faltante);
        Swal.close();
        await Swal.fire('Cuenta Liquidada', 'Se ha pagado el total del día', 'success');
        cargarNegocios();
      } catch (err) {
        Swal.fire('Error', 'No se pudo liquidar', 'error');
      } finally {
        setProcesando(false);
      }
    }
  };

  const handleAgregarDia = async (id, diasActuales) => {
    const { value: dias } = await Swal.fire({
      title: 'Extender Vigencia',
      input: 'number',
      inputLabel: 'Días adicionales',
      inputValue: 1,
      showCancelButton: true
    });

    if (dias) {
      setProcesando(true);
      Swal.fire({
        title: 'Agregando días...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        await agregarDiasManuales(id, parseInt(diasActuales), parseInt(dias));
        Swal.close();
        await Swal.fire('¡Días Agregados!', '', 'success');
        cargarNegocios();
      } catch (err) {
        Swal.fire('Error', 'Fallo al agregar días', 'error');
      } finally {
        setProcesando(false);
      }
    }
  };

  const handleDesactivar = async (id, estadoActual) => {
    const accion = estadoActual ? 'desactivar' : 'activar';
    const result = await Swal.fire({
      title: `¿${accion.toUpperCase()} negocio?`,
      icon: 'warning',
      showCancelButton: true
    });

    if (result.isConfirmed) {
      setProcesando(true);
      Swal.fire({
        title: 'Procesando cambio de estado...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        await desactivarNegocio(id, !estadoActual);
        Swal.close();
        cargarNegocios();
      } catch (err) {
        Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
      } finally {
        setProcesando(false);
      }
    }
  };

  const negociosFiltrados = negocios.filter(n => 
    n.nombre_negocio.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase())
  );

  const clientesAtrasados = negociosFiltrados.filter(n => n.activo && n.deuda_acumulada >= (tarifaGlobal * 7));

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* HEADER GESTIÓN INFORMAL */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
        <div>
          <h2 className="text-4xl font-black text-gray-800 flex items-center gap-4">
            <Store className="text-orange-600" size={40} /> Gestión Informal
          </h2>
          <p className="text-gray-500 font-medium">Control de puestos y recaudos diarios</p>
        </div>
        <button 
          onClick={() => setMostrarForm(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-orange-200 transition-all active:scale-95"
        >
          <Plus size={20} /> Registrar Nuevo Puesto
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 flex gap-4">
        <div className="flex-1 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 md:py-4 focus-within:ring-4 focus-within:ring-orange-100 transition-all">
          <Search className="text-gray-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por negocio o dueño..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent border-none outline-none font-bold text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* RECORDATORIO DE ATRASOS */}
      <AnimatePresence>
        {clientesAtrasados.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl shadow-sm flex items-start gap-4"
          >
            <AlertCircle className="text-red-500 shrink-0 mt-1" size={28} />
            <div>
              <h3 className="text-red-800 font-black text-lg">Alerta de Pagos Atrasados</h3>
              <p className="text-red-600 font-medium text-sm mt-1">
                Hay {clientesAtrasados.length} cliente{clientesAtrasados.length > 1 ? 's' : ''} con una semana o más sin abonar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {clientesAtrasados.map(c => (
                  <span key={c.id} className="bg-white text-red-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm border border-red-100">
                    {c.nombre_negocio} (-${c.deuda_acumulada.toLocaleString()})
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTADO DE NEGOCIOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {cargando ? (
            <div className="col-span-full py-20 text-center text-gray-300 font-black animate-pulse">CARGANDO REGISTROS...</div>
          ) : negociosFiltrados.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
              <Store size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay negocios registrados</p>
            </div>
          ) : (
            negociosFiltrados.map((n) => (
              <motion.div 
                layout key={n.id}
                className={`bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl border overflow-hidden transition-all group ${!n.activo ? 'opacity-60 grayscale' : 'border-gray-100'}`}
              >
                {/* Cabecera Tarjeta */}
                <div className={`p-6 md:p-8 ${n.deuda_acumulada > 0 ? 'bg-red-50/30' : 'bg-emerald-50/30'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${n.deuda_acumulada > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Store size={24} />
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${n.activo ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                        {n.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-widest">ID #{n.id.slice(0,5)}</p>
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-gray-900 leading-tight mb-1">{n.nombre_negocio}</h3>
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-widest">
                    <User size={12} /> {n.nombre_cliente}
                  </div>
                </div>

                {/* Info Financiera */}
                <div className="p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Días Totales</p>
                      <p className="text-lg font-black text-gray-800">{n.dias_totales || 0} d</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Abonos Hoy</p>
                      <p className="text-lg font-black text-emerald-600">${n.abonos_hoy.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className={`p-5 rounded-3xl border-2 flex justify-between items-center ${n.deuda_acumulada > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Deuda Hoy</p>
                      <p className={`text-2xl font-black ${n.deuda_acumulada > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${n.deuda_acumulada.toLocaleString()}
                      </p>
                    </div>
                    {n.deuda_acumulada > 0 && (
                      <button 
                        disabled={procesando}
                        onClick={() => handlePagoTotal(n)}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
                      >
                        Liquidar
                      </button>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Monto $"
                        value={montoAbono[n.id] || ''}
                        onChange={(e) => setMontoAbono({...montoAbono, [n.id]: e.target.value})}
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
                      />
                      <button 
                        disabled={procesando}
                        onClick={() => handleAbono(n.id, n.abonos_hoy, parseInt(montoAbono[n.id]))}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 disabled:opacity-50"
                      >
                        Abonar
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        disabled={procesando}
                        onClick={() => handleAgregarDia(n.id, n.dias_totales)}
                        className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Calendar size={14} /> Extender
                      </button>
                      <button 
                        disabled={procesando}
                        onClick={() => handleDesactivar(n.id, n.activo)}
                        className={`p-3 rounded-xl transition-all disabled:opacity-50 ${n.activo ? 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                      >
                        <Power size={20} />
                      </button>
                    </div>
                    <button 
                      onClick={() => generarPDFInformal(n, tarifaGlobal)}
                      className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <FileText size={14} /> Generar Extracto PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* MODAL DE REGISTRO */}
      <AnimatePresence>
        {mostrarForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl">
              <div className="bg-orange-600 p-10 text-white relative">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Nuevo Puesto</h3>
                <p className="text-orange-100 font-medium">Registra un nuevo negocio informal</p>
                <button onClick={() => setMostrarForm(false)} className="absolute top-10 right-10 hover:rotate-90 transition-transform"><X size={28}/></button>
              </div>
              <form onSubmit={handleRegistro} className="p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Nombre del Dueño</label>
                    <input required value={form.nombre_cliente} onChange={e => setForm({...form, nombre_cliente: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-orange-100"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Nombre Negocio</label>
                    <input required value={form.nombre_negocio} onChange={e => setForm({...form, nombre_negocio: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-orange-100"/>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Celular de Contacto</label>
                    <input type="tel" required value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-orange-100" placeholder="Ej: 300 123 4567"/>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Tarifa Diaria de Guardado</p>
                      <p className="text-xl font-black text-orange-700">${tarifaGlobal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <button 
                  disabled={procesando}
                  className="w-full bg-orange-600 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-orange-700 transition-all active:scale-95 text-lg uppercase tracking-widest disabled:opacity-50"
                >
                  Confirmar Registro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default ModuloInformales;