import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, User, MessageSquare, 
  ChevronRight, Clock, Shield, Search,
  Car, Store, Info, Camera, Eye, ArrowLeft, X, CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const BandejaMensajes = ({ admin }) => {
  const [mensajesHistorial, setMensajesHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [contextoActivo, setContextoActivo] = useState(admin?.rol?.includes('informales') ? 'informales' : 'parqueadero');
  const [busqueda, setBusqueda] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  
  const [respuesta, setRespuesta] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [imgExpandida, setImgExpandida] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);

  const esEmpleado = admin?.rol?.startsWith('empleado');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    cargarUsuarios();
    cargarHistorial();
  }, [contextoActivo]);

  useEffect(() => {
    // Escuchar nuevos mensajes en tiempo real
    if (!admin?.id) return;
    const msgChannel = supabase
      .channel('mensajes-admin')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensajes'
      }, (payload) => {
        // Recargar si el mensaje nos involucra
        if (payload.new.remitente_id === admin.id || payload.new.destinatario_id === admin.id) {
          cargarHistorial();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [admin?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajesHistorial, usuarioSeleccionado]);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('admins').select('id, username, rol, nombre_completo, foto_perfil');
    setUsuarios(data || []);
  };

  const cargarHistorial = async () => {
    if (!admin?.id) return;
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select(`
          *,
          remitente:remitente_id(id, username, rol, nombre_completo),
          destinatario:destinatario_id(id, username, rol, nombre_completo)
        `)
        .or(`remitente_id.eq.${admin.id},destinatario_id.eq.${admin.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMensajesHistorial(data || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setCargando(false);
    }
  };

  const abrirChat = async (contacto) => {
    setUsuarioSeleccionado(contacto);
    // Marcar como leídos los mensajes de este contacto
    const mensajesNoLeidos = mensajesHistorial.filter(m => m.remitente_id === contacto.id && m.destinatario_id === admin.id && !m.leido);
    if (mensajesNoLeidos.length > 0) {
      await supabase.from('mensajes').update({ leido: true }).in('id', mensajesNoLeidos.map(m => m.id));
      cargarHistorial();
    }
  };

  const enviarMensaje = async (e) => {
    if (e) e.preventDefault();
    if (!respuesta.trim() && !evidenciaUrl) return;

    try {
      const nuevoMsj = {
        remitente_id: admin.id,
        destinatario_id: usuarioSeleccionado.id,
        asunto: 'Chat Directo',
        contenido: respuesta,
        evidencia_url: evidenciaUrl,
        contexto: contextoActivo,
        tipo: 'normal',
        aceptado: true,
        estado: 'abierto'
      };

      const { data, error } = await supabase.from('mensajes').insert([nuevoMsj]).select().single();
      if (error) throw error;

      setRespuesta('');
      setEvidenciaUrl('');
      // Agregar al estado local optimísticamente
      setMensajesHistorial([...mensajesHistorial, { ...data, remitente: admin, destinatario: usuarioSeleccionado }]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Swal.fire('Error', 'No se pudo enviar el mensaje.', 'error');
    }
  };

  // Filtrar los usuarios con los que puede chatear
  const contactosHabilitados = usuarios.filter(u => {
    if (u.id === admin.id) return false;
    
    // Si estamos en contexto de soporte, mostrar admins master y cuentas de desarrollador
    if (contextoActivo === 'soporte') {
      const isMaster = u.rol === 'ambos' || u.rol === 'admin_master' || u.rol === 'master';
      const isDev = u.username.toLowerCase().includes('chriz') || u.username.toLowerCase().includes('dev');
      return isMaster || isDev;
    }

    if (esEmpleado) {
      // El empleado solo puede hablar con Admins (Master y su respectivo contexto)
      if (u.rol === 'ambos' || u.rol === 'admin_master') return true;
      if (contextoActivo === 'parqueadero' && u.rol === 'parqueadero') return true;
      if (contextoActivo === 'informales' && u.rol === 'informales') return true;
      return false;
    } else {
      // El admin puede hablar con empleados de su contexto o con otros admins master
      if (u.rol === 'ambos' || u.rol === 'admin_master') return true;
      if (contextoActivo === 'parqueadero') {
        return u.rol === 'empleado_parqueo' || u.rol === 'empleado_ambos' || u.rol === 'empleado' || u.rol === 'parqueadero';
      }
      if (contextoActivo === 'informales') {
        return u.rol === 'empleado_informales' || u.rol === 'empleado_ambos' || u.rol === 'empleado' || u.rol === 'informales';
      }
      return true; // Fallback
    }
  });

  const contactosFiltrados = contactosHabilitados.filter(u => 
    u.username.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Obtener mensajes de la conversación actual
  const mensajesChat = usuarioSeleccionado 
    ? mensajesHistorial.filter(m => 
        (m.remitente_id === admin.id && m.destinatario_id === usuarioSeleccionado.id) ||
        (m.remitente_id === usuarioSeleccionado.id && m.destinatario_id === admin.id)
      )
    : [];

  const mostrarLista = !isMobile || !usuarioSeleccionado;
  const mostrarChat = !isMobile || !!usuarioSeleccionado;

  return (
    <div className="max-w-7xl mx-auto p-2 md:p-4">
      <div className="bg-slate-900 rounded-[2rem] p-5 md:p-6 text-white mb-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">CHAT DIRECTO</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comunicación {contextoActivo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
          <div className="flex bg-black/40 p-1 rounded-lg">
            {(admin?.rol === 'ambos' || admin?.rol === 'admin_master' || (esEmpleado && admin?.rol === 'empleado_ambos') || admin?.rol === 'parqueadero') && (
              <button 
                onClick={() => { setContextoActivo('parqueadero'); setUsuarioSeleccionado(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${contextoActivo === 'parqueadero' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <Car size={14}/> PARQUEO
              </button>
            )}
            {(admin?.rol === 'ambos' || admin?.rol === 'admin_master' || (esEmpleado && admin?.rol === 'empleado_ambos') || admin?.rol === 'informales') && (
              <button 
                onClick={() => { setContextoActivo('informales'); setUsuarioSeleccionado(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${contextoActivo === 'informales' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <Store size={14}/> INFORMALES
              </button>
            )}
            <button 
              onClick={() => { setContextoActivo('soporte'); setUsuarioSeleccionado(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${contextoActivo === 'soporte' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              <Shield size={14}/> SOPORTE
            </button>
          </div>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL DEL CHAT (ESTILO WHATSAPP) */}
      <div className="flex bg-white rounded-[2rem] shadow-2xl border border-gray-200 overflow-hidden w-full relative" style={{ height: "calc(100vh - 250px)", minHeight: "500px" }}>
        
        {/* PANEL IZQUIERDO: LISTA DE CONTACTOS */}
        {mostrarLista && (
        <div className="flex-shrink-0 flex-col bg-white border-r border-gray-100 flex" style={{ width: isMobile ? '100%' : '350px' }}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
              </div>
              <input 
                type="text" placeholder="Buscar contacto..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {cargando && usuarios.length === 0 ? (
              <div className="p-10 text-center text-gray-300 font-black animate-pulse text-xs uppercase tracking-widest">Cargando...</div>
            ) : contactosFiltrados.length === 0 ? (
              <div className="p-10 text-center">
                <User size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="font-black text-[10px] uppercase text-gray-400 mb-4">Sin contactos en esta sección</p>
                {contextoActivo !== 'soporte' && (
                  <button 
                    onClick={() => setContextoActivo('soporte')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                  >
                    Contactar Soporte
                  </button>
                )}
              </div>
            ) : (
              contactosFiltrados.map((u) => {
                const msjsConUsuario = mensajesHistorial.filter(m => (m.remitente_id === u.id && m.destinatario_id === admin.id) || (m.remitente_id === admin.id && m.destinatario_id === u.id));
                const ultimoMsj = msjsConUsuario.length > 0 ? msjsConUsuario[msjsConUsuario.length - 1] : null;
                const noLeidos = msjsConUsuario.filter(m => m.remitente_id === u.id && m.destinatario_id === admin.id && !m.leido).length;

                return (
                  <div 
                    key={u.id} onClick={() => abrirChat(u)}
                    className={`p-4 border-b border-gray-50 cursor-pointer transition-all relative flex items-center gap-3 hover:bg-gray-50 ${usuarioSeleccionado?.id === u.id ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className="relative">
                      <img src={u.foto_perfil || `https://ui-avatars.com/api/?name=${u.username}`} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      {noLeidos > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full border border-white">
                          {noLeidos}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-black text-gray-900 text-xs truncate">{u.nombre_completo || u.username}</h4>
                        {ultimoMsj && <span className="text-[9px] text-gray-400 font-bold">{new Date(ultimoMsj.created_at).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 truncate font-medium flex-1">
                          {ultimoMsj ? (ultimoMsj.remitente_id === admin.id ? `Tú: ${ultimoMsj.contenido || '📷 Foto'}` : ultimoMsj.contenido || '📷 Foto') : 'Pulsa para chatear'}
                        </p>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase whitespace-nowrap ${u.rol.includes('admin') || u.rol === 'ambos' || u.rol === 'master' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {(u.rol === 'ambos' || u.rol === 'admin_master' || u.rol === 'master' || u.username.toLowerCase().includes('chriz')) ? 'Soporte Técnico' : u.rol.includes('empleado') ? 'Empleado' : 'Admin'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        )}

        {/* PANEL DERECHO: CHAT CONTINUO */}
        {mostrarChat && (
        <div className="flex-1 flex-col bg-gray-50/50 flex" style={{ minWidth: 0 }}>
          {usuarioSeleccionado ? (
            <>
              {/* HEADER DEL CHAT */}
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setUsuarioSeleccionado(null)} 
                    className="md:hidden p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    <ArrowLeft size={18}/>
                  </button>
                  <img src={usuarioSeleccionado.foto_perfil || `https://ui-avatars.com/api/?name=${usuarioSeleccionado.username}`} className="w-9 h-9 rounded-full object-cover border border-indigo-100" />
                  <div>
                    <h3 className="font-black text-sm text-gray-900 leading-none mb-0.5">{usuarioSeleccionado.nombre_completo || usuarioSeleccionado.username}</h3>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                      {usuarioSeleccionado.rol === 'ambos' ? 'Admin Master' : usuarioSeleccionado.rol.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* HISTORIAL DE MENSAJES */}
              <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar" style={{ overflowAnchor: 'none' }}>
                {mensajesChat.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
                    <MessageSquare size={48} className="mb-3" />
                    <p className="font-black text-[10px] uppercase tracking-widest">Envía un mensaje para iniciar</p>
                  </div>
                ) : (
                  mensajesChat.map(m => {
                    const isMe = m.remitente_id === admin.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] md:max-w-[70%] p-3 rounded-2xl relative shadow-sm ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-br-sm' 
                            : 'bg-white border border-gray-200 rounded-bl-sm text-gray-800'
                        }`}>
                          {m.evidencia_url && (
                            <div className="relative group cursor-zoom-in mb-2" onClick={() => setImgExpandida(m.evidencia_url)}>
                              <img src={m.evidencia_url} className="w-full max-h-48 object-cover rounded-xl border border-black/5" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                <Eye className="text-white" size={20} />
                              </div>
                            </div>
                          )}
                          {m.contenido && <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{m.contenido}</p>}
                          <p className={`text-[8px] mt-1 text-right font-bold ${isMe ? 'opacity-60 text-indigo-100' : 'opacity-40 text-gray-500'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ZONA DE INPUT (ESCRITURA) */}
              <div className="p-3 md:p-4 bg-white border-t border-gray-200 z-10">
                {evidenciaUrl && (
                  <div className="mb-3 relative inline-block">
                    <img src={evidenciaUrl} className="h-16 w-auto rounded-lg shadow-md border border-gray-200" />
                    <button 
                      onClick={() => setEvidenciaUrl('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                <form onSubmit={enviarMensaje} className="flex gap-2 items-end">
                  <button 
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    className={`p-3 rounded-xl transition-all ${evidenciaUrl ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-indigo-600'}`}
                  >
                    <Camera size={18}/>
                  </button>

                  <textarea 
                    placeholder="Escribe un mensaje..."
                    rows="1"
                    value={respuesta} 
                    onChange={e => setRespuesta(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        enviarMensaje();
                      }
                    }}
                    className="flex-1 bg-gray-100 border border-transparent rounded-xl px-4 py-3 font-medium text-xs outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none max-h-32 custom-scrollbar"
                  />
                  
                  <button 
                    type="submit" 
                    disabled={!respuesta.trim() && !evidenciaUrl}
                    className="flex-shrink-0 bg-indigo-600 disabled:bg-gray-300 disabled:scale-100 text-white p-3 rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send size={18}/>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10 text-center">
              <div className="bg-white p-6 rounded-full shadow-sm mb-4 border border-gray-100">
                <MessageSquare size={48} className="text-gray-300" />
              </div>
              <h4 className="font-black text-xl uppercase tracking-tighter text-gray-400">Selecciona un chat</h4>
              <p className="font-bold text-[10px] uppercase tracking-widest text-gray-400 mt-2">Comunicación en tiempo real</p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* MODAL IMAGEN EXPANDIDA */}
      <AnimatePresence>
        {imgExpandida && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setImgExpandida(null)}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-10 cursor-zoom-out"
          >
             <motion.img 
               initial={{ scale: 0.9 }} animate={{ scale: 1 }}
               src={imgExpandida} className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain border border-white/10" 
             />
             <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-all bg-white/10 p-2 rounded-full">
               <X size={32}/>
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CÁMARA O ARCHIVO */}
      <AnimatePresence>
        {showCameraModal && (
          <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/10">
              <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                  <Camera size={24}/> FOTO
                </h3>
                <button onClick={() => setShowCameraModal(false)} className="hover:rotate-90 transition-transform bg-white/20 p-2 rounded-xl"><X size={20}/></button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-inner border-4 border-gray-100">
                  <video 
                    ref={videoRef} autoPlay playsInline 
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" width="1280" height="720" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                        videoRef.current.srcObject = stream;
                      } catch (err) {
                        Swal.fire('Error', 'No se puede acceder a la cámara', 'error');
                      }
                    }}
                    className="bg-gray-100 hover:bg-gray-200 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-600 transition-all border border-gray-200"
                  >
                    Abrir Cámara
                  </button>
                  <button 
                    onClick={() => {
                      if (!videoRef.current || !videoRef.current.srcObject) return;
                      const context = canvasRef.current.getContext('2d');
                      context.drawImage(videoRef.current, 0, 0, 1280, 720);
                      const data = canvasRef.current.toDataURL('image/jpeg', 0.8);
                      setEvidenciaUrl(data);
                      setShowCameraModal(false);
                      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-xl shadow-indigo-200"
                  >
                    Capturar Foto
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                  <div className="relative flex justify-center text-[10px]"><span className="px-4 bg-white text-gray-400 font-black uppercase tracking-[0.3em]">O GALERÍA</span></div>
                </div>

                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                          setEvidenciaUrl(re.target.result);
                          setShowCameraModal(false);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="w-full bg-slate-900 hover:bg-black py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  <Search size={18}/> SELECCIONAR IMAGEN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BandejaMensajes;
