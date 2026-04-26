import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, UserX, Trash2, Search, 
  Plus, X, AlertCircle, FileText, 
  Calendar, Loader2, User, Fingerprint
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const ModuloListaNegra = ({ admin, selectedModule = 'parqueadero' }) => {
  const [bloqueados, setBloqueados] = useState([]);
  const [clientesDisponibles, setClientesDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteSelDetalle, setClienteSelDetalle] = useState(null);
  const [form, setForm] = useState({
    identificacion: '',
    nombre_completo: '',
    motivo: '',
    placa_relacionada: '',
    url_evidencia: ''
  });

  useEffect(() => {
    cargarBloqueados();
    cargarClientes();
  }, [selectedModule]);

  const cargarClientes = async () => {
    try {
      if (selectedModule === 'parqueadero') {
        const { data } = await supabase
          .from('registros_parqueadero')
          .select('placa, cliente_nombre')
          .order('entrada', { ascending: false });
        
        const unique = [];
        const seen = new Set();
        data?.forEach(d => {
          if (!seen.has(d.placa)) {
            seen.add(d.placa);
            unique.push({ label: `${d.placa} - ${d.cliente_nombre || 'S/N'}`, value: d.placa, nombre: d.cliente_nombre });
          }
        });
        setClientesDisponibles(unique);
      } else {
        const { data } = await supabase
          .from('negocios_informales')
          .select('nombre_negocio, nombre_cliente, celular')
          .order('created_at', { ascending: false });
        
        setClientesDisponibles(data?.map(d => ({ 
          label: `${d.nombre_negocio} (${d.nombre_cliente})`, 
          value: d.nombre_negocio, 
          nombre: d.nombre_cliente,
          celular: d.celular
        })) || []);
      }
    } catch (e) {
      console.error("Error cargando clientes para select:", e);
    }
  };

  const cargarBloqueados = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('lista_negra')
        .select('*')
        .eq('modulo', selectedModule)
        .order('created_at', { ascending: false });

      if (error) {
        const { data: allData } = await supabase
          .from('lista_negra')
          .select('*')
          .order('created_at', { ascending: false });
        setBloqueados(allData || []);
      } else {
        setBloqueados(data || []);
      }
    } catch (error) {
      console.error('Error cargando lista negra:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, url_evidencia: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBloquear = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('lista_negra')
        .insert([{
          ...form,
          modulo: selectedModule,
          registrado_por: admin.username
        }]);

      if (error) throw error;

      Swal.fire('¡Vetado!', 'El cliente ha sido añadido a la lista negra.', 'success');
      setMostrarModal(false);
      setForm({ identificacion: '', nombre_completo: '', motivo: '', placa_relacionada: '', url_evidencia: '' });
      cargarBloqueados();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo registrar el bloqueo. Verifique la conexión.', 'error');
    }
  };

  const handleEliminar = async (id) => {
    const res = await Swal.fire({
      title: '¿Retirar de Lista Negra?',
      text: 'El cliente podrá volver a usar el servicio.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      confirmButtonText: 'Sí, retirar veto'
    });

    if (res.isConfirmed) {
      await supabase.from('lista_negra').delete().eq('id', id);
      cargarBloqueados();
      Swal.fire('Veto Retirado', '', 'success');
    }
  };

  const filtrados = bloqueados.filter(b => 
    b.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    b.identificacion.includes(busqueda) ||
    b.placa_relacionada?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col min-h-[80vh]">
      <div className="bg-red-950 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border border-red-900/20">
        <div className="flex items-center gap-5">
          <div className="bg-red-600 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-lg shadow-red-900/40">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">LISTA NEGRA</h2>
            <p className="text-[9px] md:text-[10px] font-black text-red-400 uppercase tracking-widest">Control de Clientes Restringidos</p>
          </div>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="w-full md:w-auto bg-white text-red-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/20"
        >
          <UserX size={20}/> Vetar Nuevo Cliente
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 mb-8 flex items-center gap-4">
        <Search className="text-gray-400" size={24}/>
        <input 
          type="text" 
          placeholder="Buscar por nombre, cédula o placa..." 
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none font-bold text-gray-700 placeholder-gray-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cargando ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-300 font-black uppercase tracking-widest">
            <Loader2 className="animate-spin mb-4" size={48} />
            Sincronizando Archivos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-200">
            <ShieldAlert size={120} className="mb-4 opacity-10" />
            <p className="font-black text-xl uppercase tracking-widest opacity-20">Sin Registros de Veto</p>
          </div>
        ) : (
          filtrados.map(b => (
            <motion.div 
              layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              key={b.id}
              className="bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 border-red-50 overflow-hidden shadow-xl hover:shadow-2xl transition-all group"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-red-50 p-4 rounded-2xl">
                    <Fingerprint className="text-red-600" size={24} />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>

                <h3 className="text-xl font-black text-gray-900 mb-1 truncate">{b.nombre_completo}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">C.C. {b.identificacion}</p>

                <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Motivo del Veto</p>
                    <p className="text-xs font-bold text-red-600 leading-relaxed italic">"{b.motivo}"</p>
                  </div>
                  {b.placa_relacionada && (
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{selectedModule === 'parqueadero' ? 'Placa' : 'Negocio'} Relacionado</p>
                      <span className="inline-block bg-gray-900 text-white px-3 py-1 rounded-lg font-black text-[10px]">{b.placa_relacionada}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setClienteSelDetalle(b)}
                    className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
                  >
                    Ver Detalle
                  </button>
                  <div className="flex items-center gap-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase">@{b.registrado_por}</p>
                    {admin?.rol === 'ambos' && (
                      <button 
                        onClick={() => handleEliminar(b.id)}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                      >
                        <Trash2 size={18}/>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="bg-red-600 p-10 text-white relative">
                <h3 className="text-3xl font-black uppercase tracking-tighter">VETAR CLIENTE</h3>
                <button onClick={() => setMostrarModal(false)} className="absolute top-10 right-10 hover:rotate-90 transition-transform"><X size={28}/></button>
              </div>

              <form onSubmit={handleBloquear} className="p-10 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Seleccionar de {selectedModule === 'parqueadero' ? 'Vehículos' : 'Negocios'}</label>
                  <select 
                    onChange={e => {
                      const sel = clientesDisponibles.find(c => c.value === e.target.value);
                      if (sel) {
                        setForm({
                          ...form,
                          placa_relacionada: sel.value,
                          nombre_completo: sel.nombre || '',
                          identificacion: sel.celular || ''
                        });
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-red-100 text-sm"
                  >
                    <option value="">-- Seleccionar --</option>
                    {clientesDisponibles.map((c, i) => (
                      <option key={i} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">{selectedModule === 'parqueadero' ? 'Identificación' : 'Celular'}</label>
                    <input required value={form.identificacion} onChange={e => setForm({...form, identificacion: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-red-100" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">{selectedModule === 'parqueadero' ? 'Placa' : 'Negocio'}</label>
                    <input value={form.placa_relacionada} onChange={e => setForm({...form, placa_relacionada: selectedModule === 'parqueadero' ? e.target.value.toUpperCase() : e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-red-100" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Nombre Completo</label>
                  <input required value={form.nombre_completo} onChange={e => setForm({...form, nombre_completo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none focus:ring-4 focus:ring-red-100" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Motivo</label>
                  <textarea required rows="2" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-medium outline-none focus:ring-4 focus:ring-red-100 resize-none"></textarea>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Evidencia</label>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-red-50 hover:border-red-200 transition-all">
                      <Camera size={24} className="text-red-500" />
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                    </label>
                    {form.url_evidencia && <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-green-500"><img src={form.url_evidencia} className="w-full h-full object-cover" alt="Preview" /></div>}
                  </div>
                </div>

                <button className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-red-900/20 transition-all active:scale-[0.98]">CONFIRMAR VETO</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clienteSelDetalle && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="relative h-64 bg-gray-900">
                {clienteSelDetalle.url_evidencia ? (
                  <img src={clienteSelDetalle.url_evidencia} className="w-full h-full object-cover opacity-60" alt="Evidencia" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                    <ShieldAlert size={64} />
                    <p className="text-[10px] font-black uppercase mt-4">Sin Evidencia Visual</p>
                  </div>
                )}
                <button onClick={() => setClienteSelDetalle(null)} className="absolute top-8 right-8 bg-white/20 p-3 rounded-full text-white backdrop-blur-md hover:bg-red-500 transition-all"><X size={24}/></button>
              </div>
              <div className="p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{clienteSelDetalle.nombre_completo}</h4>
                    <p className="text-sm font-bold text-red-600">ID: {clienteSelDetalle.identificacion}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">CLIENTE VETADO</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Informe del Incidente</h5>
                    <p className="text-gray-700 font-medium leading-relaxed italic">"{clienteSelDetalle.motivo}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-500">
                    <div className="flex items-center gap-2"><Calendar size={16}/> Vetado el: {new Date(clienteSelDetalle.created_at).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2"><User size={16}/> Reportado por: @{clienteSelDetalle.registrado_por}</div>
                  </div>
                </div>
                <button onClick={() => setClienteSelDetalle(null)} className="w-full mt-10 bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all">Cerrar Expediente</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Camera = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

export default ModuloListaNegra;
