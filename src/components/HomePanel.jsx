import React from 'react';
import { motion } from 'framer-motion';
import { 
  Car, Store, LogOut, Shield, 
  ChevronRight, Lock, UserCheck
} from 'lucide-react';

const HomePanel = ({ admin, onSelectModule, onLogout }) => {
  
  // Lógica de permisos avanzada para roles segmentados
  const tienePermiso = (modulo) => {
    if (!admin?.rol) return false;
    
    // El Admin Master o con rol 'ambos' tienen acceso total
    if (admin.rol === 'admin_master' || admin.rol === 'ambos') return true;

    // Si es un empleado (rol empieza con empleado_ o es solo empleado)
    const esEmpleado = admin.rol.startsWith('empleado') || admin.rol === 'empleado';
    
    if (esEmpleado) {
      // Por petición, el empleado SOLO puede acceder al módulo de informales
      return modulo === 'informales';
    }

    // Para administradores de área específicos
    if (modulo === 'parqueadero') return admin.rol === 'parqueadero';
    if (modulo === 'informales') return admin.rol === 'informales';
    
    return false;
  };

  const modulos = [
    {
      id: 'parqueadero',
      titulo: 'Gestor de Parqueadero',
      subtitulo: 'Control de ingresos, cálculo de tarifas por hora y generación de recibos PDF para vehículos.',
      icon: Car,
      color: 'blue',
      habilitado: tienePermiso('parqueadero')
    },
    {
      id: 'informales',
      titulo: 'Gestor de Informales',
      subtitulo: 'Administración de puestos y negocios, control de cobros diarios acumulados y reportes de estado de cuenta.',
      icon: Store,
      color: 'orange',
      habilitado: tienePermiso('informales')
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 p-6 md:p-12 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-orange-500/5 rounded-full blur-[100px]"></div>

      <div className="max-w-6xl mx-auto relative z-10">
             {/* Header Superior */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 dark:border-gray-700">
              <Shield className="text-blue-600" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">UPARQUEO</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                  {admin?.rol?.startsWith('empleado') ? 'Empleado' : 'Admin'}: <span className="text-gray-600">{admin?.username}</span>
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="group flex items-center gap-3 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            SALIR
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter"
          >
            ¿Qué deseas <span className="text-blue-600">gestionar</span> hoy?
          </motion.h2>
          <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Selecciona el módulo al que deseas acceder. Tu cuenta determina a qué herramientas tienes permiso de ingresar.
          </p>
        </div>

        {/* Grid de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {modulos.map((mod, idx) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => mod.habilitado && onSelectModule(mod.id)}
              className={`group relative overflow-hidden bg-white dark:bg-gray-800 p-10 rounded-[3rem] border-2 transition-all duration-500 ${
                mod.habilitado 
                  ? `cursor-pointer border-transparent dark:border-gray-700 shadow-2xl hover:shadow-3xl hover:-translate-y-2 ${mod.color === 'blue' ? 'hover:border-blue-500/30' : 'hover:border-orange-500/30'}` 
                  : 'opacity-80 grayscale cursor-not-allowed border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 shadow-none'
              }`}
            >
              <div className="relative z-10">
                <div className={`inline-flex p-5 rounded-[2rem] mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                  mod.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600'
                }`}>
                  <mod.icon size={48} strokeWidth={2.5} />
                </div>
                
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{mod.titulo}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-10 text-lg">
                  {mod.subtitulo}
                </p>

                <div className="flex items-center justify-between">
                  {mod.habilitado ? (
                    <div className={`flex items-center gap-2 font-black text-sm uppercase tracking-widest ${
                      mod.color === 'blue' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      Ingresar ahora <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-50 text-red-500 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100">
                      <Lock size={16} /> Sin permisos
                    </div>
                  )}

                  {mod.habilitado && (
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                      <UserCheck size={20} />
                    </div>
                  )}
                </div>
              </div>

              {/* Decoración de fondo en hover */}
              <div className={`absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${
                mod.color === 'blue' ? 'bg-blue-600' : 'bg-orange-600'
              }`}></div>
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <div className="text-center py-8">
          <p className="text-gray-300 font-black text-[10px] uppercase tracking-[0.4em]">UPARQUEO ECOSYSTEM • BY CHRIZDEV07</p>
        </div>
      </div>
    </div>
  );
};

export default HomePanel;
