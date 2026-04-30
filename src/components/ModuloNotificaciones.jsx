import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Car, Store, AlertCircle, ShieldAlert, Clock, Trash2, CheckCircle, Info } from 'lucide-react';

const ModuloNotificaciones = ({ notificaciones, onClear, selectedModule }) => {
  const [filtro, setFiltro] = useState('todas');

  // Filtrar notificaciones globales por módulo seleccionado ANTES de los filtros internos
  const notificacionesModulo = notificaciones.filter(n => {
    if (selectedModule === 'parqueadero') {
      return n.categoria === 'parqueo' || n.categoria === 'bloqueo' || n.categoria === 'evidencia';
    }
    if (selectedModule === 'informales') {
      return n.categoria === 'informales' || n.categoria === 'bloqueo' || n.categoria === 'evidencia';
    }
    return true; // Admin master ve todo
  });

  const getFiltrosDisponibles = () => {
    if (selectedModule === 'parqueadero') return ['todas', 'parqueo', 'evidencia', 'bloqueo'];
    if (selectedModule === 'informales') return ['todas', 'informales', 'evidencia', 'bloqueo'];
    return ['todas', 'parqueo', 'informales', 'evidencia', 'bloqueo'];
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'parqueo': return <Car size={20} />;
      case 'informales': return <Store size={20} />;
      case 'evidencia': return <AlertCircle size={20} />;
      case 'bloqueo': return <ShieldAlert size={20} />;
      default: return <Bell size={20} />;
    }
  };

  const getColor = (tipo) => {
    switch (tipo) {
      case 'parqueo': return 'bg-blue-500';
      case 'informales': return 'bg-orange-500';
      case 'evidencia': return 'bg-amber-500';
      case 'bloqueo': return 'bg-red-500';
      default: return 'bg-indigo-500';
    }
  };

  const filtradas = filtro === 'todas' 
    ? notificacionesModulo 
    : notificacionesModulo.filter(n => n.categoria === filtro);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
            <Bell size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Notificaciones en Vivo</h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Actividad reciente de empleados</p>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="flex items-center gap-2 bg-red-50 text-red-500 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
        >
          <Trash2 size={18} /> Limpiar Historial
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {getFiltrosDisponibles().map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              filtro === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            {f === 'parqueo' ? 'PARQUEADERO' : f === 'todas' ? 'GENERAL' : f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filtradas.length > 0 ? (
            filtradas.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-5 rounded-[2rem] shadow-md border border-gray-50 flex items-center gap-5 hover:shadow-lg transition-all group"
              >
                <div className={`${getColor(notif.categoria)} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-6 transition-transform`}>
                  {getIcon(notif.categoria)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-gray-900 font-black text-sm leading-tight">{notif.titulo}</p>
                    <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1 shrink-0 ml-2">
                      <Clock size={10} /> {notif.tiempo}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs font-medium">{notif.mensaje}</p>
                </div>
                {notif.nuevo && (
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse shrink-0" />
                )}
              </motion.div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-200">
              <Info size={48} className="opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm">No hay notificaciones recientes</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ModuloNotificaciones;
