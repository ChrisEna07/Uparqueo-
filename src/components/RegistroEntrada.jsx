import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { registrarEntrada } from '../services/parqueoService';
import { getTarifas } from '../services/parqueoService';
import { Car, Bike, Save, AlertCircle, CheckCircle, Clock, User, Hash, DollarSign } from 'lucide-react';
import Swal from 'sweetalert2';

const RegistroEntrada = ({ onRegistroExitoso }) => {
  const [placa, setPlaca] = useState('');
  const [cliente, setCliente] = useState('');
  const [tipo, setTipo] = useState('carro');
  const [cargando, setCargando] = useState(false);
  const [errors, setErrors] = useState({});
  const [tarifas, setTarifas] = useState({
    carro: 2000,
    moto: 1000
  });
  const [cargandoTarifas, setCargandoTarifas] = useState(true);

  // Cargar tarifas desde la base de datos
  const cargarTarifas = async () => {
    try {
      const tarifasData = await getTarifas();
      const tarifasMap = {};
      tarifasData.forEach(t => {
        if (t.tipo_vehiculo === 'carro' || t.tipo_vehiculo === 'moto') {
          tarifasMap[t.tipo_vehiculo] = t.valor_fraccion;
        }
      });
      setTarifas(tarifasMap);
    } catch (error) {
      console.error('Error cargando tarifas:', error);
    } finally {
      setCargandoTarifas(false);
    }
  };

  useEffect(() => {
    cargarTarifas();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!placa.trim()) {
      newErrors.placa = 'La placa es obligatoria';
    } else if (placa.length < 4 || placa.length > 7) {
      newErrors.placa = 'La placa debe tener entre 4 y 7 caracteres';
    } else if (!/^[A-Z0-9]+$/.test(placa)) {
      newErrors.placa = 'Solo letras mayúsculas y números';
    }
    
    if (cliente && cliente.length > 50) {
      newErrors.cliente = 'El nombre no puede exceder 50 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      await Swal.fire({
        title: 'Error de validación',
        text: Object.values(errors)[0],
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Corregir',
        timer: 3000,
        timerProgressBar: true
      });
      return;
    }
    
    setCargando(true);
    
    try {
      await registrarEntrada(placa, cliente, tipo);
      
      await Swal.fire({
        title: '¡Registro Exitoso!',
        html: `
          <div class="text-center">
            <div class="text-6xl mb-4">
              ${tipo === 'carro' ? '🚗' : '🏍️'}
            </div>
            <p class="text-lg mb-2">Vehículo registrado correctamente</p>
            <div class="bg-gray-50 p-3 rounded-lg mt-3">
              <p class="font-bold text-xl text-blue-600">${placa}</p>
              ${cliente ? `<p class="text-sm text-gray-600 mt-1">Cliente: ${cliente}</p>` : ''}
              <p class="text-xs text-gray-500 mt-2">${new Date().toLocaleTimeString()}</p>
            </div>
            <div class="mt-3 bg-green-50 p-2 rounded-lg">
              <p class="text-sm text-green-700">Tarifa: $${tarifas[tipo].toLocaleString()} por hora o fracción</p>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Aceptar',
        timer: 3500,
        timerProgressBar: true,
        showConfirmButton: true
      });
      
      setPlaca('');
      setCliente('');
      setErrors({});
      
      if (onRegistroExitoso) onRegistroExitoso();
      
    } catch (error) {
      console.error(error);
      await Swal.fire({
        title: 'Error al registrar',
        text: error.message || 'Ocurrió un error al registrar el vehículo',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Intentar nuevamente'
      });
    } finally {
      setCargando(false);
    }
  };

  const handlePlacaChange = (e) => {
    const value = e.target.value.toUpperCase();
    setPlaca(value);
    if (errors.placa) {
      setErrors({ ...errors, placa: '' });
    }
  };

  if (cargandoTarifas) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-8"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Cargando tarifas...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
    >
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Save className="text-white" size={24} />
              Nueva Entrada
            </h2>
            <p className="text-blue-100 text-sm mt-1">Registro de vehículos al parqueadero</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
            <div className="flex items-center gap-1 text-white text-sm">
              <Clock size={14} />
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Campo de Placa - Usando clases globales */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Hash size={16} className="text-blue-500" />
            Placa del Vehículo *
          </label>
          <div className="input-icon-container">
            <div className="input-icon">
              <Hash size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={placa}
              onChange={handlePlacaChange}
              placeholder="Ej: ABC123"
              className={`input-with-icon ${errors.placa ? 'border-red-500 bg-red-50' : ''}`}
              maxLength={7}
              autoFocus
              disabled={cargando}
            />
          </div>
          <AnimatePresence>
            {errors.placa && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-red-500 text-xs mt-1 flex items-center gap-1"
              >
                <AlertCircle size={12} />
                {errors.placa}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Campo de Cliente - Usando clases globales */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <User size={16} className="text-blue-500" />
            Nombre del Cliente (Opcional)
          </label>
          <div className="input-icon-container">
            <div className="input-icon">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre completo o empresa"
              className="input-with-icon"
              disabled={cargando}
              maxLength={50}
            />
          </div>
          {cliente && (
            <p className="text-gray-400 text-xs mt-1">
              {cliente.length}/50 caracteres
            </p>
          )}
        </div>

        {/* Selector de Tipo de Vehículo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Tipo de Vehículo
          </label>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              type="button"
              onClick={() => setTipo('carro')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all ${
                tipo === 'carro' 
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
              disabled={cargando}
            >
              <div className="flex flex-col items-center gap-2">
                <Car size={40} className={tipo === 'carro' ? 'text-blue-600' : 'text-gray-400'} />
                <span className={`font-bold ${tipo === 'carro' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Automóvil
                </span>
                <div className={`text-xs flex items-center gap-1 ${tipo === 'carro' ? 'text-blue-500' : 'text-gray-400'}`}>
                  <DollarSign size={12} />
                  {tarifas.carro.toLocaleString()} / hora
                </div>
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setTipo('moto')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all ${
                tipo === 'moto' 
                  ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg' 
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
              disabled={cargando}
            >
              <div className="flex flex-col items-center gap-2">
                <Bike size={40} className={tipo === 'moto' ? 'text-orange-600' : 'text-gray-400'} />
                <span className={`font-bold ${tipo === 'moto' ? 'text-orange-600' : 'text-gray-500'}`}>
                  Motocicleta
                </span>
                <div className={`text-xs flex items-center gap-1 ${tipo === 'moto' ? 'text-orange-500' : 'text-gray-400'}`}>
                  <DollarSign size={12} />
                  {tarifas.moto.toLocaleString()} / hora
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">Información importante:</p>
              <ul className="space-y-1">
                <li>• El cobro se calcula por hora o fracción de hora</li>
                <li>• Tarifa actual: ${tarifas[tipo].toLocaleString()} por hora</li>
                <li>• El tiempo comienza a contar desde el registro</li>
                <li>• Las tarifas se actualizan automáticamente desde configuración</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botón de Registro */}
        <motion.button
          type="submit"
          disabled={cargando}
          whileHover={{ scale: cargando ? 1 : 1.02 }}
          whileTap={{ scale: cargando ? 1 : 0.98 }}
          className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
            cargando 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg'
          }`}
        >
          {cargando ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              REGISTRAR ENTRADA
            </>
          )}
        </motion.button>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-2">
          <div className="flex items-center justify-center gap-2">
            <span>💰 Tarifas actualizadas desde configuración</span>
            <button
              type="button"
              onClick={cargarTarifas}
              className="text-blue-500 hover:text-blue-700 transition-colors"
              title="Actualizar tarifas"
            >
              🔄
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default RegistroEntrada;