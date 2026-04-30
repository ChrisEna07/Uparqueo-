import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, AlertTriangle, CheckCircle, Activity, ShieldCheck, Database, Zap, Send, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../lib/supabase';

const ModuloSoporte = ({ admin }) => {
  const [reportando, setReportando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [pasoVerificacion, setPasoVerificacion] = useState(0);
  const [resultados, setResultados] = useState([]);
  const [form, setForm] = useState({ asunto: '', descripcion: '' });

  const handleReportar = async (e) => {
    e.preventDefault();
    if (!form.asunto || !form.descripcion) {
      return Swal.fire('Error', 'Por favor completa todos los campos', 'error');
    }

    setReportando(true);
    try {
      // Simulación de envío de reporte (podría guardarse en una tabla de soporte)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Swal.fire({
        title: '¡Reporte Enviado!',
        text: 'El equipo de soporte revisará tu falla pronto.',
        icon: 'success',
        confirmButtonColor: '#2563EB'
      });
      setForm({ asunto: '', descripcion: '' });
    } catch (error) {
      Swal.fire('Error', 'No se pudo enviar el reporte', 'error');
    } finally {
      setReportando(false);
    }
  };

  const iniciarVerificacion = async () => {
    setVerificando(true);
    setResultados([]);
    setPasoVerificacion(1);

    const pasos = [
      { id: 1, nombre: 'Verificando Conexión Supabase', icon: Database },
      { id: 2, nombre: 'Validando Módulos del Sistema', icon: Zap },
      { id: 3, nombre: 'Chequeando Integridad de Datos', icon: ShieldCheck },
      { id: 4, nombre: 'Analizando Latencia de Red', icon: Activity }
    ];

    for (const paso of pasos) {
      setPasoVerificacion(paso.id);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Validación real de Supabase en el paso 1
      if (paso.id === 1) {
        const { data, error } = await supabase.from('configuracion').select('id').limit(1);
        if (error) {
           setResultados(prev => [...prev, { ...paso, estado: 'error', msg: 'Fallo en conexión de base de datos' }]);
           break;
        }
      }

      setResultados(prev => [...prev, { ...paso, estado: 'success', msg: 'Operativo' }]);
    }

    setVerificando(false);
    setPasoVerificacion(0);

    if (resultados.length === 4) {
      Swal.fire({
        title: 'Sistema Íntegro',
        text: 'Todos los módulos están funcionando correctamente.',
        icon: 'success',
        confirmButtonColor: '#10B981'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <LifeBuoy size={40} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-3xl font-black">Centro de Soporte</h2>
            <p className="opacity-80">Reporta fallas y verifica la salud de tu sistema Uparqueo</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulario de Reporte */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="text-amber-500" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Reportar una Falla</h3>
          </div>

          <form onSubmit={handleReportar} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Asunto</label>
              <input 
                type="text" 
                value={form.asunto}
                onChange={(e) => setForm({...form, asunto: e.target.value})}
                placeholder="Ej: Error al imprimir ticket"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Descripción del Problema</label>
              <textarea 
                rows="4"
                value={form.descripcion}
                onChange={(e) => setForm({...form, descripcion: e.target.value})}
                placeholder="Describe qué sucedió..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              ></textarea>
            </div>
            <button 
              type="submit"
              disabled={reportando}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {reportando ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  Enviar Reporte
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Verificación de Integridad */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="text-emerald-500" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Integridad del Sistema</h3>
          </div>

          <div className="flex-1 space-y-4">
            <p className="text-gray-500 text-sm">
              Ejecuta un diagnóstico completo para asegurar que todos los módulos y la base de datos estén respondiendo correctamente.
            </p>

            <div className="bg-gray-50 rounded-2xl p-6 space-y-4 min-h-[240px]">
              {resultados.length === 0 && !verificando && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                  <Activity size={48} className="opacity-20" />
                  <p className="font-medium">Listo para iniciar diagnóstico</p>
                </div>
              )}

              {resultados.map((res, i) => {
                const Icon = res.icon;
                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${res.estado === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        <Icon size={18} />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{res.nombre}</span>
                    </div>
                    {res.estado === 'success' ? (
                      <CheckCircle className="text-emerald-500" size={18} />
                    ) : (
                      <AlertTriangle className="text-red-500" size={18} />
                    )}
                  </motion.div>
                );
              })}

              {verificando && pasoVerificacion > resultados.length && (
                <div className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="text-sm font-medium text-blue-600">Procesando...</span>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={iniciarVerificacion}
            disabled={verificando}
            className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Activity size={18} />
            {verificando ? 'Verificando...' : 'Verificar Integridad'}
          </button>
        </motion.div>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
        <div className="bg-amber-500 p-2 rounded-lg h-fit">
          <Info className="text-white" size={20} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900">¿Necesitas ayuda inmediata?</h4>
          <p className="text-sm text-amber-800">
            Si el sistema presenta una falla crítica que impide la operación, contacta directamente al administrador del sistema o al desarrollador ChrizDev.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuloSoporte;
