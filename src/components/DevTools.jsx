import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { 
  Shield, Trash2, Database, AlertTriangle, X, 
  Loader, Download, Upload, FileJson, Users, 
  ChevronRight, Key, Car, Store, Briefcase,
  UserPlus, UserCheck, ShieldCheck, Edit2, Eye, Clock,
  LayoutGrid, MessageSquare, ShieldAlert
} from 'lucide-react';
import { getAdmins, createAdmin, deleteAdmin, updateAdmin } from '../services/authService';
import Swal from 'sweetalert2';

const DevTools = ({ onClose, currentAdmin, onAction }) => {
  const [cargando, setCargando] = useState(false);
  const [activeTab, setActiveTab] = useState('admins'); 
  const [adminsList, setAdminsList] = useState([]);
  const [modo, setModo] = useState('lista'); 
  const [usuarioSel, setUsuarioSel] = useState(null);
  const [subRolEmpleado, setSubRolEmpleado] = useState('parqueo'); // parqueo, informales, ambos
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rol: 'ambos',
    nombre_completo: '',
    foto_perfil: ''
  });

  useEffect(() => {
    cargarAdmins();
  }, []);

  const cargarAdmins = async () => {
    const res = await getAdmins(currentAdmin);
    if (res.success) setAdminsList(res.data);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setCargando(true);
    
    // Preparar el rol final si es empleado
    let rolFinal = formData.rol;
    if (formData.rol === 'empleado') {
      rolFinal = `empleado_${subRolEmpleado}`;
    }

    try {
      if (modo === 'crear') {
        const res = await createAdmin({ ...formData, rol: rolFinal });
        if (res.success) {
          Swal.fire('¡Éxito!', 'Cuenta creada correctamente', 'success');
          setModo('lista');
          cargarAdmins();
          if (onAction) onAction();
        } else {
          Swal.fire('Error', res.message, 'error');
        }
      } else {
        const res = await updateAdmin(usuarioSel.id, { ...formData, rol: rolFinal });
        if (res.success) {
          Swal.fire('¡Actualizado!', 'Datos sincronizados', 'success');
          setModo('lista');
          cargarAdmins();
          if (onAction) onAction();
        }
      }
    } catch (err) {
      Swal.fire('Error', 'Fallo en la operación', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = async (id, name) => {
    const res = await Swal.fire({
      title: `¿Borrar cuenta ${name}?`,
      text: 'Acción irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444'
    });
    if (res.isConfirmed) {
      setCargando(true);
      await deleteAdmin(id);
      cargarAdmins();
      if (onAction) onAction();
      setCargando(false);
    }
  };

  const rolesConfig = [
    { id: 'parqueadero', label: 'Admin Parqueo', icon: Car, desc: 'Gestor de vehículos' },
    { id: 'informales', label: 'Admin Informales', icon: Store, desc: 'Gestor de locales' },
    { id: 'ambos', label: 'Admin Master', icon: ShieldCheck, desc: 'Acceso total' },
    { id: 'empleado', label: 'Empleado', icon: Briefcase, desc: 'Personal operativo' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-2xl">
      <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} className="bg-gray-950 rounded-[3rem] shadow-2xl w-full max-w-7xl h-[92vh] overflow-hidden border border-gray-800/50 flex">
        
        {/* SIDEBAR */}
        <div className="w-80 bg-gray-900/50 border-r border-gray-800 p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
              <Shield className="text-white" size={24}/>
            </div>
            <span className="text-white font-black text-xl tracking-tighter">DEV CONSOLE</span>
          </div>

          <div className="flex-1 space-y-3">
            {[
              { id: 'admins', icon: Users, label: 'Usuarios Master' },
              { id: 'support', icon: MessageSquare, label: 'Soporte Técnico' },
              { id: 'backup', icon: FileJson, label: 'Respaldo JSON' },
              { id: 'reset', icon: AlertTriangle, label: 'Reinicio Maestro' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setModo('lista'); }}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-black transition-all ${
                  activeTab === t.id ? 'bg-blue-600 text-white shadow-2xl shadow-blue-900/40' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <t.icon size={20}/>
                  {t.label}
                </div>
                {activeTab === t.id && <ChevronRight size={16}/>}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="mt-auto text-red-500 hover:bg-red-500/10 py-4 rounded-2xl flex justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all">
            <X size={18}/> Cerrar Panel
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-950 to-gray-900">
          <div className="px-12 py-10 border-b border-gray-800/50 flex justify-between items-end">
            <div>
              <h2 className="text-5xl font-black text-white tracking-tighter">Gestión <span className="text-blue-500">Master</span></h2>
              <p className="text-gray-500 text-sm mt-2 font-medium">Define accesos y roles con precisión quirúrgica</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 md:px-12 py-10 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'admins' && (
                <motion.div key="admins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-white">Cuentas en el Servidor</h3>
                    {modo === 'lista' && (
                      <button 
                        onClick={() => { setModo('crear'); setFormData({ username: '', password: '', rol: 'ambos', nombre_completo: '', foto_perfil: '' }); }}
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
                      >
                        <UserPlus size={18}/> REGISTRAR NUEVO ACCESO
                      </button>
                    )}
                    {modo !== 'lista' && (
                      <button onClick={() => setModo('lista')} className="text-gray-400 hover:text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                        <X size={18}/> Volver al Listado
                      </button>
                    )}
                  </div>

                  {modo === 'lista' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {adminsList.map(u => (
                        <div key={u.id} className="bg-gray-900/30 border border-gray-800 rounded-[2.5rem] p-6 hover:border-gray-600 transition-all">
                          <div className="flex items-center gap-4 mb-6">
                            <img src={u.foto_perfil || `https://ui-avatars.com/api/?name=${u.username}`} className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-800" />
                            <div>
                              <p className="text-white font-black text-lg">@{u.username}</p>
                              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">
                                {u.rol === 'ambos' ? 'Admin Master' : 
                                 u.rol === 'parqueadero' ? 'Admin Parqueo' : 
                                 u.rol === 'informales' ? 'Admin Informales' : 
                                 u.rol?.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => { setModo('editar'); setUsuarioSel(u); setFormData({...u, password: ''}); if(u.rol.includes('_')) setSubRolEmpleado(u.rol.split('_')[1]); }}
                              className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all"
                            >
                              <Edit2 size={14} className="inline mr-2"/> Editar
                            </button>
                            <button onClick={() => handleDelete(u.id, u.username)} className="bg-red-500/10 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleCreateOrUpdate} className="bg-gray-900/40 p-10 rounded-[3rem] border border-gray-800/50 space-y-8 max-w-4xl mx-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-2 block tracking-widest">Usuario de Acceso</label>
                          <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-2 block tracking-widest">Contraseña</label>
                          <input type="password" required={modo === 'crear'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-2 block tracking-widest">Nombre Real</label>
                          <input required value={formData.nombre_completo} onChange={e => setFormData({...formData, nombre_completo: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>

                        {/* FOTO DE PERFIL */}
                        <div className="md:col-span-2 space-y-4">
                          <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block tracking-widest">Avatar / Foto de Perfil</label>
                          <div className="flex flex-col md:flex-row gap-4 items-center">
                            <img 
                              src={formData.foto_perfil || `https://ui-avatars.com/api/?name=${formData.username || 'U'}`} 
                              className="w-24 h-24 rounded-3xl object-cover border-2 border-gray-800"
                            />
                            <div className="flex-1 w-full space-y-2">
                              <div className="flex gap-2">
                                <button 
                                  type="button"
                                  onClick={() => document.getElementById('dev-foto-file').click()}
                                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-800 transition-all"
                                >
                                  Subir Archivo
                                </button>
                                <button 
                                  type="button"
                                  onClick={async () => {
                                    setShowCamera(true);
                                    try {
                                      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                                      videoRef.current.srcObject = stream;
                                    } catch (err) {
                                      Swal.fire('Error', 'No se puede acceder a la cámara', 'error');
                                      setShowCamera(false);
                                    }
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                  Usar Cámara
                                </button>
                              </div>
                              <input 
                                type="url" 
                                placeholder="O pega una URL de imagen..."
                                value={formData.foto_perfil} 
                                onChange={(e) => setFormData({...formData, foto_perfil: e.target.value})} 
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <input 
                            type="file" id="dev-foto-file" className="hidden" accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (re) => setFormData({...formData, foto_perfil: re.target.result});
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {showCamera && (
                        <div className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center p-4">
                          <div className="relative w-full max-w-md aspect-video bg-gray-900 rounded-3xl overflow-hidden border-4 border-white/20">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                          </div>
                          <div className="flex gap-4 mt-8">
                            <button 
                              type="button"
                              onClick={() => {
                                const video = videoRef.current;
                                const canvas = canvasRef.current;
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                canvas.getContext('2d').drawImage(video, 0, 0);
                                const photo = canvas.toDataURL('image/jpeg');
                                setFormData({...formData, foto_perfil: photo});
                                video.srcObject.getTracks().forEach(t => t.stop());
                                setShowCamera(false);
                              }}
                              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
                            >
                              Capturar Foto
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
                                setShowCamera(false);
                              }}
                              className="bg-red-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block tracking-widest">Nivel de Autorización:</label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {rolesConfig.map(r => (
                            <div 
                              key={r.id} onClick={() => setFormData({...formData, rol: r.id})}
                              className={`cursor-pointer p-6 rounded-3xl border-2 transition-all text-center space-y-2 ${formData.rol === r.id ? 'bg-blue-600/20 border-blue-500' : 'bg-gray-950 border-gray-800 hover:border-gray-700'}`}
                            >
                              <r.icon size={24} className={`mx-auto ${formData.rol === r.id ? 'text-white' : 'text-gray-500'}`}/>
                              <p className={`font-black text-[9px] uppercase ${formData.rol === r.id ? 'text-white' : 'text-gray-500'}`}>{r.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SUB-SELECTOR PARA EMPLEADOS */}
                      {formData.rol === 'empleado' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-blue-600/5 p-8 rounded-[2rem] border border-blue-500/20 space-y-4">
                          <label className="text-[10px] font-black text-blue-400 uppercase ml-2 block tracking-widest text-center">¿A qué gestor pertenece este empleado?</label>
                          <div className="flex justify-center gap-4">
                            {[
                              { id: 'parqueo', label: 'PARQUEO', icon: Car },
                              { id: 'informales', label: 'INFORMALES', icon: Store },
                              { id: 'ambos', label: 'GESTIÓN MIXTA', icon: LayoutGrid }
                            ].map(s => (
                              <button
                                key={s.id} type="button" onClick={() => setSubRolEmpleado(s.id)}
                                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${subRolEmpleado === s.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}
                              >
                                <s.icon size={20}/>
                                <span className="text-[9px] font-black uppercase">{s.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      <button className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[1.5rem] font-black text-white text-lg transition-all shadow-2xl">
                        {modo === 'crear' ? 'CONFIRMAR REGISTRO' : 'GUARDAR CAMBIOS TÉCNICOS'}
                      </button>
                    </form>
                  )}
                </motion.div>
              )}
              {activeTab === 'support' && (
                <motion.div key="support" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Reportes de Soporte</h3>
                    <div className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                      Mensajes Directos para Lord Chriz
                    </div>
                  </div>

                  <SupportView currentAdmin={currentAdmin} />
                </motion.div>
              )}
              {activeTab === 'backup' && (
                <motion.div key="backup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center space-y-12 py-20">
                  <div className="bg-blue-500/10 p-10 rounded-[4rem] border-2 border-dashed border-blue-500/20">
                    <FileJson size={120} className="text-blue-500" />
                  </div>
                  
                  <div className="max-w-2xl space-y-4">
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter">CENTRO DE RESPALDO UNIVERSAL</h3>
                    <p className="text-gray-500 text-lg">
                      Genera una copia íntegra de la base de datos en formato JSON para migraciones o seguridad. 
                      También puedes restaurar estados anteriores cargando un archivo previo.
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
                    {/* EXPORTAR */}
                    <button 
                      onClick={async () => {
                        setCargando(true);
                        try {
                          const tables = ['registros_parqueadero', 'negocios_informales', 'mensajes', 'evidencias', 'lista_negra', 'configuracion', 'admins'];
                          const backupData = {};
                          for (const table of tables) {
                            try {
                              const { data, error } = await supabase.from(table).select('*');
                              if (error) {
                                // Si la tabla no existe, simplemente la saltamos
                                if (error.code === 'PGRST116' || error.message.includes('not found')) {
                                  console.warn(`Tabla ${table} no encontrada en el esquema.`);
                                  continue;
                                }
                                throw error;
                              }
                              backupData[table] = data;
                            } catch (tableErr) {
                              console.error(`Error procesando tabla ${table}:`, tableErr);
                            }
                          }
                          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `backup_uparqueo_${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                          Swal.fire('¡Generado!', 'Descarga iniciada con éxito', 'success');
                        } catch (err) {
                          Swal.fire('Error', 'Fallo al exportar: ' + err.message, 'error');
                        } finally {
                          setCargando(false);
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-10 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all shadow-2xl shadow-blue-900/20"
                    >
                      <Download size={40} />
                      <div className="text-center">
                        <p className="font-black text-lg">EXPORTAR</p>
                        <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Generar .JSON</p>
                      </div>
                    </button>

                    {/* IMPORTAR */}
                    <label className="flex-1 cursor-pointer">
                      <input 
                        type="file" accept=".json" className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const backupData = JSON.parse(event.target.result);
                              const confirm = await Swal.fire({
                                title: '¿RESTAURAR DATOS?',
                                text: 'Se sincronizarán las tablas con la información del archivo. Las cuentas existentes se actualizarán.',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'INICIAR RESTAURACIÓN',
                                confirmButtonColor: '#3B82F6'
                              });

                              if (confirm.isConfirmed) {
                                setCargando(true);
                                for (const table in backupData) {
                                  if (backupData[table] && backupData[table].length > 0) {
                                    // Limpiar nulos o IDs inválidos si fuera necesario, aquí usamos upsert directo
                                    const { error } = await supabase.from(table).upsert(backupData[table]);
                                    if (error) console.error(`Error en ${table}:`, error);
                                  }
                                }
                                Swal.fire('¡Sincronizado!', 'La base de datos ha sido restaurada.', 'success');
                                cargarAdmins();
                              }
                            } catch (err) {
                              Swal.fire('Error', 'Archivo JSON corrupto o incompatible.', 'error');
                            } finally {
                              setCargando(false);
                              e.target.value = '';
                            }
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <div className="h-full bg-gray-900 border-2 border-dashed border-gray-800 hover:border-blue-500 text-white p-10 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all">
                        <Upload size={40} className="text-gray-500" />
                        <div className="text-center">
                          <p className="font-black text-lg text-gray-400">IMPORTAR</p>
                          <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest text-gray-500">Cargar .JSON</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </motion.div>
              )}
              {activeTab === 'reset' && (
                <motion.div key="reset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center space-y-10 py-20">
                  <div className="bg-red-500/10 p-10 rounded-[4rem] border-2 border-dashed border-red-500/20">
                    <AlertTriangle size={120} className="text-red-500 animate-pulse" />
                  </div>
                  <div className="max-w-2xl">
                    <h3 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">PROTOCOLO DE DESTRUCCIÓN DE DATOS</h3>
                    <p className="text-gray-500 text-lg">
                      Esta función limpia las bases de datos operativas. Puedes borrar secciones específicas o ejecutar una limpieza total. <br/>
                      <span className="text-red-500 font-bold uppercase tracking-widest text-xs">Las cuentas de administrador (excepto la tuya) pueden ser eliminadas.</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                    {[
                      { id: 'parqueadero', label: 'PARQUEO', icon: Car, tables: ['registros_parqueadero', 'registros_parqueo'] },
                      { id: 'informales', label: 'INFORMALES', icon: Store, tables: ['negocios_informales'] },
                      { id: 'mensajes', label: 'MENSAJES', icon: MessageSquare, tables: ['mensajes'] },
                      { id: 'evidencias', label: 'EVIDENCIAS', icon: Eye, tables: ['evidencias'] },
                      { id: 'lista_negra', label: 'LISTA NEGRA', icon: ShieldAlert, tables: ['lista_negra'] },
                      { id: 'admins', label: 'CUENTAS', icon: Users, tables: ['admins'] }
                    ].map(s => (
                      <button 
                        key={s.id}
                        onClick={async () => {
                          const confirm = await Swal.fire({
                            title: `¿Limpiar ${s.label}?`,
                            text: s.id === 'admins' ? 'Se borrarán todas las cuentas EXCEPTO la tuya actual.' : `Se borrarán permanentemente todos los datos de esta sección.`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#EF4444',
                            confirmButtonText: 'SÍ, BORRAR SECCIÓN'
                          });
                          if (confirm.isConfirmed) {
                            setCargando(true);
                            try {
                              for (const t of s.tables) {
                                if (t === 'admins') {
                                  // Antes de borrar admins, limpiar referencias para evitar errores de FK
                                  const { data: adminsToDelete } = await supabase
                                    .from('admins')
                                    .select('id')
                                    .neq('id', currentAdmin?.id || '00000000-0000-0000-0000-000000000000');
                                  
                                  if (adminsToDelete?.length > 0) {
                                    const ids = adminsToDelete.map(a => a.id);
                                    await supabase.from('mensajes').delete().or(`remitente_id.in.(${ids}),destinatario_id.in.(${ids})`);
                                    await supabase.from('evidencias').delete().in('subido_por', ids);
                                  }

                                  await supabase.from(t).delete().neq('id', currentAdmin?.id || '00000000-0000-0000-0000-000000000000');
                                } else {
                                  await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                }
                              }
                              Swal.fire('Sección Limpia', `Los datos de ${s.label} han sido eliminados.`, 'success');
                              if (s.id === 'admins') cargarAdmins();
                              if (onAction) onAction();
                            } catch (e) {
                              Swal.fire('Error', 'Fallo al borrar sección', 'error');
                            } finally {
                              setCargando(false);
                            }
                          }
                        }}
                        className="bg-gray-900 border border-gray-800 p-8 rounded-[2rem] flex flex-col items-center gap-3 hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
                      >
                        <s.icon size={32} className="text-gray-500 group-hover:text-red-500 transition-colors" />
                        <span className="font-black text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-white">{s.label}</span>
                      </button>
                    ))}

                    <button 
                      onClick={async () => {
                        const confirm = await Swal.fire({
                          title: '¿REINICIAR TODO EL SISTEMA?',
                          text: 'Se borrarán todos los registros operativos. Esta acción NO se puede deshacer.',
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#EF4444',
                          confirmButtonText: 'SÍ, BORRAR TODO',
                          cancelButtonText: 'CANCELAR'
                        });
  
                        if (confirm.isConfirmed) {
                          const doubleCheck = await Swal.fire({
                            title: 'CONFIRMACIÓN FINAL',
                            text: 'Escribe "BORRAR TODO" para confirmar la destrucción de datos.',
                            input: 'text',
                            inputValidator: (value) => {
                              if (value !== 'BORRAR TODO') return 'Debes escribir la frase exacta';
                            },
                            showCancelButton: true,
                            confirmButtonColor: '#EF4444',
                            confirmButtonText: 'DESTRUIR DATOS'
                          });
  
                          if (doubleCheck.isConfirmed) {
                            setCargando(true);
                            try {
                              const tables = ['registros_parqueadero', 'registros_parqueo', 'negocios_informales', 'mensajes', 'evidencias', 'lista_negra', 'admins'];
                              for (const table of tables) {
                                try {
                                  if (table === 'admins') {
                                    await supabase.from(table).delete().neq('id', currentAdmin?.id || '00000000-0000-0000-0000-000000000000');
                                  } else {
                                    await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                  }
                                } catch (e) {
                                  console.warn(`No se pudo limpiar la tabla ${table}:`, e.message);
                                }
                              }
                              Swal.fire('Sistema Reiniciado', 'Todos los datos operativos y cuentas (excepto la tuya) han sido eliminados.', 'success');
                              cargarAdmins();
                            } catch (err) {
                              Swal.fire('Error', 'No se pudieron borrar todas las tablas', 'error');
                            } finally {
                              setCargando(false);
                            }
                          }
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white p-8 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-2xl shadow-red-900/40 transition-all active:scale-95"
                    >
                      <Trash2 size={32}/>
                      <span className="font-black text-[10px] uppercase tracking-widest">LIMPIEZA TOTAL</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {cargando && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center z-[300]">
            <Loader className="animate-spin text-blue-500 mb-6" size={80} />
            <p className="text-white font-black text-xl tracking-[0.4em] uppercase">Sincronizando...</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const SupportView = ({ currentAdmin }) => {
  const [mensajesHistorial, setMensajesHistorial] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [respuesta, setRespuesta] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [imgExpandida, setImgExpandida] = useState(null);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajesHistorial, usuarioSeleccionado]);

  const cargarDatos = async () => {
    setCargando(true);
    // Cargar usuarios
    const { data: users } = await supabase.from('admins').select('id, username, rol, nombre_completo, foto_perfil');
    setUsuarios(users || []);

    // Cargar todos los mensajes (Lord Chriz ve todo)
    const { data: msgs } = await supabase
      .from('mensajes')
      .select(`
        *,
        remitente:remitente_id(id, username, rol, nombre_completo),
        destinatario:destinatario_id(id, username, rol, nombre_completo)
      `)
      .order('created_at', { ascending: true });

    setMensajesHistorial(msgs || []);
    setCargando(false);
  };

  const enviarMensaje = async (e) => {
    if (e) e.preventDefault();
    if (!respuesta.trim() && !evidenciaUrl) return;

    try {
      const nuevoMsj = {
        remitente_id: currentAdmin.id,
        destinatario_id: usuarioSeleccionado.id,
        asunto: 'Soporte Lord Chriz',
        contenido: respuesta,
        evidencia_url: evidenciaUrl,
        contexto: 'soporte',
        tipo: 'soporte',
        estado: 'abierto'
      };

      const { data, error } = await supabase.from('mensajes').insert([nuevoMsj]).select().single();
      if (error) throw error;

      setRespuesta('');
      setEvidenciaUrl('');
      setMensajesHistorial([...mensajesHistorial, { ...data, remitente: currentAdmin, destinatario: usuarioSeleccionado }]);
    } catch (error) {
      Swal.fire('Error', 'No se pudo enviar la respuesta.', 'error');
    }
  };

  const abrirChat = async (contacto) => {
    setUsuarioSeleccionado(contacto);
  };

  const contactosFiltrados = usuarios
    .filter(u => u.id !== currentAdmin.id && (u.username.toLowerCase().includes(busqueda.toLowerCase()) || u.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())))
    .sort((a, b) => {
      // Ordenar por los que tienen mensajes más recientes
      const msjsA = mensajesHistorial.filter(m => m.remitente_id === a.id || m.destinatario_id === a.id);
      const msjsB = mensajesHistorial.filter(m => m.remitente_id === b.id || m.destinatario_id === b.id);
      const lastA = msjsA.length > 0 ? new Date(msjsA[msjsA.length - 1].created_at).getTime() : 0;
      const lastB = msjsB.length > 0 ? new Date(msjsB[msjsB.length - 1].created_at).getTime() : 0;
      return lastB - lastA;
    });

  const mensajesChat = usuarioSeleccionado 
    ? mensajesHistorial.filter(m => 
        (m.remitente_id === currentAdmin.id && m.destinatario_id === usuarioSeleccionado.id) ||
        (m.remitente_id === usuarioSeleccionado.id && m.destinatario_id === currentAdmin.id)
      )
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] p-2 md:p-6 bg-gray-950">
      
      <div className="flex flex-1 gap-4 md:gap-6 overflow-hidden min-h-0">
        
        {/* PANEL IZQUIERDO: CONTACTOS SOPORTE */}
        <div className={`w-full md:w-[320px] lg:w-[350px] flex-shrink-0 bg-gray-900 rounded-[2rem] border border-gray-800 flex flex-col overflow-hidden ${usuarioSeleccionado ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-white font-black uppercase mb-4 tracking-tighter flex items-center gap-2">
              <Shield size={20} className="text-blue-500"/>
              Tickets & Chats
            </h3>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-gray-500" size={16}/>
              </div>
              <input 
                type="text" placeholder="Buscar empleado..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {cargando ? (
              <div className="p-10 text-center text-gray-500 font-black animate-pulse text-[10px] uppercase">Cargando...</div>
            ) : contactosFiltrados.map((u) => {
              const msjsConUsuario = mensajesHistorial.filter(m => (m.remitente_id === u.id && m.destinatario_id === currentAdmin.id) || (m.remitente_id === currentAdmin.id && m.destinatario_id === u.id));
              const ultimoMsj = msjsConUsuario.length > 0 ? msjsConUsuario[msjsConUsuario.length - 1] : null;

              return (
                <div 
                  key={u.id} onClick={() => abrirChat(u)}
                  className={`p-4 border-b border-gray-800/50 cursor-pointer transition-all flex items-center gap-3 hover:bg-gray-800/50 ${usuarioSeleccionado?.id === u.id ? 'bg-blue-900/20 border-r-4 border-r-blue-500' : ''}`}
                >
                  <img src={u.foto_perfil || `https://ui-avatars.com/api/?name=${u.username}&background=random`} className="w-10 h-10 rounded-full object-cover border border-gray-700" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-black text-gray-200 text-xs truncate">{u.username}</h4>
                      {ultimoMsj && <span className="text-[9px] text-gray-500 font-bold">{new Date(ultimoMsj.created_at).toLocaleDateString()}</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate font-medium">
                      {ultimoMsj ? (ultimoMsj.remitente_id === currentAdmin.id ? `Lord: ${ultimoMsj.contenido || '📷'}` : ultimoMsj.contenido || '📷 Foto') : 'Iniciar chat'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: CHAT SOPORTE */}
        <div className={`flex-1 min-w-0 bg-gray-900 rounded-[2rem] border border-gray-800 flex flex-col overflow-hidden ${usuarioSeleccionado ? 'flex' : 'hidden md:flex'}`}>
          {usuarioSeleccionado ? (
            <>
              {/* HEADER CHAT */}
              <div className="p-4 border-b border-gray-800 flex items-center gap-3 bg-gray-950">
                <button 
                  onClick={() => setUsuarioSeleccionado(null)} 
                  className="md:hidden p-2 bg-gray-800 rounded-lg text-gray-400"
                >
                  <ArrowLeft size={16}/>
                </button>
                <img src={usuarioSeleccionado.foto_perfil || `https://ui-avatars.com/api/?name=${usuarioSeleccionado.username}`} className="w-8 h-8 rounded-full border border-gray-700" />
                <div>
                  <h3 className="font-black text-sm text-gray-200 leading-none">{usuarioSeleccionado.username}</h3>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Soporte Técnico</p>
                </div>
              </div>

              {/* MENSAJES */}
              <div ref={scrollRef} className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {mensajesChat.map(m => {
                  const isMe = m.remitente_id === currentAdmin.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 md:p-4 rounded-2xl md:rounded-3xl relative ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-gray-800 border border-gray-700 rounded-bl-sm text-gray-200'
                      }`}>
                        {m.evidencia_url && (
                          <div className="relative group cursor-zoom-in mb-2" onClick={() => setImgExpandida(m.evidencia_url)}>
                            <img src={m.evidencia_url} className="w-full max-h-48 object-cover rounded-xl border border-black/20" />
                          </div>
                        )}
                        {m.contenido && <p className="text-xs md:text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.contenido}</p>}
                        <p className={`text-[9px] mt-1 text-right font-bold ${isMe ? 'opacity-60 text-blue-100' : 'opacity-40 text-gray-500'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* INPUT */}
              <div className="p-4 border-t border-gray-800 bg-gray-950">
                {evidenciaUrl && (
                  <div className="mb-3 relative inline-block">
                    <img src={evidenciaUrl} className="h-16 w-auto rounded-lg border border-gray-700" />
                    <button onClick={() => setEvidenciaUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={10}/></button>
                  </div>
                )}
                <form onSubmit={enviarMensaje} className="flex gap-2 md:gap-3 items-end">
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
                          reader.onload = (re) => setEvidenciaUrl(re.target.result);
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className={`p-3 md:p-4 rounded-xl transition-all ${evidenciaUrl ? 'bg-blue-900 text-blue-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  >
                    <Upload size={18}/>
                  </button>

                  <textarea 
                    placeholder="Respuesta técnica..."
                    rows="1"
                    value={respuesta} 
                    onChange={e => setRespuesta(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        enviarMensaje();
                      }
                    }}
                    className="flex-1 min-w-0 bg-gray-900 border border-gray-800 text-white rounded-xl md:rounded-2xl px-4 py-3.5 text-xs md:text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none max-h-32 custom-scrollbar"
                  />
                  
                  <button 
                    type="submit" 
                    disabled={!respuesta.trim() && !evidenciaUrl}
                    className="flex-shrink-0 bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white p-3 md:p-4 rounded-xl md:rounded-2xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send size={18}/>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-10 text-center">
              <MessageSquare size={48} className="mb-4 opacity-50" />
              <h4 className="font-black text-lg uppercase tracking-tighter">Soporte Técnico</h4>
              <p className="font-bold text-[10px] uppercase tracking-widest mt-2">Selecciona un empleado para chatear</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {imgExpandida && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setImgExpandida(null)}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-10"
          >
             <motion.img 
               initial={{ scale: 0.9 }} animate={{ scale: 1 }}
               src={imgExpandida} className="max-w-full max-h-full rounded-3xl object-contain" 
             />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevTools;
