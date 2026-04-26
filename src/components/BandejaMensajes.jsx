import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Send, Trash2, User, MessageSquare, 
  CheckCircle, Archive, Reply, 
  ChevronRight, Clock, Shield, Search,
  Bell, Circle, Car, Store, Filter, Info,
  ShieldAlert, UserCheck, Camera, Eye, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Swal from 'sweetalert2';

const BandejaMensajes = ({ admin }) => {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('abierto'); 
  const [contextoActivo, setContextoActivo] = useState(admin?.rol?.includes('informales') ? 'informales' : 'parqueadero');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarRedactar, setMostrarRedactar] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [chatSeleccionado, setChatSeleccionado] = useState(null);
  
  const [nuevoMensaje, setNuevoMensaje] = useState({
    destinatario_id: '',
    asunto: '',
    contenido: '',
    contexto: admin?.rol?.includes('informales') ? 'informales' : 'parqueadero',
    tipo: 'normal',
    evidencia_url: ''
  });

  const [respuesta, setRespuesta] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [imgExpandida, setImgExpandida] = useState(null);

  const esEmpleado = admin?.rol?.startsWith('empleado');

  useEffect(() => {
    if (esEmpleado && filtro === 'solucionado') setFiltro('abierto');
    cargarMensajes();
    cargarUsuarios();
  }, [filtro, contextoActivo]);

  const cargarUsuarios = async () => {
    const { data } = await supabase.from('admins').select('id, username, rol, nombre_completo');
    setUsuarios(data || []);
  };

  const cargarMensajes = async () => {
    if (!admin?.id) return;
    setCargando(true);
    try {
      let query = supabase
        .from('mensajes')
        .select(`
          *,
          remitente:remitente_id(username, rol, nombre_completo),
          destinatario:destinatario_id(username, rol, nombre_completo)
        `)
        .is('parent_id', null)
        .eq('estado', filtro)
        .eq('contexto', contextoActivo);

      // Si es empleado, solo ve sus propias conversaciones
      if (esEmpleado) {
        query = query.or(`remitente_id.eq.${admin.id},destinatario_id.eq.${admin.id}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setMensajes(data || []);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    } finally {
      setCargando(false);
    }
  };

  const cargarRespuestas = async (parentId) => {
    const { data } = await supabase
      .from('mensajes')
      .select('*, remitente:remitente_id(username, rol, nombre_completo)')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });
    return data || [];
  };

  const abrirChat = async (mensajeRaiz) => {
    const respuestas = await cargarRespuestas(mensajeRaiz.id);
    setChatSeleccionado({ ...mensajeRaiz, respuestas });
    if (mensajeRaiz.destinatario_id === admin.id && !mensajeRaiz.leido) {
      await supabase.from('mensajes').update({ leido: true }).eq('id', mensajeRaiz.id);
      cargarMensajes();
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    
    let destId = nuevoMensaje.destinatario_id;
    let tipoFinal = nuevoMensaje.tipo;
    let aceptadoFinal = true;

    // Lógica Lord Chriz (Soporte)
    if (tipoFinal === 'soporte') {
      const dev = usuarios.find(u => u.rol === 'ambos' || u.rol === 'admin_master' || u.rol === 'admin');
      if (!dev) {
        // Si no hay master, buscar el primer admin disponible
        const anyAdmin = usuarios.find(u => !u.rol.startsWith('empleado'));
        if (!anyAdmin) return Swal.fire('Error', 'Desarrollador no encontrado', 'error');
        destId = anyAdmin.id;
      } else {
        destId = dev.id;
      }
    }

    const dest = usuarios.find(u => u.id === destId);
    if (!dest) return;

    // Lógica de Solicitud: Cualquier comunicación entre ADMINS requiere solicitud
    const esAdminRemitente = !esEmpleado;
    const esAdminDestinatario = !dest.rol.startsWith('empleado');

    if (esAdminRemitente && esAdminDestinatario && dest.id !== admin.id) {
      tipoFinal = 'solicitud';
      aceptadoFinal = false;
    }

    try {
      const { error } = await supabase.from('mensajes').insert([{
        ...nuevoMensaje,
        destinatario_id: destId,
        remitente_id: admin.id,
        aceptado: aceptadoFinal,
        tipo: tipoFinal
      }]);

      if (error) throw error;
      
      Swal.fire({
        title: tipoFinal === 'solicitud' ? 'Solicitud Enviada' : 'Mensaje Enviado',
        text: tipoFinal === 'solicitud' ? 'El Administrador debe aceptar tu comunicación.' : 'Enviado correctamente.',
        icon: 'success'
      });

      setMostrarRedactar(false);
      setNuevoMensaje({ ...nuevoMensaje, destinatario_id: '', asunto: '', contenido: '', tipo: 'normal' });
      cargarMensajes();
    } catch (error) {
      Swal.fire('Error', 'Fallo en la comunicación', 'error');
    }
  };

  const enviarRespuesta = async () => {
    if (!respuesta.trim()) return;
    try {
      const { error } = await supabase.from('mensajes').insert([{
        remitente_id: admin.id,
        destinatario_id: chatSeleccionado.remitente_id === admin.id ? chatSeleccionado.destinatario_id : chatSeleccionado.remitente_id,
        asunto: `RE: ${chatSeleccionado.asunto}`,
        contenido: respuesta,
        evidencia_url: evidenciaUrl,
        parent_id: chatSeleccionado.id,
        estado: 'abierto',
        contexto: chatSeleccionado.contexto
      }]);

      if (error) throw error;

      setRespuesta('');
      setEvidenciaUrl('');
      const reps = await cargarRespuestas(chatSeleccionado.id);
      setChatSeleccionado({ ...chatSeleccionado, respuestas: reps });
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      Swal.fire('Error', 'No se pudo enviar el mensaje. Revisa tu conexión.', 'error');
    }
  };

  const marcarSolucionado = async (id) => {
    if (esEmpleado) return;
    const res = await Swal.fire({
      title: '¿Solucionar Asunto?',
      text: 'Se archivará en el registro histórico.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      confirmButtonColor: '#10B981'
    });
    if (res.isConfirmed) {
      await supabase.from('mensajes').update({ estado: 'solucionado' }).eq('id', id);
      setChatSeleccionado(null);
      cargarMensajes();
      Swal.fire('Archivado', 'Caso cerrado.', 'success');
    }
  };

  const aceptarSolicitud = async (id) => {
    await supabase.from('mensajes').update({ aceptado: true }).eq('id', id);
    cargarMensajes();
    setChatSeleccionado(prev => ({ ...prev, aceptado: true }));
    Swal.fire('Chat Aceptado', 'Ya puedes responder.', 'success');
  };

  const usuariosHabilitados = usuarios.filter(u => {
    if (u.id === admin.id) return false;
    if (u.rol === 'ambos' || u.rol === 'admin_master') return true;
    if (contextoActivo === 'parqueadero') {
      return u.rol === 'parqueadero' || u.rol === 'empleado_parqueo' || u.rol === 'empleado_ambos' || u.rol === 'empleado';
    }
    if (contextoActivo === 'informales') {
      return u.rol === 'informales' || u.rol === 'empleado_informales' || u.rol === 'empleado_ambos' || u.rol === 'empleado';
    }
    return false;
  });

  const mensajesFiltrados = mensajes.filter(m => 
    m.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.remitente?.username.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col h-[85vh]">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white mb-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border border-white/5">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-600 p-4 rounded-3xl">
            <MessageSquare size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">BANDEJA {contextoActivo}</h2>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Canal de Comunicación Oficial</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/5">
          {!esEmpleado && (
            <button 
              onClick={() => setFiltro(filtro === 'abierto' ? 'solucionado' : 'abierto')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${filtro === 'solucionado' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}
            >
              <Archive size={16}/> VER ARCHIVOS
            </button>
          )}
          
          <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
          
          {(admin?.rol === 'ambos' || admin?.rol === 'admin_master') && (
            <div className="flex bg-black/40 p-1 rounded-xl">
              <button 
                onClick={() => { setContextoActivo('parqueadero'); setChatSeleccionado(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${contextoActivo === 'parqueadero' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <Car size={14}/> PARQUEO
              </button>
              <button 
                onClick={() => { setContextoActivo('informales'); setChatSeleccionado(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${contextoActivo === 'informales' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                <Store size={14}/> INFORMALES
              </button>
            </div>
          )}

          <button 
            onClick={() => { setMostrarRedactar(true); setNuevoMensaje({...nuevoMensaje, tipo: 'normal', destinatario_id: ''}); }}
            className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all flex items-center gap-2"
          >
            <Send size={16}/> REDACTAR
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden h-full">
        <div className={`w-full md:w-96 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col overflow-hidden ${chatSeleccionado ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-gray-100 bg-gray-50/30">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18}/>
              </div>
              <input 
                type="text" placeholder="Buscar conversaciones..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {cargando ? (
              <div className="p-10 text-center text-gray-300 font-black animate-pulse text-xs uppercase tracking-widest">Sincronizando...</div>
            ) : mensajesFiltrados.length === 0 ? (
              <div className="p-20 text-center opacity-30">
                <MessageSquare size={48} className="mx-auto mb-4" />
                <p className="font-black text-[10px] uppercase">Bandeja Vacía</p>
              </div>
            ) : (
              mensajesFiltrados.map((m) => (
                <div 
                  key={m.id} onClick={() => abrirChat(m)}
                  className={`p-6 border-b border-gray-50 cursor-pointer transition-all relative hover:bg-gray-50 ${chatSeleccionado?.id === m.id ? 'bg-indigo-50/50 border-r-4 border-r-indigo-600' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.tipo === 'solicitud' ? 'bg-orange-100 text-orange-600' : m.tipo === 'soporte' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {m.tipo === 'solicitud' ? 'SOLICITUD' : m.tipo === 'soporte' ? 'SOPORTE' : m.remitente?.rol.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-black text-gray-900 text-sm truncate">{m.asunto}</h4>
                  <p className="text-xs text-gray-400 truncate font-medium">@{m.remitente?.username}: {m.contenido}</p>
                </div>
              ))
            )}
          </div>
          {!esEmpleado && (
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <button 
                onClick={() => { setNuevoMensaje({...nuevoMensaje, tipo: 'soporte', contexto: contextoActivo}); setMostrarRedactar(true); }}
                className="w-full bg-blue-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
              >
                <Shield size={14}/> Soporte Directo (Lord Chriz)
              </button>
            </div>
          )}
        </div>

        <div className={`flex-1 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col overflow-hidden ${chatSeleccionado ? 'flex' : 'hidden md:flex'}`}>
          {chatSeleccionado ? (
            <>
              <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/20 gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setChatSeleccionado(null)} 
                    className="md:hidden p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 shadow-sm"
                  >
                    <ArrowLeft size={20}/>
                  </button>
                  <div>
                    <h3 className="font-black text-xl md:text-2xl text-gray-900 leading-tight mb-1">{chatSeleccionado.asunto}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chat con @{chatSeleccionado.remitente?.username}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!chatSeleccionado.aceptado && chatSeleccionado.destinatario_id === admin.id && (
                    <button onClick={() => aceptarSolicitud(chatSeleccionado.id)} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg">
                      <UserCheck size={16}/> Aceptar Solicitud
                    </button>
                  )}
                  {!esEmpleado && chatSeleccionado.estado === 'abierto' && chatSeleccionado.aceptado && (
                    <button onClick={() => marcarSolucionado(chatSeleccionado.id)} className="bg-emerald-100 text-emerald-600 px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                      <CheckCircle size={16}/> MARCAR SOLUCIONADO
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto space-y-4 bg-gray-50/10 custom-scrollbar" style={{ overflowAnchor: 'none' }}>
                <div className={`flex ${chatSeleccionado.remitente_id === admin.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-5 rounded-3xl ${chatSeleccionado.remitente_id === admin.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'}`}>
                    <p className="text-[9px] font-black opacity-50 mb-1 uppercase">@{chatSeleccionado.remitente?.username}</p>
                    {chatSeleccionado.evidencia_url && (
                      <div className="relative group cursor-zoom-in mb-3" onClick={() => setImgExpandida(chatSeleccionado.evidencia_url)}>
                        <img src={chatSeleccionado.evidencia_url} className="w-full h-32 object-cover rounded-2xl border border-white/20" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                          <Eye className="text-white" size={24} />
                        </div>
                      </div>
                    )}
                    <p className="text-sm font-medium leading-relaxed">{chatSeleccionado.contenido}</p>
                    <p className="text-[8px] mt-2 opacity-40 text-right italic">{new Date(chatSeleccionado.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>

                {chatSeleccionado.respuestas?.map(r => (
                  <div key={r.id} className={`flex ${r.remitente_id === admin.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-5 rounded-3xl ${r.remitente_id === admin.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 rounded-tl-none shadow-sm'}`}>
                      <p className="text-[9px] font-black opacity-50 mb-1 uppercase">@{r.remitente?.username}</p>
                      {r.evidencia_url && (
                        <div className="relative group cursor-zoom-in mb-3" onClick={() => setImgExpandida(r.evidencia_url)}>
                          <img src={r.evidencia_url} className="w-full h-32 object-cover rounded-2xl border border-white/20" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <Eye className="text-white" size={24} />
                          </div>
                        </div>
                      )}
                      <p className="text-sm font-medium leading-relaxed">{r.contenido}</p>
                      <p className="text-[8px] mt-2 opacity-40 text-right italic">{new Date(r.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {chatSeleccionado.aceptado && chatSeleccionado.estado === 'abierto' ? (
                <div className="p-6 border-t border-gray-100 space-y-4">
                  {evidenciaUrl && (
                    <div className="relative inline-block">
                      <img src={evidenciaUrl} className="h-20 w-auto rounded-xl shadow-lg border border-gray-200" />
                      <button 
                        onClick={() => setEvidenciaUrl('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex gap-3 items-center">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => setEvidenciaUrl(re.target.result);
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className={`p-3.5 rounded-2xl transition-all ${evidenciaUrl ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 hover:text-indigo-600'}`}
                    >
                      <Camera size={20}/>
                    </button>

                    <input 
                      type="text" placeholder="Escribir respuesta..."
                      value={respuesta} onChange={e => setRespuesta(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && enviarRespuesta()}
                      className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl px-6 py-3.5 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                    />
                    <button onClick={enviarRespuesta} className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
                      <Send size={20}/>
                    </button>
                  </div>
                </div>
              ) : !chatSeleccionado.aceptado ? (
                <div className="p-6 bg-orange-50 text-orange-600 text-center font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                  <ShieldAlert size={16}/> Esperando a que el destinatario acepte el chat
                </div>
              ) : (
                <div className="p-6 bg-emerald-50 text-emerald-600 text-center font-black text-xs uppercase tracking-widest border-t border-emerald-100">
                  <CheckCircle size={16} className="inline mr-2"/> CHAT CERRADO POR ADMINISTRACIÓN
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-200 opacity-20 p-20 text-center">
              <MessageSquare size={120} className="mb-4" />
              <h4 className="font-black text-2xl uppercase tracking-tighter">Bandeja de Entrada</h4>
              <p className="font-black text-[10px] uppercase tracking-widest mt-2">Selecciona una sesión de chat para participar</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mostrarRedactar && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className={`p-10 text-white relative ${nuevoMensaje.tipo === 'soporte' ? 'bg-blue-700' : contextoActivo === 'parqueadero' ? 'bg-indigo-900' : 'bg-orange-600'}`}>
                <h3 className="text-3xl font-black uppercase tracking-tighter">
                  {nuevoMensaje.tipo === 'soporte' ? 'SOLICITAR AYUDA TÉCNICA' : `NUEVO MENSAJE: ${contextoActivo.toUpperCase()}`}
                </h3>
                <button onClick={() => setMostrarRedactar(false)} className="absolute top-10 right-10 hover:rotate-90 transition-transform"><X size={28}/></button>
              </div>
              <form onSubmit={enviarMensaje} className="p-10 space-y-6">
                {nuevoMensaje.tipo !== 'soporte' && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Enviar a:</label>
                    <select 
                      required value={nuevoMensaje.destinatario_id}
                      onChange={e => setNuevoMensaje({...nuevoMensaje, destinatario_id: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-black text-sm"
                    >
                      <option value="">Seleccionar destinatario...</option>
                      {usuariosHabilitados.map(u => (
                        <option key={u.id} value={u.id}>@{u.username} ({u.rol.replace('_', ' ')})</option>
                      ))}
                    </select>
                  </div>
                )}

                {nuevoMensaje.tipo === 'soporte' && (
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={14}/> Destinatario: Lord Chriz (Desarrollador)
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Asunto del Mensaje</label>
                  <input 
                    type="text" required placeholder="Ej: Fallo en reporte, Error de acceso..."
                    value={nuevoMensaje.asunto} onChange={e => setNuevoMensaje({...nuevoMensaje, asunto: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-bold"
                  />
                </div>
                {nuevoMensaje.tipo === 'soporte' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block tracking-widest">Evidencia del Error (Foto)</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (re) => setNuevoMensaje({...nuevoMensaje, evidencia_url: re.target.result});
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="flex-1 bg-gray-100 border-2 border-dashed border-gray-300 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-blue-500 transition-all"
                      >
                        {nuevoMensaje.evidencia_url ? (
                          <img src={nuevoMensaje.evidencia_url} className="w-full h-20 object-cover rounded-xl p-2" />
                        ) : (
                          <>
                            <Shield size={20} className="text-gray-400" />
                            <span className="text-[9px] font-black text-gray-500">SUBIR IMAGEN</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                <textarea 
                  required rows="4" placeholder="Escribe los detalles aquí..."
                  value={nuevoMensaje.contenido} onChange={e => setNuevoMensaje({...nuevoMensaje, contenido: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none font-medium resize-none"
                ></textarea>
                <button className={`w-full py-5 rounded-2xl font-black text-white text-sm shadow-xl transition-all uppercase tracking-widest ${nuevoMensaje.tipo === 'soporte' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                  {nuevoMensaje.tipo === 'soporte' ? 'ENVIAR A SOPORTE' : 'ENVIAR COMUNICACIÓN'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL IMAGEN EXPANDIDA */}
      <AnimatePresence>
        {imgExpandida && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setImgExpandida(null)}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-10"
          >
             <motion.img 
               initial={{ scale: 0.9 }} animate={{ scale: 1 }}
               src={imgExpandida} className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain border border-white/10" 
             />
             <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-all">
               <X size={48}/>
             </button>
          </motion.div>
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

export default BandejaMensajes;
