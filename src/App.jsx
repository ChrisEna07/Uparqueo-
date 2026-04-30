import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Users, Settings, AlertCircle, CheckCircle, Menu, X, TrendingUp, ArrowLeft, ShieldAlert, Camera, Download, Image as ImageIcon } from 'lucide-react';
import RegistroEntrada from './components/RegistroEntrada';
import ListaActivos from './components/ListaActivos';
import ModuloInformales from './components/ModuloInformales';
import ModuloAjustes from './components/ModuloAjustes';
import ModuloEstadisticas from './components/ModuloEstadisticas';
import ModuloReportes from './components/ModuloReportes';
import ModuloEvidencias from './components/ModuloEvidencias';
import ModuloNotificaciones from './components/ModuloNotificaciones';
import ModuloListaNegra from './components/ModuloListaNegra';
import ModuloEmpleados from './components/ModuloEmpleados';
import { Bell } from 'lucide-react';
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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('uparqueo_theme') || 'light');
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('uparqueo_font_size')) || 16);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const menuRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    // Sonido sutil si es posible
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (e) {}
    
    setTimeout(() => setNotification(null), 4000);
  };

  const esNotificacionRelevante = (categoria) => {
    return true;
  };

  const addNotificacion = (titulo, mensaje, categoria) => {
    // Módulo eliminado por solicitud
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showNotification('Notificaciones habilitadas correctamente', 'success');
      return true;
    }
    return false;
  };

  const sendNativeNotification = (title, body) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Priorizar el uso del Service Worker (necesario para móvil/Android/iOS PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200],
          tag: 'uparqueo-notif',
          renotify: true
        });
      }).catch(err => {
        // Fallback a notificación estándar si el SW falla
        new Notification(title, { body, icon: '/favicon.svg' });
      });
    } else {
      // Fallback para navegadores antiguos sin SW
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  };


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);

    // Aplicar tema y tamaño de letra
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    localStorage.setItem('uparqueo_theme', theme);
    localStorage.setItem('uparqueo_font_size', fontSize.toString());

    return () => window.removeEventListener('scroll', handleScroll);
  }, [theme, fontSize]);

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
    const verificarSesion = async () => {
      const savedSession = localStorage.getItem('uparqueo_session');
      if (savedSession) {
        try {
          const { adminData, view, module, activeTab } = JSON.parse(savedSession);
          
          // Verificar contra la base de datos si el usuario AÚN existe
          if (adminData && adminData.id) {
            const { data, error } = await supabase
              .from('admins')
              .select('id')
              .eq('id', adminData.id)
              .maybeSingle();

            if (error || !data) {
              // El usuario fue eliminado o no existe, forzar cierre de sesión
              console.warn("Sesión inválida: El usuario ya no existe en la base de datos.");
              localStorage.removeItem('uparqueo_session');
              setAdmin(null);
              setAppView('login');
              return;
            }
          }

          setAdmin(adminData);
          setAppView(view || 'home');
          if (module) setSelectedModule(module);
          if (activeTab) setTab(activeTab);
          setPerfilForm({
            nombre_completo: adminData?.nombre_completo || '',
            foto_perfil: adminData?.foto_perfil || ''
          });
        } catch (e) {
          console.error("Error restaurando sesión:", e);
          localStorage.removeItem('uparqueo_session');
        }
      }
    };
    
    verificarSesion();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

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

  useEffect(() => {
    // El sistema de notificaciones en tiempo real ha sido desactivado por solicitud
  }, [admin]);

  const tabsConfig = [
    { id: 'parqueadero', label: 'PARQUEADERO', labelShort: 'P', icon: Car, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600', hoverColor: 'hover:bg-blue-50' },
    { id: 'informales', label: 'INFORMALES', labelShort: 'I', icon: Users, color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600', hoverColor: 'hover:bg-orange-50' },
    { id: 'reportes', label: 'REPORTES', labelShort: 'R', icon: TrendingUp, color: 'indigo', bgColor: 'bg-indigo-50', textColor: 'text-indigo-600', hoverColor: 'hover:bg-indigo-50' },
    { id: 'evidencias', label: 'EVIDENCIAS', labelShort: 'V', icon: AlertCircle, color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-600', hoverColor: 'hover:bg-amber-50' },
    { id: 'empleados', label: 'EMPLEADOS', labelShort: 'U', icon: Users, color: 'emerald', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', hoverColor: 'hover:bg-emerald-50' },
    { id: 'lista_negra', label: 'LISTA NEGRA', labelShort: 'LN', icon: ShieldAlert, color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-600', hoverColor: 'hover:bg-red-50' },
    { id: 'ajustes', label: 'AJUSTES', labelShort: 'A', icon: Settings, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', hoverColor: 'hover:bg-gray-100' }
  ];

  const tabs = tabsConfig.filter(t => {
    // Si es un rol de empleado (empieza con empleado_ o es solo empleado)
    const esEmpleado = admin?.rol?.startsWith('empleado') || admin?.rol === 'empleado';
    
    if (esEmpleado) {
      // Pestañas permitidas para empleados según solicitud: Informales, Evidencias, Lista Negra
      // Además de notificaciones y ajustes que son básicos
      const permitidas = ['informales', 'evidencias', 'lista_negra', 'ajustes'];
      return permitidas.includes(t.id);
    }

    // Filtrado por módulo seleccionado para Admins
    if (selectedModule === 'parqueadero' && t.id === 'informales') return false;
    if (selectedModule === 'informales' && t.id === 'parqueadero') return false;
    
    return true;
  });

  const formatRol = (rol) => {
    if (!rol) return '';
    if (rol === 'admin_master') return 'Master Admin';
    if (rol.startsWith('empleado')) {
      const area = rol.split('_')[1];
      return area ? `Empleado ${area}` : 'Empleado';
    }
    return `Admin ${rol}`;
  };

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
            <DevTools 
              onClose={() => setMostrarDevTools(false)} 
              currentAdmin={admin} 
              onAction={() => setRefreshKey(k => k + 1)}
            />
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
            <DevTools 
              onClose={() => setMostrarDevTools(false)} 
              currentAdmin={admin} 
              onAction={() => setRefreshKey(k => k + 1)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 50, scale: 0.8, filter: 'blur(10px)' }}
            className={`fixed top-6 right-6 z-[200] flex flex-col min-w-[320px] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl border border-white/20 overflow-hidden ${
              notification.type === 'success' 
                ? 'bg-emerald-600/95 text-white shadow-emerald-500/20' 
                : 'bg-rose-600/95 text-white shadow-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="bg-white/20 p-2.5 rounded-xl shadow-inner">
                {notification.type === 'success' ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
              </div>
              <div className="flex-1">
                <p className="font-black text-[10px] uppercase tracking-[0.3em] opacity-60 leading-none mb-1.5">Aviso del Sistema</p>
                <p className="font-black text-sm tracking-tight">{notification.message}</p>
              </div>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Barra de progreso animada */}
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: "linear" }}
              className="h-1.5 bg-white/30 self-start"
            />
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
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
              <button 
                onClick={handleMenuToggle}
                className="md:hidden p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95 border border-white/10 flex-shrink-0"
              >
                {menuAbierto ? <X size={20} /> : <Menu size={20} />}
              </button>
 
              <div 
                onClick={handleLogoClick}
                className="cursor-pointer relative z-10 flex items-center justify-center bg-gray-950/20 backdrop-blur-md border border-white/20 shadow-lg rounded-full px-3 py-1.5 md:px-4 md:py-2 gap-2 md:gap-3 transition-transform active:scale-95 hover:bg-gray-900/40 min-w-0"
              >
                <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 p-1 rounded-full shadow-lg flex-shrink-0">
                  <div className="bg-white rounded-full p-1">
                    <span className="text-blue-600 font-black text-[10px] md:text-sm italic pr-0.5 font-sans leading-none block">P</span>
                  </div>
                </div>
                <div className="flex flex-col items-start justify-center pr-1 md:pr-2 overflow-hidden">
                  <span className="text-base md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-blue-50 to-gray-200 bg-clip-text text-transparent leading-none drop-shadow-md truncate">UPARQUEO</span>
                  <span className="text-[6px] md:text-[8px] font-black tracking-widest text-blue-200 uppercase leading-none mt-0.5 drop-shadow-md truncate">by ChrizDev</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              {deferredPrompt && (
                <button 
                  onClick={handleInstallApp}
                  className="flex bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all items-center gap-1 md:gap-2 active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  <Download size={16} /> <span className="hidden xs:block">Instalar App</span>
                </button>
              )}
 
              <button 
                onClick={() => setAppView('home')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2.5 md:px-4 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 transition-all flex items-center gap-2 active:scale-95"
              >
                <ArrowLeft size={18} /> <span className="hidden xs:block">Volver</span>
              </button>
 
              <div 
                onClick={() => setMostrarPerfil(true)}
                className="flex items-center gap-2 md:gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl md:rounded-2xl p-1.5 md:p-2 md:pr-4 cursor-pointer transition-all border border-white/10 group"
              >
                <img 
                  src={admin?.foto_perfil || "https://ui-avatars.com/api/?name=" + admin?.username} 
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl object-cover border-2 border-white/30"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-[8px] font-bold opacity-70 uppercase tracking-tighter leading-none mb-1">
                    {admin?.rol?.startsWith('empleado') ? 'Empleado' : 'Admin'}
                  </p>
                  <p className="text-xs font-black leading-none">{admin?.nombre_completo?.split(' ')[0] || admin?.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="sticky top-0 z-20">
        <nav className="hidden md:block w-full px-4 -mt-6 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 flex flex-wrap gap-1 max-w-full border border-gray-100 dark:border-gray-700 transition-colors">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              const activeClasses = isActive ? `${item.bgColor} ${item.textColor} shadow-lg` : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50';
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-3 relative ${activeClasses}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  {item.id === 'notificaciones' && notificaciones.filter(n => n.nuevo && esNotificacionRelevante(n.categoria)).length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white shadow-lg animate-bounce">
                      {notificaciones.filter(n => n.nuevo && esNotificacionRelevante(n.categoria)).length}
                    </span>
                  )}
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
                    admin={admin}
                    onRegistroExitoso={() => {
                      setRefreshKey(k => k + 1);
                      showNotification('Vehículo registrado exitosamente', 'success');
                    }} 
                  />
                </div>
                <div className="lg:col-span-3">
                  <ListaActivos 
                    admin={admin}
                    refreshKey={refreshKey} 
                    onVehiculoSalida={() => showNotification('Vehículo retirado del sistema', 'success')} 
                  />
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
                <ModuloEmpleados admin={admin} selectedModule={selectedModule} refreshKey={refreshKey} />
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

            {tab === 'notificaciones' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <ModuloNotificaciones 
                  notificaciones={notificaciones} 
                  selectedModule={selectedModule}
                  onClear={() => {
                    setNotificaciones([]);
                    localStorage.removeItem('uparqueo_notificaciones');
                  }}
                />
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
                  onRequestNotifications={requestNotificationPermission}
                  selectedModule={selectedModule}
                  theme={theme}
                  setTheme={setTheme}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
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
              className="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-white dark:bg-gray-900 z-[110] shadow-2xl md:hidden flex flex-col transition-colors duration-300"
            >
              <div className="p-8 bg-blue-900 text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-purple-500 p-1 rounded-full shadow-lg flex-shrink-0">
                    <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center">
                      <span className="text-blue-600 font-black text-lg italic pr-0.5 font-sans leading-none block">P</span>
                    </div>
                  </div>
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
                          ? `${item.bgColor} ${item.textColor} shadow-lg shadow-gray-100 dark:shadow-none` 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800/50'}`}>
                        <Icon size={18} />
                      </div>
                      {item.label}
                    </button>
                  );
                })}
                {deferredPrompt && (
                  <button 
                    onClick={handleInstallApp}
                    className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  >
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                      <Download size={18} />
                    </div>
                    Instalar App
                  </button>
                )}
              </nav>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
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
            <DevTools 
              onClose={() => setMostrarDevTools(false)} 
              currentAdmin={admin} 
              onAction={() => setRefreshKey(k => k + 1)}
            />
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
                  <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mt-2">
                    {formatRol(admin?.rol)}
                  </span>
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Foto de Perfil</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => document.getElementById('foto-file').click()}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all"
                      >
                        <ImageIcon size={18}/>
                        <span className="text-xs font-bold uppercase tracking-widest">Elegir</span>
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          setShowCamera(true);
                          try {
                            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                            videoRef.current.srcObject = stream;
                          } catch (err) {
                            Swal.fire('Error', 'No se pudo acceder a la cámara', 'error');
                            setShowCamera(false);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all"
                      >
                        <Camera size={18}/>
                        <span className="text-xs font-bold uppercase tracking-widest">Cámara</span>
                      </button>
                    </div>
                    <input 
                      type="file" id="foto-file" className="hidden" accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => setPerfilForm({...perfilForm, foto_perfil: re.target.result});
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <input 
                      type="url" 
                      placeholder="O pega una URL de imagen..."
                      value={perfilForm.foto_perfil} 
                      onChange={(e) => setPerfilForm({...perfilForm, foto_perfil: e.target.value})} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-xs" 
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
                          setPerfilForm({...perfilForm, foto_perfil: photo});
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