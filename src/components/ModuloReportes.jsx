import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Calendar, BarChart2, 
  ChevronRight, ArrowLeft, Printer, Table,
  TrendingUp, Users, Car, Bike, Loader2
} from 'lucide-react';
import { getReportePorFechas } from '../services/parqueoService';
import { getReporteInformal, getHistorialAbonos } from '../services/informalService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const ModuloReportes = ({ selectedModule = 'parqueadero' }) => {
  const [cargando, setCargando] = useState(false);
  const [tipoReporte, setTipoReporte] = useState('diario'); // diario, semanal, mensual
  const [reporteData, setReporteData] = useState(null);
  const [negocioSel, setNegocioSel] = useState(null);
  const [historialAbonos, setHistorialAbonos] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    generarReporte(tipoReporte);
  }, [tipoReporte]);

  const generarReporte = async (tipo) => {
    setCargando(true);
    try {
      if (selectedModule === 'parqueadero') {
        const hoy = new Date();
        let inicio, fin;

        if (tipo === 'diario') {
          inicio = new Date(hoy.setHours(0, 0, 0, 0)).toISOString();
          fin = new Date(hoy.setHours(23, 59, 59, 999)).toISOString();
        } else if (tipo === 'semanal') {
          const haceUnaSemana = new Date(hoy);
          haceUnaSemana.setDate(hoy.getDate() - 7);
          inicio = haceUnaSemana.toISOString();
          fin = new Date().toISOString();
        } else if (tipo === 'mensual') {
          const haceUnMes = new Date(hoy);
          haceUnMes.setMonth(hoy.getMonth() - 1);
          inicio = haceUnMes.toISOString();
          fin = new Date().toISOString();
        }

        const res = await getReportePorFechas(inicio, fin);
        setReporteData(res);
      } else {
        // Reporte de Informales (Resumen actual ya que no hay histórico)
        const res = await getReporteInformal();
        setReporteData(res);
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      Swal.fire('Error', 'No se pudo cargar la información del reporte', 'error');
    } finally {
      setCargando(false);
    }
  };

  const verDetallesAbonos = async (negocio) => {
    setNegocioSel(negocio);
    setCargandoHistorial(true);
    const res = await getHistorialAbonos(negocio.id);
    if (res.success) setHistorialAbonos(res.data);
    setCargandoHistorial(false);
  };

  const exportarPDF = () => {
    if (!reporteData) return;

    const doc = new jsPDF();
    const isParqueo = selectedModule === 'parqueadero';
    const title = `Reporte ${tipoReporte.toUpperCase()} - UPARQUEO (${isParqueo ? 'Parqueo' : 'Informales'})`;
    
    doc.setFontSize(20);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);
    
    if (isParqueo) {
      doc.text(`Total Ingresos: $${(reporteData?.resumen?.totalIngresos || 0).toLocaleString()}`, 14, 38);
      doc.text(`Total Vehículos: ${reporteData?.resumen?.totalVehiculos || 0}`, 14, 46);
    } else {
      doc.text(`Total Recaudado: $${(reporteData?.resumen?.totalRecaudado || 0).toLocaleString()}`, 14, 38);
      doc.text(`Deuda Total: $${(reporteData?.resumen?.totalDeuda || 0).toLocaleString()}`, 14, 46);
    }

    const tableHeaders = isParqueo 
      ? [['Fecha/Hora', 'Placa', 'Tipo', 'Monto', 'Cliente']]
      : [['Negocio', 'Dueño', 'Celular', 'Recaudado', 'Estado']];

    const tableData = reporteData.data.map(reg => {
      if (isParqueo) {
        return [
          reg.entrada ? new Date(reg.entrada).toLocaleString() : '---',
          reg.placa || '---',
          (reg.tipo_vehiculo || '---').toUpperCase(),
          `$${(reg.total_pagar || 0).toLocaleString()}`,
          reg.cliente_nombre || '---'
        ];
      } else {
        return [
          reg.nombre_negocio || '---',
          reg.nombre_cliente || '---',
          reg.celular || '---',
          `$${(reg.abonos || 0).toLocaleString()}`,
          (reg.activo ? 'ACTIVO' : 'INACTIVO')
        ];
      }
    });

    autoTable(doc, {
      startY: 55,
      head: tableHeaders,
      body: tableData,
      headStyles: { fillColor: isParqueo ? [37, 99, 235] : [249, 115, 22] },
      styles: { fontSize: 8 }
    });

    doc.save(`reporte_${selectedModule}_${Date.now()}.pdf`);
  };

  const exportarExcel = () => {
    if (!reporteData) return;
    const isParqueo = selectedModule === 'parqueadero';

    const dataExcel = reporteData.data.map(reg => {
      if (isParqueo) {
        return {
          'Fecha Entrada': reg.entrada ? new Date(reg.entrada).toLocaleString() : '---',
          'Fecha Salida': reg.salida ? new Date(reg.salida).toLocaleString() : '---',
          'Placa': reg.placa,
          'Tipo': (reg.tipo_vehiculo || '').toUpperCase(),
          'Monto Pagado': reg.total_pagar || 0,
          'Nombre Cliente': reg.cliente_nombre || 'N/A'
        };
      } else {
        return {
          'Nombre Negocio': reg.nombre_negocio,
          'Nombre Dueño': reg.nombre_cliente,
          'Celular': reg.celular,
          'Total Recaudado': reg.abonos || 0,
          'Deuda Actual': reg.deuda_acumulada || 0,
          'Estado': reg.activo ? 'Activo' : 'Inactivo',
          'Fecha Inicio': reg.fecha_inicio
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `reporte_${selectedModule}_${Date.now()}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black flex items-center justify-center md:justify-start gap-3">
                <BarChart2 size={32} /> Reportes
              </h2>
              <p className="text-blue-100 mt-1 opacity-80 text-sm">{selectedModule === 'parqueadero' ? 'Gestión de Parqueo' : 'Gestión de Informales'}</p>
            </div>
            {selectedModule === 'parqueadero' && (
              <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20 overflow-x-auto scrollbar-hide">
                {['diario', 'semanal', 'mensual'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTipoReporte(t)}
                    className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-sm font-bold transition-all whitespace-nowrap ${
                      tipoReporte === t 
                      ? 'bg-white text-blue-900 shadow-lg' 
                      : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="p-5 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-100">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-green-500 p-3 rounded-xl text-white shadow-lg shadow-green-200">
                  <TrendingUp size={24} />
                </div>
                <span className="text-green-600 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">Ingresos</span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Recaudado</h3>
              <p className="text-3xl font-black text-gray-900 mt-1">
                ${(selectedModule === 'parqueadero' 
                  ? reporteData?.resumen?.totalIngresos 
                  : reporteData?.resumen?.totalRecaudado)?.toLocaleString() || '0'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-500 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
                  {selectedModule === 'parqueadero' ? <Car size={24} /> : <TrendingUp size={24} />}
                </div>
                <span className="text-blue-600 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                  {selectedModule === 'parqueadero' ? 'Flujo' : 'Estado'}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
                {selectedModule === 'parqueadero' ? 'Vehículos Totales' : 'Deuda Pendiente'}
              </h3>
              <p className="text-3xl font-black text-gray-900 mt-1">
                {selectedModule === 'parqueadero' 
                  ? (reporteData?.resumen?.totalVehiculos || '0')
                  : `$${reporteData?.resumen?.totalDeuda?.toLocaleString() || '0'}`
                }
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 p-6 rounded-2xl border border-purple-100">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-500 p-3 rounded-xl text-white shadow-lg shadow-purple-200">
                  <FileText size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={exportarPDF} className="p-2 bg-white rounded-lg text-red-500 shadow-sm hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </button>
                  <button onClick={exportarExcel} className="p-2 bg-white rounded-lg text-green-600 shadow-sm hover:scale-110 transition-transform">
                    <Table size={18} />
                  </button>
                </div>
              </div>
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Exportar Data</h3>
              <p className="text-sm text-gray-600 mt-2">Descarga el historial completo en formato profesional.</p>
            </div>
          </div>

          {/* Tabla Detallada */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                Historial Detallado
              </h3>
            </div>
            
            {cargando ? (
              <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="font-medium">Procesando información...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-black">
                    {selectedModule === 'parqueadero' ? (
                      <tr>
                        <th className="px-6 py-4">Fecha/Hora</th>
                        <th className="px-6 py-4">Placa</th>
                        <th className="px-6 py-4">Tipo</th>
                        <th className="px-6 py-4">Monto</th>
                        <th className="px-6 py-4">Cliente</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4">Negocio</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Celular</th>
                        <th className="px-6 py-4">Recaudado</th>
                        <th className="px-6 py-4">Estado</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reporteData?.data.map((reg, i) => (
                      <tr key={reg.id} className="hover:bg-blue-50/30 transition-colors">
                        {selectedModule === 'parqueadero' ? (
                          <>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(reg.entrada).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono font-bold bg-gray-200 px-2 py-1 rounded text-gray-700">
                                {reg.placa}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                reg.tipo_vehiculo === 'carro' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {reg.tipo_vehiculo.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900">
                              ${(reg.total_pagar || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reg.cliente_nombre || '---'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 font-bold text-gray-900">{reg.nombre_negocio}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{reg.nombre_cliente}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{reg.celular}</td>
                            <td className="px-6 py-4 font-black text-emerald-600">${(reg.abonos || 0).toLocaleString()}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black ${reg.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {reg.activo ? 'ACTIVO' : 'SUSPENDIDO'}
                                </span>
                                <button 
                                  onClick={() => verDetallesAbonos(reg)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                  title="Ver historial de pagos"
                                >
                                  <FileText size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {reporteData?.data.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400 font-medium italic">
                          No hay registros encontrados en este periodo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      {/* MODAL DETALLES ABONOS */}
      <AnimatePresence>
        {negocioSel && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="bg-gray-900 p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase">{negocioSel.nombre_negocio}</h3>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Historial de Pagos por Fecha</p>
                </div>
                <button onClick={() => setNegocioSel(null)} className="p-2 hover:bg-white/10 rounded-lg"><XIcon size={24}/></button>
              </div>

              <div className="p-8">
                {cargandoHistorial ? (
                   <div className="py-10 text-center text-gray-400 font-bold animate-pulse">Cargando transacciones...</div>
                ) : historialAbonos.length === 0 ? (
                  <div className="py-10 text-center text-gray-300 font-bold uppercase text-xs tracking-widest">Sin abonos registrados aún</div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {historialAbonos.map((h, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="text-xs font-black text-gray-800">{new Date(h.fecha).toLocaleDateString()}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{new Date(h.fecha).toLocaleTimeString()}</p>
                        </div>
                        <p className="text-lg font-black text-emerald-600">+ ${h.monto.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  onClick={() => setNegocioSel(null)}
                  className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

const XIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default ModuloReportes;
