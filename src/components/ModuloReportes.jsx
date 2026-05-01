import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Calendar, BarChart2, 
  ChevronRight, ArrowLeft, Printer, Table,
  TrendingUp, Users, Car, Bike, Loader2, Store, Plus,
  Search, ShieldAlert
} from 'lucide-react';
import { getReportePorFechas } from '../services/parqueoService';
import { getReporteInformal, getHistorialAbonos } from '../services/informalService';
import { getAuditoria } from '../services/auditService';
import { getGastosPorFechas } from '../services/gastosService';
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
  const [auditoriaData, setAuditoriaData] = useState([]);
  const [busquedaAuditoria, setBusquedaAuditoria] = useState('');
  const [pestañaSecundaria, setPestañaSecundaria] = useState('general');

  // Helper para filtro de fechas en interfaz
  const fechasFiltro = (() => {
    const hoy = new Date();
    if (tipoReporte === 'diario') {
      const hoyStr = hoy.toISOString().split('T')[0];
      return { inicio: hoyStr, fin: hoyStr };
    } else if (tipoReporte === 'semanal') {
      const haceUnaSemana = new Date(hoy);
      haceUnaSemana.setDate(hoy.getDate() - 7);
      return { inicio: haceUnaSemana.toISOString().split('T')[0], fin: hoy.toISOString().split('T')[0] };
    } else {
      const haceUnMes = new Date(hoy);
      haceUnMes.setMonth(hoy.getMonth() - 1);
      return { inicio: haceUnMes.toISOString().split('T')[0], fin: hoy.toISOString().split('T')[0] };
    }
  })();

  useEffect(() => {
    generarReporte(tipoReporte);
    cargarAuditoria();
  }, [tipoReporte, selectedModule]);

  const cargarAuditoria = async () => {
    setCargando(true);
    // Traer auditoría de todos los módulos para una trazabilidad completa
    const { data: dataInf } = await getAuditoria('informales');
    const { data: dataParq } = await getAuditoria('parqueadero');
    const { data: dataGastos } = await getAuditoria('gastos');
    
    const combinada = [...(dataInf || []), ...(dataParq || []), ...(dataGastos || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
    setAuditoriaData(combinada);
    setCargando(false);
  };

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
        
        // Obtener gastos del mismo periodo
        const { data: gastos } = await getGastosPorFechas(inicio, fin);
        const sumGastos = (gastos || []).reduce((acc, g) => acc + Number(g.monto), 0);
        
        setReporteData({
          ...res,
          resumen: {
            ...res.resumen,
            totalGastos: sumGastos,
            balanceNeto: (res.resumen.totalIngresos || 0) - sumGastos
          },
          gastos: gastos || []
        });
      } else {
        // Reporte de Informales
        const res = await getReporteInformal();
        
        // Para informales, el "balance hoy" también debe restar gastos de hoy
        const hoy = new Date();
        const inicio = new Date(hoy.setHours(0,0,0,0)).toISOString();
        const fin = new Date(hoy.setHours(23,59,59,999)).toISOString();
        const { data: gastosHoy } = await getGastosPorFechas(inicio, fin);
        const sumGastos = (gastosHoy || []).reduce((acc, g) => acc + Number(g.monto), 0);

        setReporteData({
          ...res,
          resumen: {
            ...res.resumen,
            totalGastos: sumGastos,
            balanceNeto: (res.resumen.totalRecaudado || 0) - sumGastos
          },
          gastos: gastosHoy || []
        });
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
    const title = `REPORTE ${tipoReporte.toUpperCase()} - UPARQUEO`;
    const subtitle = isParqueo ? 'GESTIÓN DE PARQUEADERO' : 'GESTIÓN DE NEGOCIOS INFORMALES';
    
    // Header Estilizado
    doc.setFillColor(isParqueo ? 37 : 249, isParqueo ? 99 : 115, isParqueo ? 235 : 22);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 25);
    doc.setFontSize(10);
    doc.text(subtitle, 14, 32);
    
    // Resumen Financiero
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('RESUMEN FINANCIERO', 14, 55);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const bruto = isParqueo ? (reporteData?.resumen?.totalIngresos || 0) : (reporteData?.resumen?.totalRecaudado || 0);
    const gastos = reporteData?.resumen?.totalGastos || 0;
    const neto = reporteData?.resumen?.balanceNeto || 0;

    doc.text(`(+) Ingresos Brutos:`, 14, 65);
    doc.text(`$${bruto.toLocaleString()}`, 100, 65, { align: 'right' });
    
    doc.setTextColor(220, 0, 0);
    doc.text(`(-) Gastos/Egresos:`, 14, 72);
    doc.text(`$${gastos.toLocaleString()}`, 100, 72, { align: 'right' });
    
    doc.setLineWidth(0.5);
    doc.line(14, 75, 100, 75);
    
    doc.setTextColor(0, 120, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`(=) BALANCE NETO:`, 14, 82);
    doc.text(`$${neto.toLocaleString()}`, 100, 82, { align: 'right' });

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado por: Uparqueo System`, 14, 92);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 97);

    // Tabla de Ingresos
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(isParqueo ? 'DETALLE DE VEHÍCULOS' : 'DETALLE DE RECAUDOS', 14, 110);

    const tableHeaders = isParqueo 
      ? [['Fecha/Hora', 'Placa', 'Tipo', 'Monto', 'Usuario']]
      : [['Negocio', 'Dueño', 'Celular', 'Abonado', 'Estado']];

    const tableData = reporteData.data.map(reg => {
      if (isParqueo) {
        return [
          reg.entrada ? new Date(reg.entrada).toLocaleString() : '---',
          reg.placa || '---',
          (reg.tipo_vehiculo || '---').toUpperCase(),
          `$${(reg.total_pagar || 0).toLocaleString()}`,
          reg.usuario_recibe || reg.registrado_por || '---'
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
      startY: 115,
      head: tableHeaders,
      body: tableData,
      headStyles: { fillColor: isParqueo ? [37, 99, 235] : [249, 115, 22] },
      styles: { fontSize: 8 }
    });

    // Tabla de Gastos (Si existen)
    if (reporteData.gastos && reporteData.gastos.length > 0) {
      const finalY = doc.lastAutoTable.finalY || 150;
      doc.setFontSize(12);
      doc.text('DETALLE DE GASTOS / EGRESOS', 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Fecha', 'Descripción', 'Categoría', 'Monto', 'Usuario']],
        body: reporteData.gastos.map(g => [
          new Date(g.created_at).toLocaleString(),
          g.descripcion,
          g.categoria,
          `$${Number(g.monto).toLocaleString()}`,
          g.registrado_por
        ]),
        headStyles: { fillColor: [225, 29, 72] }, // Rose-600
        styles: { fontSize: 8 }
      });
    }

    doc.save(`reporte_final_${tipoReporte}_${Date.now()}.pdf`);
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
          'Usuario Recibe': reg.usuario_recibe || reg.registrado_por || '---',
          'Nombre Cliente': reg.cliente_nombre || 'N/A'
        };
      } else {
        return {
          'Nombre Negocio': reg.nombre_negocio,
          'Nombre Dueño': reg.nombre_cliente,
          'Celular': reg.celular,
          'Total Recaudado': reg.abonos || 0,
          'Usuario': reg.registrado_por || '---',
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

        {/* Pestañas Principales */}
        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setPestañaSecundaria('general')}
            className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-all ${pestañaSecundaria === 'general' ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            Vista General
          </button>
          <button 
            onClick={() => setPestañaSecundaria('auditoria')}
            className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-all ${pestañaSecundaria === 'auditoria' ? 'text-purple-600 border-b-4 border-purple-600 bg-purple-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            Historial de Novedades
          </button>
        </div>

        {pestañaSecundaria === 'general' && (
          <>
            {/* Resumen Cards */}
            <div className="p-5 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {/* INGRESO BRUTO */}
            <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                <TrendingUp size={60} />
              </div>
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Recaudado Bruto</h3>
              <p className="text-2xl font-black text-gray-800 mt-2">
                ${(selectedModule === 'parqueadero' 
                  ? reporteData?.resumen?.totalIngresos 
                  : reporteData?.resumen?.totalRecaudado)?.toLocaleString() || '0'}
              </p>
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full mt-3 inline-block">Suma total de caja</span>
            </div>

            {/* GASTOS */}
            <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden group hover:border-rose-200 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                <TrendingUp size={60} className="rotate-180" />
              </div>
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Gastos / Egresos</h3>
              <p className="text-2xl font-black text-rose-600 mt-2">
                -${(reporteData?.resumen?.totalGastos || 0).toLocaleString()}
              </p>
              <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full mt-3 inline-block">Dinero que salió</span>
            </div>

            {/* BALANCE NETO */}
            <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform">
                <BarChart2 size={60} className="text-white" />
              </div>
              <h3 className="text-white/60 text-[10px] font-black uppercase tracking-widest">Balance Neto</h3>
              <p className="text-2xl font-black text-white mt-2">
                ${(reporteData?.resumen?.balanceNeto || 0).toLocaleString()}
              </p>
              <span className="text-[9px] font-bold text-white bg-white/20 px-2 py-1 rounded-full mt-3 inline-block">Utilidad Real</span>
            </div>

            {/* EXPORTAR */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-3xl border border-blue-100 flex flex-col justify-center gap-3">
              <div className="flex gap-3">
                <button 
                  onClick={exportarPDF} 
                  className="flex-1 bg-white p-3 rounded-2xl text-rose-600 shadow-sm hover:bg-rose-600 hover:text-white transition-all flex flex-col items-center gap-1 border border-rose-100"
                >
                  <FileText size={20} />
                  <span className="text-[8px] font-black uppercase">PDF</span>
                </button>
                <button 
                  onClick={exportarExcel} 
                  className="flex-1 bg-white p-3 rounded-2xl text-emerald-600 shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex flex-col items-center gap-1 border border-emerald-100"
                >
                  <Table size={20} />
                  <span className="text-[8px] font-black uppercase">EXCEL</span>
                </button>
              </div>
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
            <>
              {/* VISTA PARA MÓVILES (CARDS) */}
              <div className="md:hidden space-y-4 p-4">
                {reporteData?.data.map((reg) => (
                  <div key={reg.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded text-gray-700 text-xs">
                        {selectedModule === 'parqueadero' ? reg.placa : reg.nombre_negocio}
                      </span>
                      <span className="text-lg font-black text-gray-900">
                        ${(selectedModule === 'parqueadero' ? (reg.total_pagar || 0) : (reg.abonos || 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-2">
                      <span>{new Date(reg.entrada || reg.created_at).toLocaleString()}</span>
                      <span className="font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">
                        @{reg.usuario_recibe || reg.registrado_por || '---'}
                      </span>
                    </div>
                    {selectedModule === 'informales' && (
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${reg.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {reg.activo ? 'ACTIVO' : 'SUSPENDIDO'}
                        </span>
                        <button 
                          onClick={() => verDetallesAbonos(reg)}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px]"
                        >
                          <FileText size={12} /> Ver Historial
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* VISTA PARA DESKTOP (TABLA) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase font-black">
                    {selectedModule === 'parqueadero' ? (
                      <tr>
                        <th className="px-6 py-4">Fecha/Hora</th>
                        <th className="px-6 py-4">Placa</th>
                        <th className="px-6 py-4">Monto</th>
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Cliente</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-6 py-4">Negocio</th>
                        <th className="px-6 py-4">Recaudado</th>
                        <th className="px-6 py-4">Usuario</th>
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
                            <td className="px-6 py-4 font-bold text-gray-900">
                              ${(reg.total_pagar || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase">
                                 @{reg.usuario_recibe || reg.registrado_por || '---'}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {reg.cliente_nombre || '---'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 font-bold text-gray-900">{reg.nombre_negocio}</td>
                            <td className="px-6 py-4 font-black text-emerald-600">${(reg.abonos || 0).toLocaleString()}</td>
                            <td className="px-6 py-4">
                               <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg uppercase">
                                 @{reg.registrado_por || '---'}
                               </span>
                            </td>
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
            </>
          )}
        </div>

            {selectedModule === 'informales' && (
              <div className="mt-8 p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 uppercase text-[10px] tracking-widest">
                  <Store size={16} className="text-orange-600" /> 
                  Actividad: Nuevos Negocios Registrados
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-black">
                      <tr>
                        <th className="px-4 py-3">Fecha de Creación</th>
                        <th className="px-4 py-3">Nombre del Negocio</th>
                        <th className="px-4 py-3">Registrado Por</th>
                        <th className="px-4 py-3">Fecha Inicio Cobro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reporteData?.data
                        ?.filter(reg => {
                          if (!reg.created_at) return false;
                          const createdDate = new Date(reg.created_at).toISOString().split('T')[0];
                          return createdDate >= fechasFiltro.inicio && createdDate <= fechasFiltro.fin;
                        })
                        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
                        .map(reg => (
                        <tr key={`new-${reg.id}`} className="hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-medium">
                            {new Date(reg.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-black text-gray-800 uppercase tracking-tighter">{reg.nombre_negocio}</td>
                          <td className="px-4 py-3">
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-black">
                              @{reg.registrado_por || '---'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-bold">{reg.fecha_inicio}</td>
                        </tr>
                      ))}
                      {reporteData?.data?.filter(reg => {
                          if (!reg.created_at) return false;
                          const createdDate = new Date(reg.created_at).toISOString().split('T')[0];
                          return createdDate >= fechasFiltro.inicio && createdDate <= fechasFiltro.fin;
                        }).length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-4 py-6 text-center text-gray-400 font-medium italic">
                            No hay negocios registrados en este rango de fechas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

        {pestañaSecundaria === 'auditoria' && (
          <div className="p-5 md:p-8 bg-gray-50/50 min-h-[500px]">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-purple-50 to-white">
                <div>
                  <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight flex items-center gap-2">
                    <ShieldAlert className="text-purple-600" size={20} /> Trazabilidad del Sistema
                  </h3>
                  <p className="text-gray-500 text-xs font-bold mt-1">Registro inmutable de acciones realizadas</p>
                </div>
                <div className="w-full md:w-auto relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por usuario o acción..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-bold"
                    value={busquedaAuditoria}
                    onChange={(e) => setBusquedaAuditoria(e.target.value)}
                  />
                </div>
              </div>

              {/* VISTA PARA MÓVILES (CARDS) */}
              <div className="md:hidden space-y-4 p-4">
                {auditoriaData
                  .filter(a => 
                    a.usuario.toLowerCase().includes(busquedaAuditoria.toLowerCase()) || 
                    a.accion.toLowerCase().includes(busquedaAuditoria.toLowerCase()) ||
                    a.descripcion.toLowerCase().includes(busquedaAuditoria.toLowerCase())
                  )
                  .map((log) => (
                    <div key={log.id} className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                          log.accion === 'CREACION' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          log.accion === 'ABONO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          log.accion === 'EXTENSION_DIAS' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          log.accion === 'ESTADO' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {log.accion}
                        </span>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-900">{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-[9px] text-gray-400 font-black">{new Date(log.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-700 mb-3">{log.descripcion}</p>
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                        <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg uppercase">
                          @{log.usuario}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* VISTA PARA DESKTOP (TABLA) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Fecha / Hora</th>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Acción</th>
                      <th className="px-6 py-4">Descripción Detallada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditoriaData
                      .filter(a => 
                        a.usuario.toLowerCase().includes(busquedaAuditoria.toLowerCase()) || 
                        a.accion.toLowerCase().includes(busquedaAuditoria.toLowerCase()) ||
                        a.descripcion.toLowerCase().includes(busquedaAuditoria.toLowerCase())
                      )
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{new Date(log.created_at).toLocaleDateString()}</div>
                            <div className="text-[10px] text-gray-500 font-black">{new Date(log.created_at).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                              @{log.usuario}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                              log.accion === 'CREACION' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              log.accion === 'ABONO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              log.accion === 'EXTENSION_DIAS' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              log.accion === 'ESTADO' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {log.accion}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-700">
                            {log.descripcion}
                          </td>
                        </tr>
                      ))}
                    {auditoriaData.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                          No hay registros de auditoría para este módulo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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
                          <p className="text-xs font-black text-gray-800">{new Date(h.fecha).toLocaleDateString()} {new Date(h.fecha).toLocaleTimeString()}</p>
                          <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-1">Recibido por: @{h.registrado_por || '---'}</p>
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
  );
};

const XIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default ModuloReportes;
