import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getTarifas, updateTarifa, updateDevKey } from '../services/parqueoService';
import { Settings, Save, Info, DollarSign, Clock, TrendingUp, AlertCircle, CheckCircle, Edit2, Car, Bike, Store, Key } from 'lucide-react';
import Swal from 'sweetalert2';

const ModuloAjustes = ({ onActionSuccess, onDevToolsClick }) => {
  const [tarifas, setTarifas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [valorEdit, setValorEdit] = useState('');
  const [clicks, setClicks] = useState(0);
  const [ultimoClick, setUltimoClick] = useState(0);
  const [tiempoEspera, setTiempoEspera] = useState(null);
  const footerRef = useRef(null);

  const cargar = async () => {
    setCargando(true);
    const data = await getTarifas();
    // Filtramos dev_key para que no aparezca en la lista de tarifas
    const filtradas = data.filter(t => t.tipo_vehiculo !== 'dev_key');
    setTarifas(filtradas);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  // Detector de clics en el footer para modo desarrollador
  const handleFooterClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const ahora = Date.now();
    console.log('🔧 Click en footer detectado', { clicksActuales: clicks });
    
    if (ahora - ultimoClick < 500) {
      const nuevosClicks = clicks + 1;
      setClicks(nuevosClicks);
      
      if (nuevosClicks === 5) {
        console.log('🎉 Modo Desarrollador Activado!');
        if (onDevToolsClick) onDevToolsClick();
        setClicks(0);
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
      } else if (nuevosClicks === 4) {
        Swal.fire({
          title: '⚡ ¡Un click más!',
          text: 'Haz otro click rápido para activar DevTools',
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 800,
          background: '#1f2937',
          color: '#fff'
        });
      } else if (nuevosClicks === 3) {
        Swal.fire({
          title: '🔧 3/5',
          text: 'Dos clicks más para activar el modo desarrollador',
          icon: 'info',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 500,
          background: '#1f2937',
          color: '#fff'
        });
      }
    } else {
      setClicks(1);
    }
    setUltimoClick(ahora);
    
    if (tiempoEspera) clearTimeout(tiempoEspera);
    const timeout = setTimeout(() => {
      setClicks(0);
    }, 1500);
    setTiempoEspera(timeout);
  };

  // Registrar eventos en el footer
  useEffect(() => {
    const footerElement = footerRef.current;
    if (footerElement) {
      footerElement.addEventListener('click', handleFooterClick);
      footerElement.addEventListener('touchstart', handleFooterClick, { passive: false });
      return () => {
        footerElement.removeEventListener('click', handleFooterClick);
        footerElement.removeEventListener('touchstart', handleFooterClick);
      };
    }
  }, [clicks, ultimoClick]);

  const handleUpdate = async (tipo, valor) => {
    const valorNumerico = parseInt(valor);
    
    if (isNaN(valorNumerico) || valorNumerico < 0) {
      await Swal.fire({
        title: 'Error',
        text: 'Por favor ingrese un valor numérico válido mayor o igual a 0',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
      return false;
    }

    try {
      const result = await Swal.fire({
        title: 'Confirmar Cambio',
        html: `
          <div class="text-left">
            <div class="bg-yellow-50 p-4 rounded-lg mb-4">
              <p class="text-sm text-gray-600 mb-2">Vas a actualizar:</p>
              <p class="text-xl font-bold text-gray-800">${getTipoLabel(tipo)}</p>
            </div>
            <div class="flex justify-between items-center text-lg">
              <span class="text-gray-600">Valor actual:</span>
              <span class="font-bold text-gray-500">$${getTarifaActual(tipo).toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center text-2xl mt-2">
              <span class="text-gray-600">Nuevo valor:</span>
              <span class="font-bold text-green-600">$${valorNumerico.toLocaleString()}</span>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '✅ Sí, actualizar',
        cancelButtonText: '❌ Cancelar'
      });

      if (result.isConfirmed) {
        await updateTarifa(tipo, valorNumerico);
        
        await Swal.fire({
          title: '¡Tarifa Actualizada!',
          html: `
            <div class="text-center">
              <div class="text-6xl mb-4">💰</div>
              <p class="text-lg mb-2">La tarifa de ${getTipoLabel(tipo)} ha sido actualizada</p>
              <p class="text-2xl font-bold text-green-600">$${valorNumerico.toLocaleString()}</p>
              <p class="text-sm text-gray-500 mt-2">Los cambios aplican inmediatamente</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar',
          timer: 2500,
          timerProgressBar: true
        });
        
        cargar();
        setEditando(null);
        if (onActionSuccess) onActionSuccess(`Tarifa de ${getTipoLabel(tipo)} actualizada`);
        return true;
      }
    } catch (e) {
      await Swal.fire({
        title: 'Error',
        text: e.message || 'Error al actualizar la tarifa',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
    }
  };

  const handleChangeDevKey = async () => {
    const { value: claveActual } = await Swal.fire({
      title: 'Validar Acceso',
      text: 'Ingrese la clave de desarrollador actual:',
      input: 'password',
      inputPlaceholder: 'Clave actual...',
      showCancelButton: true,
      confirmButtonText: 'Validar',
      confirmButtonColor: '#4F46E5'
    });

    if (!claveActual) return;

    try {
      const { data } = await supabase
        .from('configuracion')
        .select('valor_texto')
        .eq('tipo_vehiculo', 'dev_key')
        .maybeSingle();
      
      const realKey = (data && data.valor_texto) || 'ChrizDev07';

      if (claveActual !== realKey) {
        return Swal.fire('Error', 'La clave actual es incorrecta', 'error');
      }

      const { value: nuevaClave } = await Swal.fire({
        title: 'Nueva Clave',
        text: 'Ingrese la nueva clave de desarrollador:',
        input: 'text',
        inputPlaceholder: 'Nueva clave...',
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        confirmButtonColor: '#10B981'
      });

      if (nuevaClave) {
        await updateDevKey(nuevaClave);
        Swal.fire('¡Éxito!', 'La clave ha sido actualizada.', 'success');
        if (onActionSuccess) onActionSuccess('Clave de desarrollador actualizada');
      }
    } catch (e) {
      Swal.fire('Error', e.message, 'error');
    }
  };

  const getTipoLabel = (tipo) => {
    switch(tipo) {
      case 'carro': return 'Automóviles';
      case 'moto': return 'Motocicletas';
      case 'informal': return 'Negocios Informales';
      case 'limite_dias_informal': return 'Límite de Días (Informales)';
      default: return tipo;
    }
  };

  const getTipoIcon = (tipo) => {
    switch(tipo) {
      case 'carro': return <Car className="text-blue-500" size={28} />;
      case 'moto': return <Bike className="text-orange-500" size={28} />;
      case 'informal': return <Store className="text-purple-500" size={28} />;
      case 'limite_dias_informal': return <AlertCircle className="text-red-500" size={28} />;
      default: return <Settings size={28} />;
    }
  };

  const getTarifaActual = (tipo) => {
    const tarifa = tarifas.find(t => t.tipo_vehiculo === tipo);
    return tarifa ? tarifa.valor_fraccion : 0;
  };

  const getColorGradient = (tipo) => {
    switch(tipo) {
      case 'carro': return 'from-blue-500 to-blue-600';
      case 'moto': return 'from-orange-500 to-orange-600';
      case 'informal': return 'from-purple-500 to-purple-600';
      case 'limite_dias_informal': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const calcularIngresosPotenciales = () => {
    const tarifaCarro = getTarifaActual('carro');
    const tarifaMoto = getTarifaActual('moto');
    const tarifaInformal = getTarifaActual('informal');
    
    return {
      porHora: tarifaCarro + tarifaMoto,
      porDia: tarifaInformal,
      total: tarifaCarro + tarifaMoto + tarifaInformal
    };
  };

  if (cargando) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-12 max-w-4xl mx-auto"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-500">Cargando configuración...</p>
        </div>
      </motion.div>
    );
  }

  const ingresos = calcularIngresosPotenciales();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 mb-8 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <Settings className="text-purple-400" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">Configuración Global</h2>
              <p className="text-gray-300 mt-1">Gestión de tarifas y parametrización del sistema</p>
            </div>
          </div>
          
          <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm">Sistema configurado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de información rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-semibold">Ingresos por hora</p>
              <p className="text-2xl font-bold text-blue-900">${ingresos.porHora.toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-1">Carro + Moto</p>
            </div>
            <Clock className="text-blue-500" size={32} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-semibold">Informales por día</p>
              <p className="text-2xl font-bold text-purple-900">${ingresos.porDia.toLocaleString()}</p>
              <p className="text-xs text-purple-500 mt-1">Por cada negocio</p>
            </div>
            <Store className="text-purple-500" size={32} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-semibold">Potencial diario</p>
              <p className="text-2xl font-bold text-green-900">${ingresos.total.toLocaleString()}</p>
              <p className="text-xs text-green-500 mt-1">Base por todos los servicios</p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </motion.div>
      </div>

      {/* Lista de tarifas */}
      <div className="space-y-4">
        <AnimatePresence>
          {tarifas.map((t, index) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              className={`bg-gradient-to-r ${getColorGradient(t.tipo_vehiculo)} rounded-2xl shadow-lg overflow-hidden`}
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      {getTipoIcon(t.tipo_vehiculo)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white capitalize">
                        {getTipoLabel(t.tipo_vehiculo)}
                      </h3>
                      <p className="text-white/80 text-sm mt-1">
                        {t.tipo_vehiculo === 'informal' 
                          ? 'Valor cobrado por cada día calendario a negocios informales' 
                          : `Tarifa por hora o fracción para ${t.tipo_vehiculo === 'carro' ? 'automóviles' : 'motocicletas'}`}
                      </p>
                    </div>
                  </div>

                  {editando === t.id ? (
                    <div className="flex items-center gap-3">
                      <div className="bg-white rounded-lg p-2 flex items-center">
                        {t.tipo_vehiculo !== 'limite_dias_informal' && <span className="text-gray-600 font-bold text-xl mr-2">$</span>}
                        <input 
                          type="number" 
                          value={valorEdit}
                          onChange={(e) => setValorEdit(e.target.value)}
                          className="w-32 text-2xl font-mono font-bold text-purple-600 text-right focus:outline-none"
                          autoFocus
                        />
                        <span className="text-gray-500 ml-2 font-medium">
                          {t.tipo_vehiculo === 'informal' ? '/día' : t.tipo_vehiculo === 'limite_dias_informal' ? ' días' : '/hora'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUpdate(t.tipo_vehiculo, valorEdit)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                      >
                        <CheckCircle size={18} /> Guardar
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                        <div className="flex items-baseline gap-2">
                          {t.tipo_vehiculo !== 'limite_dias_informal' && <span className="text-white/80 text-lg">$</span>}
                          <span className="text-4xl font-black text-white">
                            {t.valor_fraccion.toLocaleString()}
                          </span>
                          <span className="text-white/80 text-sm ml-1">
                            {t.tipo_vehiculo === 'informal' ? '/día' : t.tipo_vehiculo === 'limite_dias_informal' ? ' días' : '/hora'}
                          </span>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditando(t.id);
                          setValorEdit(t.valor_fraccion.toString());
                        }}
                        className="bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-lg flex items-center gap-2 transition-all backdrop-blur-sm"
                      >
                        <Edit2 size={18} /> Editar
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Nota informativa */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200"
      >
        <div className="flex gap-3 items-start">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Info className="text-white" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Información importante</h4>
            <p className="text-sm text-blue-800">
              Los cambios en las tarifas se aplicarán de inmediato a todos los vehículos activos que aún no han salido del sistema.
              Las nuevas tarifas afectarán los cálculos de cobro en tiempo real.
            </p>
            <div className="mt-2 flex gap-2 text-xs text-blue-600">
              <span className="flex items-center gap-1">✓ Actualización inmediata</span>
              <span className="flex items-center gap-1">✓ Aplica a vehículos activos</span>
              <span className="flex items-center gap-1">✓ Historial preservado</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Botón de Clave Desarrollador */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleChangeDevKey}
          className="flex items-center gap-2 text-gray-400 hover:text-indigo-400 text-xs transition-colors bg-gray-800/30 px-4 py-2 rounded-full border border-gray-700/50"
        >
          <Key size={14} /> Cambiar Clave de Desarrollador
        </button>
      </div>

      {/* Footer con detector de clics para modo desarrollador */}
      <motion.div 
        ref={footerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center text-gray-500 text-sm cursor-pointer select-none"
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <div className="inline-block px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          UPARQUEO by ChrizDev - Sistema de Gestión de Parqueaderos v2.0
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModuloAjustes;