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
  const [msgs, setMsgs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [imgExpandida, setImgExpandida] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [respuesta, setRespuesta] = useState({ contenido: '', evidencia_url: '' });

  const cargar = async () => {
    const { data } = await supabase
      .from('mensajes')
      .select(`
        *,
        remitente:remitente_id(username, nombre_completo, rol)
      `)
      .eq('tipo', 'soporte')
      .order('created_at', { ascending: false });

    setMsgs(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!respuesta.contenido.trim()) return;

    try {
      const { error } = await supabase.from('mensajes').insert([{
        remitente_id: currentAdmin.id,
        destinatario_id: replyingTo.remitente_id,
        asunto: `RE: ${replyingTo.asunto}`,
        contenido: respuesta.contenido,
        evidencia_url: respuesta.evidencia_url,
        parent_id: replyingTo.id,
        contexto: replyingTo.contexto,
        tipo: 'normal'
      }]);

      if (error) throw error;
      
      Swal.fire('¡Enviado!', 'La respuesta técnica ha sido enviada al administrador.', 'success');
      setReplyingTo(null);
      setRespuesta({ contenido: '', evidencia_url: '' });
      cargar();
    } catch (err) {
      Swal.fire('Error', 'Fallo al enviar respuesta', 'error');
    }
  };

  if (cargando) return (
    <div className="text-center py-20 animate-pulse text-gray-500 font-black uppercase text-xs">
      Escaneando reportes técnicos...
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 relative">
      {msgs.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/20 rounded-[3rem] border-2 border-dashed border-gray-800">
          <MessageSquare size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="text-gray-500 font-black uppercase text-xs">
            No hay reportes de soporte pendientes
          </p>
        </div>
      ) : (
        msgs.map((m) => (
          <div
            key={m.id}
            className="bg-gray-900/40 border border-gray-800 p-6 md:p-8 rounded-[2.5rem] flex flex-col lg:flex-row gap-6 lg:gap-10 items-start hover:border-gray-600 transition-all group"
          >
            {/* 🖼️ IMAGEN MÁS PEQUEÑA */}
            {m.evidencia_url && (
              <div 
                onClick={() => setImgExpandida(m.evidencia_url)}
                className="w-full lg:w-28 aspect-square rounded-2xl overflow-hidden border border-gray-800 shadow-xl flex-shrink-0 bg-black/40 cursor-zoom-in"
              >
                <img
                  src={m.evidencia_url}
                  alt="evidencia"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            )}

            {/* 📄 CONTENIDO LIMITADO */}
            <div className="flex-1 w-full max-w-2xl">
              
              {/* HEADER */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4">
                <div className="max-w-xl">
                  <h4 className="text-lg md:text-xl font-black text-white mb-1 break-words">
                    {m.asunto}
                  </h4>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest break-words">
                    @{m.remitente?.username} • {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                      m.estado === "abierto"
                        ? "bg-blue-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {m.estado}
                  </span>

                  <button 
                    onClick={() => setReplyingTo(m)}
                    className="bg-gray-800 hover:bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all"
                  >
                    Responder
                  </button>
                </div>
              </div>

              {/* TEXTO CONTROLADO */}
              <p className="text-gray-400 text-sm leading-relaxed bg-black/20 p-4 rounded-2xl border border-gray-800 break-words max-w-xl">
                {m.contenido}
              </p>

              {/* FOOTER */}
              <div className="flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest mt-4">
                <Clock size={12} />
                Sincronizado con Bandeja del Admin
              </div>

            </div>
          </div>
        ))
      )}

      {/* MODAL IMAGEN */}
      <AnimatePresence>
        {imgExpandida && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setImgExpandida(null)}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-10"
          >
             <motion.img 
               initial={{ scale: 0.9 }} animate={{ scale: 1 }}
               src={imgExpandida}
               className="max-w-full max-h-full rounded-3xl shadow-2xl object-contain border border-white/10"
             />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL RESPUESTA (SIN CAMBIOS DE LÓGICA) */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
             <motion.div 
               initial={{ y: 50 }} animate={{ y: 0 }}
               className="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl"
             >
                <div className="bg-blue-600 p-8 text-white relative">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">ENVIAR SOLUCIÓN TÉCNICA</h3>
                  <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Para: @{replyingTo.remitente?.username}</p>
                  <button onClick={() => setReplyingTo(null)} className="absolute top-8 right-8"><X size={24}/></button>
                </div>
                
                <form onSubmit={enviarRespuesta} className="p-8 space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block mb-2 tracking-widest">Respuesta Detallada</label>
                    <textarea 
                      required rows="4"
                      value={respuesta.contenido} onChange={e => setRespuesta({...respuesta, contenido: e.target.value})}
                      placeholder="Explica la solución o los pasos a seguir..."
                      className="w-full bg-black border border-gray-800 rounded-2xl p-4 text-white font-medium outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 block mb-2 tracking-widest">Adjuntar Evidencia Visual (Opcional)</label>
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
                            reader.onload = (re) => setRespuesta({...respuesta, evidencia_url: re.target.result});
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-full bg-gray-950 border-2 border-dashed border-gray-800 rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-blue-600 transition-all group"
                    >
                      {respuesta.evidencia_url ? (
                        <div className="relative">
                          <img src={respuesta.evidencia_url} className="h-24 w-auto rounded-xl shadow-2xl border border-gray-700" />
                          <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1" onClick={(e) => { e.stopPropagation(); setRespuesta({...respuesta, evidencia_url: ''}); }}>
                            <X size={12}/>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload size={24} className="text-gray-600 group-hover:text-blue-500 transition-colors" />
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Subir Imagen de Solución</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl">
                    Sincronizar Solución con Usuario
                  </button>
                </form>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DevTools;
