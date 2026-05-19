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
  doc.text('Sistema de Gestión Profesional - Uparqueo By ChrizDev', 196, 38, { align: 'right' });
};

/**
 * Genera el extracto para un negocio informal
 */
export const generarPDFInformal = (negocio, tarifaGlobal) => {
  const doc = new jsPDF();
  
  agregarCabecera(doc, 'Extracto de Negocio');

  // Resumen del Negocio - Marcador de sección azul
  doc.setFillColor(...LOGO_COLOR);
  doc.rect(14, 46, 3, 6, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray 900
  doc.text('INFORMACIÓN DEL PUESTO', 20, 51);
  
  autoTable(doc, {
    startY: 55,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 5, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [31, 41, 55], cellWidth: 45 },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Negocio:', negocio.nombre_negocio.toUpperCase()],
      ['Dueño / Responsable:', negocio.nombre_dueño || 'No registrado'],
      ['Celular de Contacto:', negocio.celular || 'No registrado'],
      ['Fecha Inicio de Cobro:', negocio.fecha_inicio],
      ['Estado de Cuenta:', negocio.activo ? 'ACTIVO' : 'INACTIVO'],
    ],
    didParseCell: function(data) {
      if (data.row.index === 4 && data.column.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        if (negocio.activo) {
          data.cell.styles.textColor = [16, 185, 129]; // green-500
        } else {
          data.cell.styles.textColor = [239, 68, 68]; // red-500
        }
      }
    }
  });

  // Resumen Financiero - Marcador de sección azul
  doc.setFillColor(...LOGO_COLOR);
  doc.rect(14, doc.lastAutoTable.finalY + 11, 3, 6, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39); // Gray 900
  doc.text('RESUMEN FINANCIERO', 20, doc.lastAutoTable.finalY + 16);
  
  const tarifa = negocio.valor_diario || tarifaGlobal;
  const diasActivos = negocio.dias_totales || 0;
  const cargosExtra = negocio.suma_cargos_extra || 0;
  const abonos = negocio.abonos || 0;
  const deudaHoy = negocio.deuda_acumulada || 0;
  
  // Calcular días pagados y por pagar
  const baseTarifaDeuda = Math.max(0, deudaHoy - cargosExtra);
  const diasPorPagar = baseTarifaDeuda / tarifa;
  const diasPorPagarFormatted = diasPorPagar % 1 === 0 ? diasPorPagar : Number(diasPorPagar.toFixed(1));
  const diasPagados = Math.max(0, diasActivos - diasPorPagar);
  const diasPagadosFormatted = diasPagados % 1 === 0 ? diasPagados : Number(diasPagados.toFixed(1));

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 22,
    theme: 'grid',
    styles: {
      fontSize: 9.5,
      cellPadding: 6,
      lineColor: [229, 231, 235],
      lineWidth: 0.5,
      textColor: [55, 65, 81]
    },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: [75, 85, 99], cellWidth: 115 },
      1: { fontStyle: 'bold', halign: 'right', textColor: [31, 41, 55], cellWidth: 'auto' }
    },
    body: [
      ['Tarifa Diaria del Puesto:', `$${tarifa.toLocaleString()}`],
      ['Días Activos en el Software:', `${diasActivos} días`],
      ['Días Cobrados / Pagados:', `${diasPagadosFormatted} días`],
      ['Días Pendientes de Pago:', `${diasPorPagarFormatted} días`],
      ['Subtotal por Días Base (Activos × Tarifa):', `$${(diasActivos * tarifa).toLocaleString()}`],
      ['(+) Cargos Adicionales:', `$${cargosExtra.toLocaleString()}`],
      ['(-) Abonos / Pagos Recibidos:', `$${abonos.toLocaleString()}`],
      ['(=) DEUDA PENDIENTE / A LIQUIDAR:', `$${deudaHoy.toLocaleString()}`],
    ],
    didParseCell: function(data) {
      // Días pendientes
      if (data.row.index === 3) {
        data.cell.styles.fontStyle = 'bold';
        if (diasPorPagar > 0) {
          data.cell.styles.textColor = [220, 38, 38]; // Red 600
        } else {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
        }
      }
      // Días pagados
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        if (diasPagados > 0) {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
        }
      }
      // Deuda Pendiente
      if (data.row.index === 7) {
        data.cell.styles.fontSize = 11;
        data.cell.styles.fontStyle = 'bold';
        if (deudaHoy > 0) {
          data.cell.styles.fillColor = [254, 242, 242]; // Red 50
          data.cell.styles.textColor = [185, 28, 28]; // Red 700
        } else {
          data.cell.styles.fillColor = [240, 253, 250]; // Emerald 50
          data.cell.styles.textColor = [13, 148, 136]; // Emerald 700
        }
      }
    }
  });

  // Detalle de Cargos Extra (Si existen)
  if (negocio.lista_cargos && negocio.lista_cargos.length > 0) {
    // Marcador de sección ámbar
    doc.setFillColor(245, 158, 11);
    doc.rect(14, doc.lastAutoTable.finalY + 11, 3, 6, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39); // Gray 900
    doc.text('DETALLE DE CARGOS EXTRA', 20, doc.lastAutoTable.finalY + 16);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 22,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [229, 231, 235],
        lineWidth: 0.5,
        textColor: [55, 65, 81]
      },
      headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' }, // Amber 500
      head: [['Descripción del Cargo', 'Monto del Cargo']],
      body: negocio.lista_cargos.map(c => [c.nombre_cargo, `$${Number(c.monto).toLocaleString()}`]),
      columnStyles: {
        0: { halign: 'left', cellWidth: 130 },
        1: { fontStyle: 'bold', halign: 'right', cellWidth: 'auto' }
      }
    });
  }

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Página ${i} de ${pageCount} - Documento generado digitalmente por Uparqueo`, 105, 285, { align: 'center' });
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
