import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, FileText, Plus, Trash2, 
  Search, AlertCircle, Image as ImageIcon,
  MessageSquare, Calendar, User, Loader2,
  Upload, XCircle, ChevronRight, ChevronLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const ModuloEvidencias = ({ admin, selectedModule = 'parqueadero' }) => {
  const [evidencias, setEvidencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaEvidencia, setNuevaEvidencia] = useState({
    placa: '',
    nota: '',
    imagenes: [] // Ahora es un array
  });

  useEffect(() => {
    cargarEvidencias();
  }, []);

  const cargarEvidencias = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('evidencias')
        .select(`
          *,
          registros_parqueadero (placa),
          negocios_informales (nombre_negocio)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filtrar por módulo si es necesario (si hay una columna modulo o por las relaciones)
      const filtradas = data.filter(ev => {
        if (selectedModule === 'parqueadero') return !!ev.registros_parqueadero;
        return !!ev.negocios_informales;
      });

      setEvidencias(filtradas || []);
    } catch (error) {
      console.error('Error cargando evidencias:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNuevaEvidencia(prev => ({
          ...prev,
          imagenes: [...prev.imagenes, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const eliminarImagenPrevia = (index) => {
    setNuevaEvidencia(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index)
    }));
  };

  const handleCrearEvidencia = async (e) => {
    e.preventDefault();
    try {
      let registroId = null;
      let negocioId = null;

      if (selectedModule === 'parqueadero') {
        const { data: registro } = await supabase
          .from('registros_parqueadero')
          .select('id')
          .eq('placa', nuevaEvidencia.placa.toUpperCase())
          .order('entrada', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!registro) return Swal.fire('Error', 'No se encontró ningún vehículo con esa placa', 'error');
        registroId = registro.id;
      } else {
        const { data: negocio } = await supabase
          .from('negocios_informales')
          .select('id')
          .eq('nombre_negocio', nuevaEvidencia.placa) // Usamos el mismo campo 'placa' del state para el nombre
          .maybeSingle();

        if (!negocio) return Swal.fire('Error', 'No se encontró el negocio especificado', 'error');
        negocioId = negocio.id;
      }

      const { error } = await supabase
        .from('evidencias')
        .insert([{
          registro_id: registroId,
          negocio_id: negocioId,
          imagenes: nuevaEvidencia.imagenes.length > 0 ? nuevaEvidencia.imagenes : ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=1000'],
          nota: nuevaEvidencia.nota,
          modulo: selectedModule
        }]);

      if (error) throw error;

      Swal.fire('Éxito', 'Evidencia registrada correctamente', 'success');
      setMostrarModal(false);
      setNuevaEvidencia({ placa: '', nota: '', imagenes: [] });
      cargarEvidencias();
    } catch (error) {
      console.error('Error creando evidencia:', error);
      Swal.fire('Error', 'No se pudo registrar la evidencia. Asegúrese de que las tablas estén actualizadas.', 'error');
    }
  };

  const eliminarEvidencia = async (id) => {
    const res = await Swal.fire({
      title: '¿Eliminar evidencia?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444'
    });

    if (res.isConfirmed) {
      await supabase.from('evidencias').delete().eq('id', id);
      cargarEvidencias();
    }
  };

  const evidenciasFiltradas = evidencias.filter(ev => {
    const ident = selectedModule === 'parqueadero' 
      ? ev.registros_parqueadero?.placa 
      : ev.negocios_informales?.nombre_negocio;
    
    return (ident?.toLowerCase().includes(busqueda.toLowerCase()) ||
            ev.nota?.toLowerCase().includes(busqueda.toLowerCase()));
  });

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
            <Camera className="text-indigo-600" size={32} /> Reporte de Evidencias
          </h2>
          <p className="text-gray-500 font-medium">Control visual de anomalías y estados de vehículos</p>
        </div>
        <button 
          onClick={() => setMostrarModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          <Plus size={20} /> Nueva Evidencia
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all mb-8">
        <Search className="text-gray-400 shrink-0" size={20} />
        <input 
          type="text"
          placeholder="Buscar por placa o nota..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-transparent border-none outline-none font-bold text-gray-700 placeholder-gray-400"
        />
      </div>

      {cargando ? (
        <div className="p-20 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-medium">Cargando galería...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {evidenciasFiltradas.map((ev) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={ev.id}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg group hover:shadow-xl transition-all"
            >
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={ev.imagenes && ev.imagenes.length > 0 ? ev.imagenes[0] : 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&q=80&w=1000'} 
                  alt="Evidencia" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Badge de cantidad de fotos */}
                {ev.imagenes?.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-white font-black text-[10px] flex items-center gap-2">
                    <ImageIcon size={12}/> +{ev.imagenes.length - 1} FOTOS
                  </div>
                )}

                <div className="absolute top-4 left-4 bg-indigo-600/90 backdrop-blur-md px-3 py-1 rounded-full text-white font-black text-[10px] uppercase tracking-widest">
                  {selectedModule === 'parqueadero' ? ev.registros_parqueadero?.placa : ev.negocios_informales?.nombre_negocio}
                </div>
                {admin?.rol === 'ambos' && (
                  <button 
                    onClick={() => eliminarEvidencia(ev.id)}
                    className="absolute top-4 right-4 bg-red-500/80 backdrop-blur-md p-2 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-semibold">
                  <Calendar size={14} /> {new Date(ev.created_at).toLocaleString()}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                  {ev.nota || 'Sin anotaciones adicionales.'}
                </p>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                    <MessageSquare size={14} /> Nota Técnica
                  </div>
                  <AlertCircle size={16} className="text-amber-500" />
                </div>
              </div>
            </motion.div>
          ))}
          {evidenciasFiltradas.length === 0 && (
            <div className="col-span-full p-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-bold">No hay evidencias registradas que coincidan.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Evidencia */}
      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-black flex items-center gap-2"><Camera size={20}/> Nueva Evidencia</h3>
                <button onClick={() => setMostrarModal(false)} className="hover:rotate-90 transition-transform"><AlertCircle size={24} className="rotate-45"/></button>
              </div>
              <form onSubmit={handleCrearEvidencia} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {selectedModule === 'parqueadero' ? 'Placa del Vehículo' : 'Nombre del Negocio'}
                  </label>
                  <input 
                    type="text" required
                    placeholder={selectedModule === 'parqueadero' ? 'ABC-123' : 'Ej: Local 01'}
                    value={nuevaEvidencia.placa}
                    onChange={(e) => setNuevaEvidencia({...nuevaEvidencia, placa: selectedModule === 'parqueadero' ? e.target.value.toUpperCase() : e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nota o Detalle</label>
                  <textarea 
                    rows="4" required
                    placeholder="Describa el detalle o anomalía encontrada..."
                    value={nuevaEvidencia.nota}
                    onChange={(e) => setNuevaEvidencia({...nuevaEvidencia, nota: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Archivos de Evidencia ({nuevaEvidencia.imagenes.length})</label>
                  
                  {/* Grid de Previsualización */}
                  <AnimatePresence>
                    {nuevaEvidencia.imagenes.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {nuevaEvidencia.imagenes.map((img, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="relative aspect-square rounded-xl overflow-hidden border border-indigo-100 group"
                          >
                            <img src={img} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => eliminarImagenPrevia(idx)}
                              className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 border-2 border-dashed border-indigo-200 p-6 rounded-2xl transition-all flex flex-col items-center justify-center gap-2 group">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                        <Camera size={24} />
                      </div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tomar Foto</span>
                      <input 
                        type="file" accept="image/*" capture="environment"
                        multiple className="hidden" onChange={handleFileUpload}
                      />
                    </label>

                    <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 p-6 rounded-2xl transition-all flex flex-col items-center justify-center gap-2 group">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-gray-600 group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Desde Galería</span>
                      <input 
                        type="file" accept="image/*" 
                        multiple className="hidden" onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95"
                >
                  Guardar Evidencia
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuloEvidencias;
