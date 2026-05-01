import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_COLOR = [37, 99, 235]; // Azul Blue-600

/**
 * Genera la cabecera corporativa de Uparqueo en el PDF
 */
const agregarCabecera = (doc, titulo) => {
  // Rectángulo de fondo para el logo
  doc.setFillColor(...LOGO_COLOR);
  doc.roundedRect(14, 10, 40, 15, 3, 3, 'F');
  
  // Texto del logo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('UP', 18, 20);
  doc.setFontSize(10);
  doc.text('ARQUEO', 26, 20);

  // Título del documento
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(22);
  doc.text(titulo.toUpperCase(), 60, 22);

  // Línea divisoria
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 30, 196, 30);
  
  // Información de contacto / Fecha
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 14, 38);
  doc.text('Sistema de Gestión Profesional - Uparqueo By ChrizDev', 140, 38);
};

/**
 * Genera el extracto para un negocio informal
 */
export const generarPDFInformal = (negocio, tarifaGlobal) => {
  const doc = new jsPDF();
  
  agregarCabecera(doc, 'Extracto de Negocio');

  // Resumen del Negocio
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text('INFORMACIÓN DEL PUESTO', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: 'bold' },
    body: [
      ['Negocio:', negocio.nombre_negocio],
      ['Dueño:', negocio.nombre_dueño],
      ['Celular:', negocio.celular || 'No registrado'],
      ['Fecha Inicio:', negocio.fecha_inicio],
      ['Estado:', negocio.activo ? 'ACTIVO' : 'INACTIVO'],
    ],
  });

  // Resumen Financiero
  doc.text('RESUMEN FINANCIERO', 14, doc.lastAutoTable.finalY + 15);
  
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    theme: 'striped',
    headStyles: { fillColor: LOGO_COLOR },
    head: [['Concepto', 'Detalle']],
    body: [
      ['Tarifa por Día:', `$${(negocio.valor_diario || tarifaGlobal).toLocaleString()}`],
      ['Días Transcurridos:', `${negocio.dias_totales || 0} días`],
      ['(+) Cargos Adicionales:', `$${(negocio.suma_cargos_extra || 0).toLocaleString()}`],
      ['(-) Abonos Recibidos:', `$${(negocio.abonos || 0).toLocaleString()}`],
      ['(=) DEUDA PENDIENTE:', `$${(negocio.deuda_acumulada || 0).toLocaleString()}`],
    ],
  });

  // Detalle de Cargos Extra (Si existen)
  if (negocio.lista_cargos && negocio.lista_cargos.length > 0) {
    doc.setFontSize(10);
    doc.text('DETALLE DE CARGOS EXTRA:', 14, doc.lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 15,
      head: [['Descripción', 'Monto']],
      body: negocio.lista_cargos.map(c => [c.nombre_cargo, `$${Number(c.monto).toLocaleString()}`]),
      headStyles: { fillColor: [245, 158, 11] }, // Amber-500
      styles: { fontSize: 8 }
    });
  }

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Página ${i} de ${pageCount} - Documento generado digitalmente por Uparqueo`, 70, 285);
  }

  doc.save(`Extracto_${negocio.nombre_negocio.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Genera el historial detallado para un cliente de parqueadero
 */
export const generarPDFHistorialCliente = (clienteData) => {
  const doc = new jsPDF();
  
  agregarCabecera(doc, 'Historial de Cliente');

  // Información del Cliente
  doc.setFontSize(12);
  doc.setTextColor(31, 41, 55);
  doc.text('EXPEDIENTE DEL VEHÍCULO', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55] },
    body: [
      ['Placa:', clienteData.placa],
      ['Visitas Totales:', `${clienteData.resumen.visitas} entradas`],
      ['Inversión Total:', `$${clienteData.resumen.totalPagado.toLocaleString()}`],
    ],
  });

  // Tabla de Registros
  doc.text('DETALLE DE MOVIMIENTOS', 14, doc.lastAutoTable.finalY + 15);
  
  const tableData = clienteData.historial.map(h => [
    new Date(h.entrada).toLocaleDateString(),
    h.tipo_vehiculo.toUpperCase(),
    h.entrada ? new Date(h.entrada).toLocaleTimeString() : '---',
    h.salida ? new Date(h.salida).toLocaleTimeString() : 'EN CURSO',
    `$${(h.total_pagar || 0).toLocaleString()}`,
    h.estado.toUpperCase()
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Fecha', 'Tipo', 'Entrada', 'Salida', 'Pago', 'Estado']],
    body: tableData,
    headStyles: { fillColor: LOGO_COLOR },
    styles: { fontSize: 8 },
  });

  doc.save(`Historial_${clienteData.placa}.pdf`);
};
