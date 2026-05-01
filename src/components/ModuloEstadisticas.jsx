import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { TrendingUp, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, Store, Car, DollarSign, X, Receipt } from 'lucide-react';
import { calcularDeudaDetallada } from '../services/informalService';

const ModuloEstadisticas = () => {
  const [cargando, setCargando] = useState(true);
  
  const [ingresos, setIngresos] = useState({ dia: 0, semana: 0, mes: 0 });
  const [gastosStats, setGastosStats] = useState({ dia: 0, semana: 0, mes: 0 });
  const [ingresosList, setIngresosList] = useState({ dia: [], semana: [], mes: [] });
  
  const [deudoresParqueo, setDeudoresParqueo] = useState([]);
  const [informalesAlDia, setInformalesAlDia] = useState([]);
  
  // Modal de detalles
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalTipo, setModalTipo] = useState(''); // 'dia', 'semana', 'mes'
  const [modalDatos, setModalDatos] = useState([]);

  const cargarDatos = async () => {
    setCargando(true);
    
    // 1. Fechas de referencia
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0,0,0,0);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // 2. Cargar Ingresos Parqueadero
    const { data: parqueos, error: errParqueo } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('estado', 'finalizado')
      .gte('salida', inicioMes.toISOString())
      .order('salida', { ascending: false });

    let sumDia = 0, sumSemana = 0, sumMes = 0;
    let listDia = [], listSemana = [], listMes = [];
    
    if (!errParqueo && parqueos) {
      parqueos.forEach(reg => {
        const fechaSalida = new Date(reg.salida);
        const monto = reg.total_pagar || 0;
        listMes.push(reg);
        sumMes += monto;
        if (fechaSalida >= inicioSemana) { listSemana.push(reg); sumSemana += monto; }
        if (fechaSalida >= hoy) { listDia.push(reg); sumDia += monto; }
      });
    }

    // 3. Cargar Egresos (Gastos)
    const { data: egresos, error: errEgresos } = await supabase
      .from('egresos')
      .select('*')
      .gte('created_at', inicioMes.toISOString());

    let gDia = 0, gSemana = 0, gMes = 0;
    if (!errEgresos && egresos) {
      egresos.forEach(g => {
        const fecha = new Date(g.created_at);
        const monto = Number(g.monto) || 0;
        gMes += monto;
        if (fecha >= inicioSemana) gSemana += monto;
        if (fecha >= hoy) gDia += monto;
      });
    }

    setIngresos({ dia: sumDia, semana: sumSemana, mes: sumMes });
    setGastosStats({ dia: gDia, semana: gSemana, mes: gMes });
    setIngresosList({ dia: listDia, semana: listSemana, mes: listMes });

    // 4. Control de Deudores Críticos
    const limiteDiasParqueo = new Date();
    limiteDiasParqueo.setDate(limiteDiasParqueo.getDate() - 7);

    const { data: activosParqueo, error: errActivos } = await supabase
      .from('registros_parqueadero')
      .select('*')
      .eq('estado', 'activo')
      .lte('entrada', limiteDiasParqueo.toISOString())
      .order('entrada', { ascending: true });

    if (!errActivos && activosParqueo) setDeudoresParqueo(activosParqueo);

    // 5. Negocios Informales al día
    const { data: informales, error: errInf } = await supabase
      .from('negocios_informales')
      .select('*')
      .eq('activo', true);

    const alDia = [];
    if (!errInf && informales) {
      informales.forEach(n => {
        const { deudaTotal } = calcularDeudaDetallada(n);
        if (deudaTotal <= 0) alDia.push(n);
      });
    }

    setInformalesAlDia(alDia);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModal = (tipo) => {
    setModalTipo(tipo);
    setModalDatos(ingresosList[tipo] || []);
    setModalAbierto(true);
  };

  if (cargando) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
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
      <div className="bg-gradient-to-r from-green-800 to-green-900 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2">Panel de Estadísticas</h2>
          <p className="text-green-100">Control financiero y seguimiento de pagos en tiempo real.</p>
        </div>
      </div>

      {/* Cards Financieras Responsivas */}
      {['dia', 'semana', 'mes'].map((periodo) => {
        const balance = ingresos[periodo] - gastosStats[periodo];
        const config = {
          dia: { label: 'Hoy', color: 'blue', icon: Clock },
          semana: { label: 'Esta Semana', color: 'indigo', icon: CalendarIcon },
          mes: { label: 'Este Mes', color: 'emerald', icon: TrendingUp }
        }[periodo];
        const Icon = config.icon;

        return (
          <div key={periodo} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-2 h-full bg-${config.color}-500`}></div>
            
            <div className="flex flex-col md:flex-row justify-between gap-8">
              {/* Sección Principal: Balance */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`bg-${config.color}-50 p-4 rounded-2xl`}>
                    <Icon className={`text-${config.color}-500`} size={28} />
                  </div>
                  <div>
                    <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest">{config.label}</h3>
                    <p className="text-3xl font-black text-gray-900">Balance: ${balance.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos</p>
                    <p className="text-xl font-black text-emerald-700">${ingresos[periodo].toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Gastos</p>
                    <p className="text-xl font-black text-rose-700">-${gastosStats[periodo].toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Botón de Acción */}
              <div className="flex flex-col justify-center">
                <button 
                  onClick={() => abrirModal(periodo)}
                  className={`px-6 py-4 bg-${config.color}-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-${config.color}-100 transition-all active:scale-95`}
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Deudores y Control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Deudores Parqueadero (> 7 dias) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
            <AlertTriangle className="text-red-500" />
            <div>
              <h3 className="font-bold text-red-900 text-lg">Deudores Críticos (Parqueadero)</h3>
              <p className="text-xs text-red-700">Vehículos con más de 7 días sin pagar/salir</p>
            </div>
            <span className="ml-auto bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
              {deudoresParqueo.length}
            </span>
          </div>
          <div className="p-0">
            {deudoresParqueo.length === 0 ? (
              <p className="p-6 text-center text-gray-500">No hay vehículos con más de 7 días atrasados 🎉</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {deudoresParqueo.map(d => {
                  const dias = Math.floor((new Date() - new Date(d.entrada)) / (1000 * 60 * 60 * 24));
                  return (
                    <li key={d.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full text-red-500">
                          <Car size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{d.placa}</p>
                          <p className="text-xs text-gray-500">{d.cliente_nombre || 'Cliente Ocasional'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{dias} días</p>
                        <p className="text-xs text-gray-400">En parqueo</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Informales Al Día */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
            <CheckCircle className="text-green-600" />
            <div>
              <h3 className="font-bold text-green-900 text-lg">Negocios Informales al Día</h3>
              <p className="text-xs text-green-700">Negocios sin deudas pendientes</p>
            </div>
            <span className="ml-auto bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm font-bold">
              {informalesAlDia.length}
            </span>
          </div>
          <div className="p-0">
            {informalesAlDia.length === 0 ? (
              <p className="p-6 text-center text-gray-500">Aún no hay clientes al día.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {informalesAlDia.slice(0, 10).map(d => (
                  <li key={d.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded-full text-green-600">
                        <Store size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{d.nombre_negocio}</p>
                        <p className="text-xs text-gray-500">{d.nombre_cliente}</p>
                      </div>
                    </div>
                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      Saldo: $0
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Modal Detalles de Ingresos */}
      <AnimatePresence>
        {modalAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="bg-gray-50 p-6 flex justify-between items-center border-b border-gray-100">
                <div>
                  <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <Receipt className="text-blue-500" />
                    Historial de Ingresos
                  </h3>
                  <p className="text-gray-500 font-medium">
                    Filtro: {modalTipo === 'dia' ? 'Hoy' : modalTipo === 'semana' ? 'Esta Semana' : 'Este Mes'}
                  </p>
                </div>
                <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={28} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-0">
                {modalDatos.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No hay registros de ingresos para este periodo.
                  </div>
                ) : (
                  <>
                    {/* VISTA PARA MÓVILES */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {modalDatos.map(reg => (
                        <div key={reg.id} className="p-4 flex justify-between items-center bg-white">
                          <div>
                            <p className="font-black text-gray-800 text-sm">{reg.placa}</p>
                            <p className="text-[10px] text-gray-400">{new Date(reg.salida).toLocaleString()}</p>
                          </div>
                          <p className="font-black text-green-600 text-sm">${reg.total_pagar?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* VISTA PARA DESKTOP */}
                    <table className="hidden md:table w-full text-left border-collapse">
                      <thead className="bg-gray-50 sticky top-0 shadow-sm">
                        <tr>
                          <th className="p-4 font-bold text-gray-600 text-sm">Placa</th>
                          <th className="p-4 font-bold text-gray-600 text-sm">Cliente</th>
                          <th className="p-4 font-bold text-gray-600 text-sm">Fecha Salida</th>
                          <th className="p-4 font-bold text-gray-600 text-sm text-right">Monto Pagado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {modalDatos.map(reg => (
                          <tr key={reg.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="p-4 font-bold text-gray-800">{reg.placa}</td>
                            <td className="p-4 text-gray-600">{reg.cliente_nombre || '---'}</td>
                            <td className="p-4 text-gray-600">{new Date(reg.salida).toLocaleString()}</td>
                            <td className="p-4 font-bold text-green-600 text-right">
                              ${reg.total_pagar?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end">
                <p className="font-bold text-gray-800 text-lg">
                  Total Recaudado: <span className="text-green-600">${ingresos[modalTipo].toLocaleString()}</span>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ModuloEstadisticas;
