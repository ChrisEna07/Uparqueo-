import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { agregarDiasManuales, desactivarNegocio, calcularDeudaDetallada, registrarAbono } from '../services/informalService';
import { Store, Plus, PowerOff, DollarSign, User, Phone, Building2, Calendar, CreditCard, AlertCircle, Search } from 'lucide-react';
import Swal from 'sweetalert2';

const ModuloInformales = ({ onActionSuccess }) => {
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ nombre_cliente: '', nombre_negocio: '', celular: '' });
  const [montoAbono, setMontoAbono] = useState({});
  const [filtro, setFiltro] = useState('');
  const [estadisticas, setEstadisticas] = useState({ total: 0, deudaTotal: 0, ingresosTotales: 0 });

  const cargarNegocios = async () => {
    setCargando(true);
    const { data } = await supabase.from('negocios_informales').select('*').eq('activo', true);
    const negociosData = data || [];
    setNegocios(negociosData);
    
    let deudaTotal = 0;
    let ingresosTotales = 0;
    negociosData.forEach(n => {
      const { deudaTotal: deuda } = calcularDeudaDetallada(n);
      deudaTotal += deuda;
      ingresosTotales += (n.abonos || 0);
    });
    
    setEstadisticas({
      total: negociosData.length,
      deudaTotal: deudaTotal,
      ingresosTotales: ingresosTotales
    });
    
    setCargando(false);
  };

  useEffect(() => { cargarNegocios(); }, []);

  const handleAbono = async (id, abonosActuales, negocioNombre) => {
    const valor = parseFloat(montoAbono[id]);
    
    if (!valor || valor <= 0 || isNaN(valor)) {
      await Swal.fire({
        title: 'Monto inválido',
        text: 'Por favor ingrese un monto válido mayor a 0',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: 'Confirmar Abono',
        html: `
          <div class="text-left">
            <div class="bg-green-50 p-4 rounded-lg mb-4">
              <p class="text-sm text-gray-600 mb-2">Negocio:</p>
              <p class="text-xl font-bold text-gray-800">${negocioNombre}</p>
            </div>
            <div class="flex justify-between items-center text-lg">
              <span class="text-gray-600">Monto a abonar:</span>
              <span class="text-2xl font-bold text-green-600">$${valor.toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center text-sm mt-2">
              <span class="text-gray-500">Abonos acumulados actuales:</span>
              <span class="font-semibold">$${(abonosActuales || 0).toLocaleString()}</span>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '✅ Registrar Abono',
        cancelButtonText: '❌ Cancelar'
      });

      if (result.isConfirmed) {
        await registrarAbono(id, abonosActuales, valor);
        
        await Swal.fire({
          title: '¡Abono Registrado!',
          html: `
            <div class="text-center">
              <div class="text-6xl mb-4">💰</div>
              <p class="text-lg mb-2">Se ha registrado el abono de</p>
              <p class="text-2xl font-bold text-green-600">$${valor.toLocaleString()}</p>
              <p class="text-sm text-gray-500 mt-2">para ${negocioNombre}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar',
          timer: 2500,
          timerProgressBar: true
        });
        
        setMontoAbono({ ...montoAbono, [id]: '' });
        cargarNegocios();
        if (onActionSuccess) onActionSuccess(`Abono registrado para ${negocioNombre}`);
      }
    } catch (e) {
      await Swal.fire({
        title: 'Error',
        text: e.message || 'Error al registrar el abono',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    
    if (!form.nombre_cliente || !form.nombre_negocio) {
      await Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor complete los campos requeridos',
        icon: 'warning',
        confirmButtonColor: '#F59E0B',
        confirmButtonText: 'Cerrar'
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: 'Registrar Negocio Informal',
        html: `
          <div class="text-left">
            <div class="bg-orange-50 p-4 rounded-lg mb-4">
              <p class="text-sm text-gray-600">Nuevo negocio:</p>
              <p class="font-bold text-lg">${form.nombre_negocio}</p>
              <p class="text-sm">Dueño: ${form.nombre_cliente}</p>
              ${form.celular ? `<p class="text-sm">📱 ${form.celular}</p>` : ''}
            </div>
            <div class="bg-blue-50 p-3 rounded-lg">
              <p class="text-sm text-blue-800">💰 Tarifa: $5,000 por día calendario</p>
            </div>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#F59E0B',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '✅ Registrar',
        cancelButtonText: '❌ Cancelar'
      });

      if (result.isConfirmed) {
        await supabase.from('negocios_informales').insert([form]);
        
        await Swal.fire({
          title: '¡Registro Exitoso!',
          html: `
            <div class="text-center">
              <div class="text-6xl mb-4">🏪</div>
              <p class="text-lg mb-2">Negocio registrado correctamente</p>
              <p class="font-bold text-orange-600">${form.nombre_negocio}</p>
              <p class="text-sm text-gray-500 mt-2">Tarifa: $5,000 por día</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar'
        });
        
        setForm({ nombre_cliente: '', nombre_negocio: '', celular: '' });
        cargarNegocios();
        if (onActionSuccess) onActionSuccess(`Negocio ${form.nombre_negocio} registrado`);
      }
    } catch (e) {
      await Swal.fire({
        title: 'Error',
        text: 'Error al registrar el negocio',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
    }
  };

  const handleAgregarDia = async (id, diasManuales, negocioNombre) => {
    try {
      const result = await Swal.fire({
        title: 'Agregar Día Manual',
        html: `
          <div class="text-center">
            <p class="mb-2">¿Agregar un día adicional a</p>
            <p class="font-bold text-lg">${negocioNombre}</p>
            <p class="text-sm text-gray-500 mt-2">Se añadirá $5,000 a la deuda</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#F59E0B',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '✅ Agregar Día',
        cancelButtonText: '❌ Cancelar'
      });

      if (result.isConfirmed) {
        await agregarDiasManuales(id, diasManuales);
        
        await Swal.fire({
          title: 'Día Agregado',
          html: `
            <div class="text-center">
              <div class="text-4xl mb-2">📅</div>
              <p>Se ha agregado un día a ${negocioNombre}</p>
              <p class="text-lg font-bold text-orange-600 mt-2">+$5,000</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar',
          timer: 2000,
          timerProgressBar: true
        });
        
        cargarNegocios();
        if (onActionSuccess) onActionSuccess(`Día agregado a ${negocioNombre}`);
      }
    } catch (e) {
      await Swal.fire({
        title: 'Error',
        text: 'Error al agregar el día',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Cerrar'
      });
    }
  };

  const handleDesactivar = async (id, negocioNombre) => {
    const result = await Swal.fire({
      title: 'Desactivar Negocio',
      html: `
        <div class="text-center">
          <div class="text-6xl mb-4">⚠️</div>
          <p class="mb-2">¿Estás seguro de desactivar</p>
          <p class="font-bold text-lg text-red-600">${negocioNombre}</p>
          <p class="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '✅ Sí, desactivar',
      cancelButtonText: '❌ Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await desactivarNegocio(id);
        
        await Swal.fire({
          title: 'Negocio Desactivado',
          html: `
            <div class="text-center">
              <div class="text-6xl mb-4">🗑️</div>
              <p>${negocioNombre} ha sido desactivado</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10B981',
          confirmButtonText: 'Aceptar'
        });
        
        cargarNegocios();
        if (onActionSuccess) onActionSuccess(`Negocio ${negocioNombre} desactivado`);
      } catch (e) {
        await Swal.fire({
          title: 'Error',
          text: 'Error al desactivar el negocio',
          icon: 'error',
          confirmButtonColor: '#EF4444',
          confirmButtonText: 'Cerrar'
        });
      }
    }
  };

  const negociosFiltrados = negocios.filter(n => 
    n.nombre_negocio.toLowerCase().includes(filtro.toLowerCase()) ||
    n.nombre_cliente.toLowerCase().includes(filtro.toLowerCase())
  );

  if (cargando) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-12"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-500">Cargando negocios informales...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header con gradiente y estadísticas */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Store className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Negocios Informales</h2>
              <p className="text-orange-100 mt-1">Gestión de cobros y abonos diarios</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-white text-xs">Negocios Activos</div>
              <div className="text-2xl font-bold text-white">{estadisticas.total}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-white text-xs">Deuda Total</div>
              <div className="text-2xl font-bold text-white">${estadisticas.deudaTotal.toLocaleString()}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-white text-xs">Ingresos Totales</div>
              <div className="text-2xl font-bold text-white">${estadisticas.ingresosTotales.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Registro */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Plus size={20} className="text-orange-500" />
            Registrar Nuevo Negocio Informal
          </h3>
          <p className="text-sm text-gray-500 mt-1">Tarifa: $5,000 por día calendario</p>
        </div>
        
        <form onSubmit={handleRegistro} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Campo de Dueño - Usando clases globales */}
            <div className="input-icon-container">
              <div className="input-icon">
                <User size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Nombre del dueño *" 
                className="input-with-icon"
                value={form.nombre_cliente} 
                onChange={e => setForm({...form, nombre_cliente: e.target.value})} 
                required 
              />
            </div>
            
            {/* Campo de Negocio - Usando clases globales */}
            <div className="input-icon-container">
              <div className="input-icon">
                <Building2 size={18} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Nombre del negocio *" 
                className="input-with-icon"
                value={form.nombre_negocio} 
                onChange={e => setForm({...form, nombre_negocio: e.target.value})} 
                required 
              />
            </div>
            
            {/* Campo de Celular - Usando clases globales */}
            <div className="input-icon-container">
              <div className="input-icon">
                <Phone size={18} className="text-gray-400" />
              </div>
              <input 
                type="tel" 
                placeholder="Celular (opcional)" 
                className="input-with-icon"
                value={form.celular} 
                onChange={e => setForm({...form, celular: e.target.value})} 
              />
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-2 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Store size={18} />
            REGISTRAR NEGOCIO
          </motion.button>
        </form>
      </motion.div>

      {/* Filtro de búsqueda - Usando clases globales */}
      <div className="input-icon-container">
        <div className="input-icon">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre de negocio o dueño..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="input-with-icon"
        />
      </div>

      {/* Tabla de Cobros y Abonos */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <AnimatePresence>
            {negociosFiltrados.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 text-center"
              >
                <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 text-lg">No hay negocios registrados</p>
              </motion.div>
            ) : (
              <table className="w-full min-w-[800px]">
                <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
                  <tr>
                    <th className="p-4">Negocio</th>
                    <th className="p-4">Días / Total</th>
                    <th className="p-4">Abonado</th>
                    <th className="p-4">Deuda Pendiente</th>
                    <th className="p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {negociosFiltrados.map((n, index) => {
                    const { diasTotales, deudaTotal } = calcularDeudaDetallada(n);
                    const porcentajePagado = ((n.abonos || 0) / ((diasTotales * 5000) || 1)) * 100;
                    
                    return (
                      <motion.tr
                        key={n.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ backgroundColor: '#FFF7ED' }}
                        className="border-b border-gray-100 transition-colors"
                      >
                        <td className="p-4">
                          <p className="font-bold text-gray-800">{n.nombre_negocio}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <User size={12} /> {n.nombre_cliente}
                          </p>
                          {n.celular && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Phone size={10} /> {n.celular}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="font-semibold">{diasTotales} días</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Total: ${(diasTotales * 5000).toLocaleString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="text-blue-600 font-semibold">
                            ${(n.abonos || 0).toLocaleString()}
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-2xl text-red-600">
                            ${deudaTotal.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <div className="flex-1 input-icon-container">
                                <div className="input-icon">
                                  <DollarSign size={14} className="text-gray-400" />
                                </div>
                                <input 
                                  type="number" 
                                  placeholder="Monto abono"
                                  className="input-with-icon text-sm"
                                  value={montoAbono[n.id] || ''}
                                  onChange={(e) => setMontoAbono({...montoAbono, [n.id]: e.target.value})}
                                />
                              </div>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAbono(n.id, n.abonos, n.nombre_negocio)}
                                className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-all flex items-center gap-1"
                              >
                                <CreditCard size={14} /> Abonar
                              </motion.button>
                            </div>
                            <div className="flex gap-2">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAgregarDia(n.id, n.dias_manuales, n.nombre_negocio)} 
                                className="flex-1 bg-gray-100 text-gray-700 text-sm py-1.5 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-1"
                              >
                                <Plus size={12}/> Día
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDesactivar(n.id, n.nombre_negocio)} 
                                className="flex-1 bg-red-50 text-red-600 text-sm py-1.5 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                              >
                                <PowerOff size={12}/> Desactivar
                              </motion.button>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </AnimatePresence>
        </div>
        
        {/* Footer */}
        {negociosFiltrados.length > 0 && (
          <div className="bg-gray-50 p-4 border-t">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Mostrando {negociosFiltrados.length} de {negocios.length} negocios activos</span>
              <div className="flex gap-2">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Tarifa diaria: $5,000
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ModuloInformales;