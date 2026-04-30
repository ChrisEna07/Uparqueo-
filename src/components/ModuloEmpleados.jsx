import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Trash2, Shield, 
  Key, Mail, Loader2, AlertCircle,
  CheckCircle, User, Edit2, Eye, EyeOff, X,
  Briefcase, Calendar, Fingerprint,
  Car, Store, ShieldCheck, LayoutGrid, Camera, Image as ImageIcon
} from 'lucide-react';
import { getAdmins, createAdmin, deleteAdmin, updateAdmin } from '../services/authService';
import Swal from 'sweetalert2';

const ModuloEmpleados = ({ admin, selectedModule, refreshKey }) => {
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modo, setModo] = useState('crear'); // crear, editar, detalles
  const [usuarioSel, setUsuarioSel] = useState(null);
  const [subRolEmpleado, setSubRolEmpleado] = useState('parqueo'); // parqueo, informales, ambos
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [form, setForm] = useState({
    username: '',
    password: '',
    rol: 'parqueadero',
    nombre_completo: '',
    foto_perfil: ''
  });

  const rolesConfig = [
    { id: 'parqueadero', label: 'Admin Parqueo', icon: Car, desc: 'Solo vehículos' },
    { id: 'informales', label: 'Admin Informales', icon: Store, desc: 'Solo locales' },
    { id: 'ambos', label: 'Admin Master', icon: ShieldCheck, desc: 'Acceso total' },
    { id: 'empleado', label: 'Empleado', icon: Briefcase, desc: 'Personal operativo' }
  ];

  useEffect(() => {
    cargarEmpleados();
  }, [refreshKey]);

  const cargarEmpleados = async () => {
    setCargando(true);
    try {
      const res = await getAdmins(admin, selectedModule, false);
      if (res.success) {
        setEmpleados(res.data);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => {
    const isAdminMaster = admin?.rol === 'ambos' || admin?.rol === 'admin_master';
    setForm({ 
      username: '', password: '', 
      rol: isAdminMaster ? 'parqueadero' : 'empleado', 
      nombre_completo: '', foto_perfil: '' 
    });
    setUsuarioSel(null);
  };

  const handleOpenModal = (tipo, usuario = null) => {
    setModo(tipo);
    const isAdminMaster = admin?.rol === 'ambos' || admin?.rol === 'admin_master';
    
    if (usuario) {
      setUsuarioSel(usuario);
      const isSubRole = usuario.rol.includes('_');
      setForm({
        username: usuario.username || '',
        password: '',
        rol: isSubRole ? 'empleado' : usuario.rol,
        nombre_completo: usuario.nombre_completo || '',
        foto_perfil: usuario.foto_perfil || ''
      });
      if (isSubRole) setSubRolEmpleado(usuario.rol.split('_')[1]);
    } else {
      resetForm();
      if (!isAdminMaster) {
        if (admin?.rol === 'parqueadero') setSubRolEmpleado('parqueo');
        if (admin?.rol === 'informales') setSubRolEmpleado('informales');
      } else {
        if (selectedModule === 'parqueadero') setSubRolEmpleado('parqueo');
        if (selectedModule === 'informales') setSubRolEmpleado('informales');
      }
    }
    setMostrarModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    let rolFinal = form.rol;
    if (form.rol === 'empleado') {
      rolFinal = `empleado_${subRolEmpleado}`;
    }

    try {
      if (modo === 'crear') {
        const res = await createAdmin({ ...form, rol: rolFinal });
        if (res.success) {
          Swal.fire('¡Éxito!', 'Empleado registrado correctamente', 'success');
          setMostrarModal(false);
          cargarEmpleados();
        } else {
          Swal.fire('Error', res.message, 'error');
        }
      } else if (modo === 'editar') {
        const dataUpdate = { ...form, rol: rolFinal };
        if (!dataUpdate.password) delete dataUpdate.password;
        const res = await updateAdmin(usuarioSel.id, dataUpdate);
        if (res.success) {
          Swal.fire('¡Actualizado!', 'Datos guardados', 'success');
          setMostrarModal(false);
          cargarEmpleados();
        }
      }
    } catch (error) {
      Swal.fire('Error', 'Operación fallida', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar cuenta?',
      text: 'Acción irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444'
    });
    if (result.isConfirmed) {
      const res = await deleteAdmin(id);
      if (res.success) {
        Swal.fire('Eliminado', '', 'success');
        cargarEmpleados();
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
        <div>
          <h2 className="text-4xl font-black text-gray-800 flex items-center gap-4">
            <Users className="text-indigo-600" size={40} /> Gestión de Personal
          </h2>
          <p className="text-gray-500 font-medium">Administra las cuentas de tu equipo ({admin?.rol})</p>
        </div>
        <button 
          onClick={() => handleOpenModal('crear')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-2 shadow-xl shadow-indigo-200 transition-all active:scale-95"
        >
          <UserPlus size={20} /> Registrar Nuevo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cargando ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center text-gray-300 uppercase tracking-widest font-black">
            <Loader2 className="animate-spin mb-4" size={48} />
            Sincronizando...
          </div>
        ) : (
          empleados.map((emp) => (
            <motion.div 
              layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={emp.id}
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all overflow-hidden group"
            >
              <div className="p-8">
                <div className="flex items-center gap-5 mb-8">
                  <img 
                    src={emp.foto_perfil || "https://ui-avatars.com/api/?name=" + emp.username} 
                    className="w-20 h-20 rounded-3xl object-cover border-4 border-gray-50 shadow-md"
                  />
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-xl leading-tight truncate">@{emp.username}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">
                        {emp.rol === 'ambos' ? 'Admin Master' : 
                         emp.rol === 'parqueadero' ? 'Admin Parqueo' : 
                         emp.rol === 'informales' ? 'Admin Informales' : 
                         emp.rol?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-widest">Nombre</span>
                    <span className="text-gray-800 font-black truncate max-w-[150px]">{emp.nombre_completo || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase tracking-widest">Ingreso</span>
                    <span className="text-gray-800 font-black">{new Date(emp.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleOpenModal('detalles', emp)}
                    className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-black active:scale-95"
                  >
                    Ver Ficha
                  </button>
                  <button onClick={() => handleOpenModal('editar', emp)} className="p-4 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-2xl transition-all">
                    <Edit2 size={20} />
                  </button>
                  <button onClick={() => handleEliminar(emp.id)} className="p-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {mostrarModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="bg-indigo-600 p-10 text-white relative">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                    {modo === 'crear' ? <UserPlus size={32}/> : modo === 'editar' ? <Edit2 size={32}/> : <Fingerprint size={32}/>}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter">
                      {modo === 'crear' ? 'Registrar Personal' : modo === 'editar' ? 'Editar Acceso' : 'Ficha Técnica'}
                    </h3>
                  </div>
                </div>
                <button onClick={() => setMostrarModal(false)} className="absolute top-10 right-10 hover:rotate-90 transition-transform"><X size={28}/></button>
              </div>

              {modo === 'detalles' ? (
                <div className="p-10 space-y-8">
                  <div className="flex justify-center">
                    <img src={usuarioSel?.foto_perfil || "https://ui-avatars.com/api/?name=" + usuarioSel?.username} className="w-32 h-32 rounded-[2.5rem] object-cover border-8 border-gray-50 shadow-2xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { l: 'Nombre Completo', v: usuarioSel?.nombre_completo || 'N/A' },
                      { l: 'Usuario', v: `@${usuarioSel?.username}` },
                      { l: 'Rol Operativo', v: (usuarioSel?.rol === 'ambos' ? 'Admin Master' : 
                                               usuarioSel?.rol === 'parqueadero' ? 'Admin Parqueo' : 
                                               usuarioSel?.rol === 'informales' ? 'Admin Informales' : 
                                               usuarioSel?.rol?.replace('_', ' ')).toUpperCase() },
                      { l: 'Fecha de Alta', v: new Date(usuarioSel?.created_at).toLocaleDateString() }
                    ].map(d => (
                      <div key={d.l} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-[10px] uppercase font-black text-gray-400 mb-1">{d.l}</p>
                        <p className="font-black text-gray-800">{d.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Usuario</label>
                      <input 
                        type="text" required value={form.username}
                        onChange={(e) => setForm({...form, username: e.target.value.toLowerCase()})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Clave {modo === 'editar' && '(Opcional)'}</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showPassword ? "text" : "password"} required={modo === 'crear'} value={form.password}
                          onChange={(e) => setForm({...form, password: e.target.value})}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold pr-12"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">Nombre Real</label>
                      <input 
                        type="text" required value={form.nombre_completo}
                        onChange={(e) => setForm({...form, nombre_completo: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-2 block tracking-widest">Foto de Perfil</label>
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                        <img 
                          src={form.foto_perfil || "https://ui-avatars.com/api/?name=" + form.username} 
                          className="w-24 h-24 rounded-3xl object-cover border-4 border-gray-50 shadow-md"
                        />
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => document.getElementById('emp-foto-file').click()}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 transition-all"
                            >
                              Elegir Archivo
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
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              Cámara
                            </button>
                          </div>
                          <input 
                            type="url" 
                            placeholder="O pega una URL de imagen..."
                            value={form.foto_perfil} 
                            onChange={(e) => setForm({...form, foto_perfil: e.target.value})} 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-xs" 
                          />
                        </div>
                      </div>
                      <input 
                        type="file" id="emp-foto-file" className="hidden" accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (re) => setForm({...form, foto_perfil: re.target.result});
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {showCamera && (
                    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4">
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
                            setForm({...form, foto_perfil: photo});
                            video.srcObject.getTracks().forEach(t => t.stop());
                            setShowCamera(false);
                          }}
                          className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
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

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-4 block tracking-widest">Puesto de Trabajo:</label>
                    <div className="grid grid-cols-2 gap-4">
                      {rolesConfig.filter(r => {
                        if (admin?.rol === 'ambos' || admin?.rol === 'admin_master') return true;
                        return r.id === 'empleado';
                      }).map(r => (
                        <div 
                          key={r.id}
                          onClick={() => setForm({...form, rol: r.id})}
                          className={`cursor-pointer p-5 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 ${
                            form.rol === r.id ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${form.rol === r.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            <r.icon size={20}/>
                          </div>
                          <div>
                            <p className={`font-black text-xs ${form.rol === r.id ? 'text-indigo-900' : 'text-gray-500'}`}>{r.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTOR DINÁMICO DE GESTOR PARA EMPLEADOS */}
                  {form.rol === 'empleado' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-indigo-50 p-6 rounded-[1.5rem] border border-indigo-100 space-y-4">
                      <p className="text-[10px] font-black text-indigo-400 uppercase text-center tracking-widest">Asignar Gestor a este Empleado</p>
                      <div className="flex gap-2">
                        {[
                          { id: 'parqueo', label: 'Parqueo', icon: Car },
                          { id: 'informales', label: 'Informales', icon: Store },
                          { id: 'ambos', label: 'Ambos', icon: LayoutGrid }
                        ].filter(s => {
                          if (admin?.rol === 'ambos' || admin?.rol === 'admin_master') return true;
                          if (admin?.rol === 'parqueadero') return s.id === 'parqueo';
                          if (admin?.rol === 'informales') return s.id === 'informales';
                          return false;
                        }).map(s => (
                          <button
                            key={s.id} type="button" onClick={() => setSubRolEmpleado(s.id)}
                            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${subRolEmpleado === s.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 text-gray-400'}`}
                          >
                            <s.icon size={18}/>
                            <span className="text-[8px] font-black">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 text-lg uppercase tracking-widest">
                    {modo === 'crear' ? 'Registrar Personal' : 'Guardar Cambios'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModuloEmpleados;
