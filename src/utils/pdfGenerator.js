import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Genera un reporte en PDF basado en datos de una tabla
 * @param {Object} options Opciones de configuración
 * @param {string} options.title Título del documento
 * @param {string} options.subtitle Subtítulo del documento (ej. nombre del cliente)
 * @param {Array} options.columns Configuración de columnas [{ header: 'Columna', dataKey: 'key' }]
 * @param {Array} options.data Datos a mostrar
 * @param {string} options.filename Nombre del archivo de salida
 */
export const generatePDFReport = ({ title, subtitle, columns, data, filename }) => {
  const doc = new jsPDF();

  // Configuración de fuente y colores principales (Azul corporativo UPARQUEO)
  const primaryColor = [30, 58, 138]; // blue-900

  // Título Principal
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('UPARQUEO', 14, 22);

  // Subtítulo
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 32);

  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, 14, 40);
  }

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(14, subtitle ? 45 : 37, 196, subtitle ? 45 : 37);

  // Fecha de generación
  const hoy = new Date().toLocaleString();
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generado el: ${hoy}`, 14, subtitle ? 52 : 44);

  // Generar tabla
  const startY = subtitle ? 58 : 50;

  doc.autoTable({
    startY: startY,
    columns: columns,
    body: data,
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      textColor: 50,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 4,
      overflow: 'linebreak'
    },
    theme: 'grid',
    didParseCell: function (data) {
      // Intentar alinear valores monetarios a la derecha si contienen '$'
      if (typeof data.cell.raw === 'string' && data.cell.raw.includes('$')) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `UPARQUEO by ChrizDev - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(filename || 'reporte.pdf');
};
