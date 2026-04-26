import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Users, Settings, AlertCircle, CheckCircle, Menu, X, TrendingUp, ArrowLeft, ShieldAlert } from 'lucide-react';
import RegistroEntrada from './components/RegistroEntrada';
import ListaActivos from './components/ListaActivos';
import ModuloInformales from './components/ModuloInformales';
import ModuloAjustes from './components/ModuloAjustes';
import ModuloEstadisticas from './components/ModuloEstadisticas';
import ModuloReportes from './components/ModuloReportes';
import ModuloEvidencias from './components/ModuloEvidencias';
import BandejaMensajes from './components/BandejaMensajes';
import ModuloEmpleados from './components/ModuloEmpleados';
import ModuloListaNegra from './components/ModuloListaNegra';
import DevTools from './components/DevTools';
import Login from './components/Login';
import HomePanel from './components/HomePanel';
import { loginAdmin, updateAdmin } from './services/authService';
import { supabase } from './lib/supabase';
import Swal from 'sweetalert2';
import logo from '../assets/logo upar.png';

function App() {
  const [tab, setTab] = useState('parqueadero');
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState(null);
  const [mostrarDevTools, setMostrarDevTools] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [appView, setAppView] = useState('login'); // login, home, app
  const [selectedModule, setSelectedModule] = useState(null);
  const [devKey, setDevKey] = useState('ChrizDev07');
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nombre_completo: '', foto_perfil: '' });
  const [devTaps, setDevTaps] = useState(0);
  const menuRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && menuAbierto) {
        setMenuAbierto(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuAbierto]);

  useEffect(() => {
    if (menuAbierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuAbierto]);

  useEffect(() => {
    const fetchDevKey = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracion')
          .select('valor_texto')
          .eq('tipo_vehiculo', 'dev_key')
          .maybeSingle();
        
        if (data && data.valor_texto) {
          setDevKey(data.valor_texto);
        }
      } catch (e) {
        console.error("Error al cargar clave dev:", e);
      }
    };
    fetchDevKey();

    // RESTAURAR SESIÓN DESDE LOCALSTORAGE
    const savedSession = localStorage.getItem('uparqueo_session');
    if (savedSession) {
      try {
        const { adminData, view, module, activeTab } = JSON.parse(savedSession);
        setAdmin(adminData);
        setAppView(view || 'home');
        if (module) setSelectedModule(module);
        if (activeTab) setTab(activeTab);
        setPerfilForm({
          nombre_completo: adminData.nombre_completo || '',
          foto_perfil: adminData.foto_perfil || ''
        });
      } catch (e) {
        console.error("Error restaurando sesión:", e);
        localStorage.removeItem('uparqueo_session');
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        
        const { value: password } = await Swal.fire({
          title: 'Acceso Restringido',
          text: 'Ingrese la contraseña de desarrollador:',
          input: 'password',
          inputPlaceholder: 'Contraseña...',
          inputAttributes: {
            autocapitalize: 'off',
            autocorrect: 'off'
          },
          showCancelButton: true,
          confirmButtonText: 'Acceder',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#2563EB',
          cancelButtonColor: '#6B7280'
        });

        if (password === devKey) {
          setMostrarDevTools(true);
          Swal.fire({
            title: '🔧 Modo Desarrollador',
            text: 'Herramientas de desarrollador activadas',
            icon: 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            background: '#1f2937',
            color: '#fff'
          });
        } else if (password) {
          Swal.fire('Error', 'Contraseña incorrecta', 'error');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [devKey]);

  // FUNCIÓN PARA ACTIVAR DEVTOOLS (REUTILIZABLE)
  const activarDevTools = async () => {
    const { value: password } = await Swal.fire({
      title: 'Acceso Restringido',
      text: 'Ingrese la contraseña de desarrollador:',
      input: 'password',
      inputPlaceholder: 'Contraseña...',
      showCancelButton: true,
      confirmButtonText: 'Acceder',
      confirmButtonColor: '#2563EB'
    });

    if (password === devKey) {
      setMostrarDevTools(true);
      Swal.fire({
        title: '🔧 Modo Desarrollador',
        text: 'Activado desde dispositivo',
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        background: '#1f2937',
        color: '#fff'
      });
    } else if (password) {
      Swal.fire('Error', 'Contraseña incorrecta', 'error');
    }
  };

  const handleLogoClick = () => {
    const newTaps = devTaps + 1;
    if (newTaps >= 5) {
      setDevTaps(0);
      activarDevTools();
    } else {
      setDevTaps(newTaps);
      // Resetear taps después de 2 segundos de inactividad
      setTimeout(() => setDevTaps(0), 2000);
      
      if (appView === 'app') setAppView('home');
    }
  };

  // SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
  useEffect(() => {
    if (!admin) return;

    // Canal para Mensajes
    const msgChannel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'mensajes',
        filter: `destinatario_id=eq.${admin.id}`
      }, (payload) => {
        showNotification(`Nuevo mensaje de @${payload.new.asunto || 'Sistema'}`, 'success');
        setRefreshKey(k => k + 1);
      })
      // Canal para Pagos de Parqueo
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'registros_parqueo',
        filter: 'estado=eq.finalizado'
      }, (payload) => {
        if (admin.rol === 'ambos' || admin.rol === 'parqueadero') {
          showNotification(`Pago recibido: $${payload.new.total_pagar.toLocaleString()} (${payload.new.placa})`, 'success');
          setRefreshKey(k => k + 1);
        }
      })
      // Canal para Abonos de Informales
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'negocios_informales'
      }, (payload) => {
        if (admin.rol === 'ambos' || admin.rol === 'informales') {
          if (payload.new.abonos > payload.old.abonos) {
            showNotification(`Nuevo abono: ${payload.new.nombre_negocio}`, 'success');
            setRefreshKey(k => k + 1);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [admin]);

  const tabsConfig = [
    { id: 'parqueadero', label: 'PARQUEADERO', labelShort: 'P', icon: Car, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600', hoverColor: 'hover:bg-blue-50' },
    { id: 'informales', label: 'INFORMALES', labelShort: 'I', icon: Users, color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600', hoverColor: 'hover:bg-orange-50' },
    { id: 'reportes', label: 'REPORTES', labelShort: 'R', icon: TrendingUp, color: 'indigo', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600', hoverColor: 'hover:bg-indigo-50' },
    { id: 'evidencias', label: 'EVIDENCIAS', labelShort: 'V', icon: AlertCircle, color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-600', hoverColor: 'hover:bg-amber-50' },
    { id: 'empleados', label: 'EMPLEADOS', labelShort: 'U', icon: Users, color: 'emerald', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', hoverColor: 'hover:bg-emerald-50' },
    { id: 'lista_negra', label: 'LISTA NEGRA', labelShort: 'LN', icon: ShieldAlert, color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-600', hoverColor: 'hover:bg-red-50' },
    { id: 'mensajes', label: 'MENSAJES', labelShort: 'M', icon: Menu, color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-600', hoverColor: 'hover:bg-purple-50' },
    { id: 'ajustes', label: 'AJUSTES', labelShort: 'A', icon: Settings, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', hoverColor: 'hover:bg-gray-100' }
  ];

  const tabs = tabsConfig.filter(t => {
    // Si es un rol de empleado (empieza con empleado_)
    if (admin?.rol?.startsWith('empleado')) {
      if (t.id === 'mensajes') return true;
      if (admin.rol === 'empleado_parqueo' && t.id === 'parqueadero') return true;
      if (admin.rol === 'empleado_informales' && t.id === 'informales') return true;
      if (admin.rol === 'empleado_ambos' && (t.id === 'parqueadero' || t.id === 'informales')) return true;
      // Compatibilidad con rol 'empleado' antiguo
      if (admin.rol === 'empleado' && (t.id === 'parqueadero' || t.id === 'informales')) return true;
      return false;
    }

    // Filtrado por módulo seleccionado
    if (selectedModule === 'parqueadero' && t.id === 'informales') return false;
    if (selectedModule === 'informales' && t.id === 'parqueadero') return false;
    
    // Restricción de gestión de empleados y lista negra para no-admins
    if (admin?.rol?.startsWith('empleado') && (t.id === 'empleados' || t.id === 'lista_negra')) return false;

    return true;
  });

  const handleMenuToggle = () => {
    setMenuAbierto(!menuAbierto);
  };

  const handleTabChange = (tabId) => {
    setTab(tabId);
    setMenuAbierto(false);
    // Guardar cambio de pestaña en la sesión persistente
    const savedSession = localStorage.getItem('uparqueo_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      localStorage.setItem('uparqueo_session', JSON.stringify({ ...session, activeTab: tabId }));
    }
  };

  const handleLogin = (adminData) => {
    if (!adminData) return;
    setAdmin(adminData);
    setPerfilForm({
      nombre_completo: adminData.nombre_completo || '',
      foto_perfil: adminData.foto_perfil || ''
    });
    setAppView('home');
    // Persistir sesión
    localStorage.setItem('uparqueo_session', JSON.stringify({ 
      adminData, 
      view: 'home',
      activeTab: tab 
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await updateAdmin(admin.id, perfilForm);
    if (res.success) {
      setAdmin(res.data);
      setMostrarPerfil(false);
      showNotification('Perfil actualizado', 'success');
    } else {
      showNotification(res.message, 'error');
    }
  };

  const handleSelectModule = (modulo) => {
    setSelectedModule(modulo);
    setTab(modulo);
    setAppView('app');
    // Actualizar sesión persistente
    const savedSession = localStorage.getItem('uparqueo_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      localStorage.setItem('uparqueo_session', JSON.stringify({ 
        ...session, 
        view: 'app', 
        module: modulo,
        activeTab: modulo 
      }));
    }
  };

  const handleLogout = () => {
    setAdmin(null);
    setSelectedModule(null);
    setAppView('login');
    localStorage.removeItem('uparqueo_session');
  };

  if (appView === 'login') {
    return (
      <>
        <Login onLoginSuccess={handleLogin} onDevRequest={activarDevTools} />
        <AnimatePresence>
          {mostrarDevTools && (
            <DevTools onClose={() => setMostrarDevTools(false)} currentAdmin={admin} />
          )}
        </AnimatePresence>
      </>
    );
  }

  if (appView === 'home') {
    return (
      <>
        <HomePanel 
          admin={admin} 
          onSelectModule={handleSelectModule} 
          onLogout={handleLogout} 
        />
        <AnimatePresence>
          {mostrarDevTools && (
            <DevTools onClose={() => setMostrarDevTools(false)} currentAdmin={admin} />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-6 py-3 rounded-lg shadow-xl ${
              notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-2xl transition-all duration-300 ${
          isScrolled ? 'pt-4 pb-4' : 'pt-6 pb-6'
        }`}
      >
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative w-full px-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Botón de Menú Móvil */}
              <button 
                onClick={handleMenuToggle}
                className="md:hidden p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95 border border-white/10"
              >
                {menuAbierto ? <X size={24} /> : <Menu size={24} />}
              </button>

              <div className="relative flex-shrink-0">
                <img 
                  src={logo} 
                  alt="UPARQUEO Logo" 
                  onClick={handleLogoClick}
                  className="h-12 md:h-16 w-auto rounded-full object-cover border-3 border-white shadow-2xl cursor-pointer active:scale-90 transition-transform"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight">
                  UPARQUEO
                  <span className="text-blue-300 ml-2 text-sm md:text-xl lg:text-2xl">by ChrizDev</span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setAppView('home')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 transition-all flex items-center gap-2 active:scale-95"
              >
                <ArrowLeft size={16} /> Volver
              </button>

              <div 
                onClick={() => setMostrarPerfil(true)}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-2xl p-2 pr-4 cursor-pointer transition-all border border-white/10 group"
              >
                <img 
                  src={admin?.foto_perfil || "https://ui-avatars.com/api/?name=" + admin?.username} 
                  className="w-10 h-10 rounded-xl object-cover border-2 border-white/30"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold opacity-70 uppercase tracking-tighter">{admin?.rol}</p>
                  <p className="text-sm font-black">{admin?.nombre_completo || admin?.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="sticky top-0 z-20">
        <nav className="hidden md:block w-full px-4 -mt-6 relative z-10">
          <div className="bg-white rounded-xl shadow-lg p-1 flex flex-wrap gap-1 max-w-full">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              const activeClasses = isActive ? `${item.bgColor} ${item.textColor} shadow-lg` : 'text-gray-600 hover:bg-gray-50';
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-3 ${activeClasses}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <main className="w-full px-4 mt-8 pb-12 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={tab}>
            {tab === 'parqueadero' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <RegistroEntrada 
                    onRegistroExitoso={() => {
                      setRefreshKey(k => k + 1);
                      showNotification('Vehículo registrado exitosamente', 'success');
                    }} 
                  />
                </div>
                <div className="lg:col-span-3">
                  <ListaActivos refreshKey={refreshKey} onVehiculoSalida={() => showNotification('Vehículo retirado del sistema', 'success')} />
                </div>
              </div>
            )}

            {tab === 'informales' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloInformales admin={admin} onActionSuccess={(msg) => showNotification(msg, 'success')} />
              </motion.div>
            )}
            
            {tab === 'reportes' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloReportes selectedModule={selectedModule} />
              </motion.div>
            )}

            {tab === 'evidencias' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloEvidencias admin={admin} selectedModule={selectedModule} />
              </motion.div>
            )}

            {tab === 'empleados' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloEmpleados admin={admin} selectedModule={selectedModule} />
              </motion.div>
            )}

            {tab === 'lista_negra' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloListaNegra admin={admin} selectedModule={selectedModule} />
              </motion.div>
            )}

            {tab === 'mensajes' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <BandejaMensajes admin={admin} />
              </motion.div>
            )}
            
            {tab === 'ajustes' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloAjustes 
                  onActionSuccess={(msg) => showNotification(msg, 'success')}
                  onDevToolsClick={() => setMostrarDevTools(true)}
                />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MENÚ MÓVIL (DRAWER) */}
      <AnimatePresence>
        {menuAbierto && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuAbierto(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-white z-[110] shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-8 bg-blue-900 text-white">
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={logo} 
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
                  />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Uparqueo Admin</p>
                    <p className="text-lg font-black truncate">{admin?.nombre_completo || admin?.username}</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {tabs.map((item) => {
                  const Icon = item.icon;
                  const isActive = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        isActive 
                          ? `${item.bgColor} ${item.textColor} shadow-lg shadow-gray-100` 
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                        <Icon size={18} />
                      </div>
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <X size={18} /> Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarDevTools && (
          <DevTools onClose={() => setMostrarDevTools(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mostrarPerfil && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-8 text-white relative">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <img src={perfilForm.foto_perfil || "https://ui-avatars.com/api/?name=" + admin?.username} className="w-24 h-24 rounded-3xl object-cover border-4 border-white/20 shadow-2xl" />
                    <div className="absolute -bottom-2 -right-2 bg-white text-blue-600 p-2 rounded-xl shadow-lg">
                      <Settings size={16} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black">{admin?.username}</h3>
                  <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mt-2">{admin?.rol}</span>
                </div>
                <button onClick={() => setMostrarPerfil(false)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Completo</label>
                  <input type="text" value={perfilForm.nombre_completo} onChange={(e) => setPerfilForm({...perfilForm, nombre_completo: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">URL Foto de Perfil</label>
                  <input type="url" value={perfilForm.foto_perfil} onChange={(e) => setPerfilForm({...perfilForm, foto_perfil: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">Guardar Cambios</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;