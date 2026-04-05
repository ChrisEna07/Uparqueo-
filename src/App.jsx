import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Users, Settings, AlertCircle, CheckCircle, Menu, X } from 'lucide-react';
import RegistroEntrada from './components/RegistroEntrada';
import ListaActivos from './components/ListaActivos';
import ModuloInformales from './components/ModuloInformales';
import ModuloAjustes from './components/ModuloAjustes';
import DevTools from './components/DevTools';
import Swal from 'sweetalert2';
import logo from '../assets/logo upar.png';

function App() {
  const [tab, setTab] = useState('parqueadero');
  const [refreshKey, setRefreshKey] = useState(0);
  const [notification, setNotification] = useState(null);
  const [mostrarDevTools, setMostrarDevTools] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
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
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tabs = [
    { id: 'parqueadero', label: 'PARQUEADERO', labelShort: 'P', icon: Car, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-600', hoverColor: 'hover:bg-blue-50' },
    { id: 'informales', label: 'INFORMALES', labelShort: 'I', icon: Users, color: 'orange', bgColor: 'bg-orange-50', textColor: 'text-orange-600', hoverColor: 'hover:bg-orange-50' },
    { id: 'ajustes', label: 'AJUSTES', labelShort: 'A', icon: Settings, color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', hoverColor: 'hover:bg-gray-100' }
  ];

  const handleMenuToggle = () => {
    setMenuAbierto(!menuAbierto);
  };

  const handleTabChange = (tabId) => {
    setTab(tabId);
    setMenuAbierto(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Notificación flotante */}
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

      {/* Header con logo */}
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
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <img 
                  src={logo} 
                  alt="UPARQUEO Logo" 
                  id="dev-logo"
                  className="h-12 md:h-16 w-auto rounded-full object-cover border-3 border-white shadow-2xl transform hover:scale-105 transition-transform duration-300 cursor-pointer active:scale-95"
                  style={{
                    borderRadius: '50%',
                    aspectRatio: '1/1',
                    objectFit: 'cover',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  title="🔧 Atajo de teclado: Ctrl+Shift+D"
                  draggable="false"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight">
                  UPARQUEO
                  <span className="text-blue-300 ml-2 text-sm md:text-xl lg:text-2xl">by ChrizDev</span>
                </h1>
                <p className="text-blue-200 text-xs md:text-sm mt-1 hidden sm:block">Sistema Profesional de Gestión de Parqueaderos</p>
              </div>
            </div>
            
            <div className="hidden md:block flex-shrink-0">
              <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Sistema en línea</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Navbar */}
      <div className={`sticky top-0 z-20 transition-all duration-300 ${
        isScrolled ? 'shadow-xl' : 'shadow-md'
      }`}>
        <nav className="hidden md:block w-full px-4 -mt-6 relative z-10">
          <div className="bg-white rounded-xl shadow-lg p-1 flex flex-wrap gap-1 max-w-full">
            {tabs.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              const activeClasses = isActive ? 
                `${item.bgColor} ${item.textColor} shadow-lg` : 
                'text-gray-600 hover:bg-gray-50';
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex-1 min-w-[120px] py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-3 ${activeClasses}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={20} />
                  <span className="item-text">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>

        <nav className="md:hidden w-full px-4 -mt-6 relative z-10" ref={menuRef}>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={handleMenuToggle}
              className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors active:bg-gray-200"
            >
              <div className="flex items-center gap-3">
                {tabs.find(t => t.id === tab)?.icon && (
                  <div className={tabs.find(t => t.id === tab)?.textColor}>
                    {React.createElement(tabs.find(t => t.id === tab).icon, { size: 24 })}
                  </div>
                )}
                <span className="font-bold text-gray-800">
                  {tabs.find(t => t.id === tab)?.label}
                </span>
              </div>
              {menuAbierto ? <X size={24} className="text-gray-600" /> : <Menu size={24} className="text-gray-600" />}
            </button>
            
            <AnimatePresence>
              {menuAbierto && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMenuAbierto(false)}
                  />
                  
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-50 overflow-hidden border-t border-gray-100 bg-white"
                  >
                    {tabs.map((item) => {
                      const Icon = item.icon;
                      const isActive = tab === item.id;
                      const activeClasses = isActive ? 
                        `${item.bgColor} ${item.textColor}` : 
                        'text-gray-600';
                      
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => handleTabChange(item.id)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full p-4 flex items-center gap-3 transition-colors ${activeClasses} hover:bg-gray-50 border-b border-gray-100 last:border-b-0 active:bg-gray-100`}
                        >
                          <Icon size={22} />
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>

      {/* Contenido principal */}
      <main className="w-full px-4 mt-8 pb-12 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {tab === 'parqueadero' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-1"
                >
                  <RegistroEntrada 
                    onRegistroExitoso={() => {
                      setRefreshKey(k => k + 1);
                      showNotification('Vehículo registrado exitosamente', 'success');
                    }} 
                  />
                </motion.div>
                <motion.div 
                  className="lg:col-span-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <ListaActivos refreshKey={refreshKey} onVehiculoSalida={() => showNotification('Vehículo retirado del sistema', 'success')} />
                </motion.div>
              </div>
            )}

            {tab === 'informales' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ModuloInformales onActionSuccess={(msg) => showNotification(msg, 'success')} />
              </motion.div>
            )}
            
            {tab === 'ajustes' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
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

      {/* DevTools Modal */}
      <AnimatePresence>
        {mostrarDevTools && (
          <DevTools onClose={() => setMostrarDevTools(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;