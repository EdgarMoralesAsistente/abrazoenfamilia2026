import { jsPDF } from 'jspdf';
import { CrmReservation } from '../types/reservation';
import { CrmUser } from '../types/auth';
import { getPastoralLogoDataUrl, formatDateDMY } from './generateUnifiedCrmReportPdf';

/**
 * Formateador de moneda en EUR (€)
 */
function formatEUR(val?: number | null): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `€${num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generador del documento PDF Oficial:
 * "Lista Completa de Reservaciones Hechas - Clasificadas por Parroquia y Colegios (Estado del Pago)"
 */
export async function generateClassifiedReservationsPdf(
  reservations: CrmReservation[],
  currentUser?: CrmUser | null
): Promise<jsPDF> {
  // Configuración de documento A4 vertical
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const now = new Date();
  const formattedDate = formatDateDMY(now.toISOString().slice(0, 10));
  const formattedTime = now.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186 mm
  let cursorY = 0;

  // Orden de prioridad para el Estado del Pago
  const paymentStatusWeight: Record<string, number> = {
    'Pagado': 1,
    'Verificando': 2,
    'Pendiente': 3
  };

  const sortReservations = (a: CrmReservation, b: CrmReservation): number => {
    // 1. Estado del pago (Segundo nivel: Pagado -> Verificando -> Pendiente)
    const statusWeightA = paymentStatusWeight[a.paymentStatus] || 99;
    const statusWeightB = paymentStatusWeight[b.paymentStatus] || 99;
    if (statusWeightA !== statusWeightB) return statusWeightA - statusWeightB;

    // 2. Alfabéticamente por el nombre de la institución (Tercer nivel)
    const nameA = (a.institutionName || '').trim();
    const nameB = (b.institutionName || '').trim();
    const nameComp = nameA.localeCompare(nameB, 'es', { sensitivity: 'base', numeric: true });
    if (nameComp !== 0) return nameComp;

    // 3. Como desempate, por código
    return (a.code || '').localeCompare(b.code || '');
  };

  // Filtrar y clasificar: 1° Parroquia / Colegio, 2° Alfabéticamente, 3° Estado del pago
  const parroquias = reservations
    .filter((r) => r.institutionType === 'Parroquia')
    .sort(sortReservations);

  const colegios = reservations
    .filter((r) => r.institutionType !== 'Parroquia')
    .sort(sortReservations);

  // Métricas de Parroquias
  const parroquiasTotal = parroquias.length;
  const parroquiasPiezas = parroquias.reduce((acc, r) => acc + (Number(r.totalQuantity) || 0), 0);
  const parroquiasMontoTotal = parroquias.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
  const parroquiasPagadas = parroquias.filter((r) => r.paymentStatus === 'Pagado');
  const parroquiasMontoPagado = parroquiasPagadas.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
  const parroquiasPendientes = parroquias.filter((r) => r.paymentStatus === 'Pendiente');
  const parroquiasMontoPendiente = parroquiasPendientes.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
  const parroquiasVerificando = parroquias.filter((r) => r.paymentStatus === 'Verificando');

  // Métricas de Colegios
  const colegiosTotal = colegios.length;
  const colegiosPiezas = colegios.reduce((acc, r) => acc + (Number(r.totalQuantity) || 0), 0);
  const colegiosMontoTotal = colegios.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
  const colegiosPagadas = colegios.filter((r) => r.paymentStatus === 'Pagado');
  const colegiosMontoPagado = colegiosPagadas.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
  const colegiosPendientes = colegios.filter((r) => r.paymentStatus === 'Pendiente');
  const colegiosMontoPendiente = colegiosPendientes.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
  const colegiosVerificando = colegios.filter((r) => r.paymentStatus === 'Verificando');

  // Mini encabezado para páginas 2 en adelante
  const drawPageMiniHeader = () => {
    // Franja decorativa superior
    doc.setFillColor(30, 58, 138); // Blue 900
    doc.rect(0, 0, pageWidth, 3.5, 'F');
    doc.setFillColor(217, 119, 6); // Amber 600
    doc.rect(0, 3.5, pageWidth, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 58, 138);
    doc.text(
      'ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR',
      marginX,
      7.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Lista Completa de Reservaciones Clasificadas · Emisión: ${formattedDate}`,
      pageWidth - marginX,
      7.5,
      { align: 'right' }
    );

    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, 9, pageWidth - marginX, 9);
  };

  // Helper para salto de página con encabezado
  const checkPageBreak = (neededHeight: number, tableHeaderCallback?: () => void): boolean => {
    if (cursorY + neededHeight > pageHeight - 16) {
      doc.addPage();
      drawPageMiniHeader();
      cursorY = 13;
      if (tableHeaderCallback) {
        tableHeaderCallback();
      }
      return true;
    }
    return false;
  };

  // =========================================================================
  // PÁGINA 1: ENCABEZADO INSTITUCIONAL
  // =========================================================================

  // Franja superior de marca
  doc.setFillColor(30, 58, 138); // Azul institucional
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(217, 119, 6); // Ámbar pastoral
  doc.rect(0, 5, pageWidth, 1.2, 'F');

  cursorY = 9.5;

  // Insertar Logo Oficial
  try {
    const logoDataUrl = await getPastoralLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', marginX, cursorY, 15, 17);
    }
  } catch (err) {
    console.warn('No se pudo cargar el logo para la lista de reservas:', err);
  }

  // Título Institucional
  const textLeft = marginX + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 58, 138);
  doc.text('ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR', textLeft, cursorY + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text('LISTA COMPLETA DE RESERVACIONES DE MATERIALES 2026', textLeft, cursorY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(
    'CLASIFICACIÓN OFICIAL: PARROQUIAS ARQUIDIOCESANAS Y COLEGIOS · ESTADO DEL PAGO',
    textLeft,
    cursorY + 12.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const operatorText = currentUser ? `Auditor/Operador: ${currentUser.name} (${currentUser.role}) · ` : '';
  doc.text(
    `${operatorText}Fecha de Emisión: ${formattedDate} ${formattedTime} · Sistema CRM Pastoral v2.6`,
    textLeft,
    cursorY + 15.8
  );

  cursorY += 19;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 3.5;

  // =========================================================================
  // TARJETAS RESUMEN DE CLASIFICACIÓN (PARROQUIAS VS COLEGIOS)
  // =========================================================================
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 2) / 3; // ~59.3 mm
  const cardHeight = 22;

  // Tarjeta 1: Parroquias
  doc.setFillColor(239, 246, 255); // Blue 50
  doc.roundedRect(marginX, cursorY, cardWidth, cardHeight, 1.8, 1.8, 'F');
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(marginX, cursorY, cardWidth, cardHeight, 1.8, 1.8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 58, 138);
  doc.text('PARROQUIAS ARQUIDIOCESANAS', marginX + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${parroquiasTotal} Reservas`, marginX + 3, cursorY + 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Piezas: ${parroquiasPiezas.toLocaleString()} | Monto: ${formatEUR(parroquiasMontoTotal)}`, marginX + 3, cursorY + 13.2);

  // Desglose de Pago Parroquias
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(22, 101, 52); // Emerald 800
  doc.text(`Pagadas: ${parroquiasPagadas.length} (${formatEUR(parroquiasMontoPagado)})`, marginX + 3, cursorY + 17);

  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(`Pendientes: ${parroquiasPendientes.length} (${formatEUR(parroquiasMontoPendiente)})`, marginX + 3, cursorY + 20);

  // Tarjeta 2: Colegios
  const card2X = marginX + cardWidth + cardGap;
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(card2X, cursorY, cardWidth, cardHeight, 1.8, 1.8, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(card2X, cursorY, cardWidth, cardHeight, 1.8, 1.8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('COLEGIOS E INSTITUCIONES', card2X + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${colegiosTotal} Reservas`, card2X + 3, cursorY + 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Piezas: ${colegiosPiezas.toLocaleString()} | Monto: ${formatEUR(colegiosMontoTotal)}`, card2X + 3, cursorY + 13.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(22, 101, 52);
  doc.text(`Pagadas: ${colegiosPagadas.length} (${formatEUR(colegiosMontoPagado)})`, card2X + 3, cursorY + 17);

  doc.setTextColor(180, 83, 9);
  doc.text(`Pendientes: ${colegiosPendientes.length} (${formatEUR(colegiosMontoPendiente)})`, card2X + 3, cursorY + 20);

  // Tarjeta 3: Totales Generales
  const card3X = marginX + (cardWidth + cardGap) * 2;
  const totalReservasCount = reservations.length;
  const totalPiezasCount = parroquiasPiezas + colegiosPiezas;
  const totalMontoGeneral = parroquiasMontoTotal + colegiosMontoTotal;
  const totalPagadasCount = parroquiasPagadas.length + colegiosPagadas.length;
  const totalMontoPagadoGeneral = parroquiasMontoPagado + colegiosMontoPagado;
  const totalPendientesCount = parroquiasPendientes.length + colegiosPendientes.length;

  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(card3X, cursorY, cardWidth, cardHeight, 1.8, 1.8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card3X, cursorY, cardWidth, cardHeight, 1.8, 1.8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL GENERAL CONSOLIDADO', card3X + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalReservasCount} Reservaciones`, card3X + 3, cursorY + 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Piezas: ${totalPiezasCount.toLocaleString()} | Facturado: ${formatEUR(totalMontoGeneral)}`, card3X + 3, cursorY + 13.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(22, 101, 52);
  doc.text(`Recaudado: ${totalPagadasCount} (${formatEUR(totalMontoPagadoGeneral)})`, card3X + 3, cursorY + 17);

  doc.setTextColor(180, 83, 9);
  doc.text(`Pendiente: ${totalPendientesCount} (${formatEUR(totalMontoGeneral - totalMontoPagadoGeneral)})`, card3X + 3, cursorY + 20);

  cursorY += cardHeight + 4;

  // =========================================================================
  // TABLA DE CABECERA REUTILIZABLE
  // =========================================================================
  const drawTableHeader = (sectionTitle: string, badgeText: string, themeColor: [number, number, number]) => {
    // Título de la sección
    doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
    doc.roundedRect(marginX, cursorY, contentWidth, 5.8, 1.4, 1.4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(255, 255, 255);
    doc.text(sectionTitle, marginX + 3, cursorY + 4.1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(badgeText, pageWidth - marginX - 3, cursorY + 4.1, { align: 'right' });
    cursorY += 6.8;

    // Fila de encabezados de columnas
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, cursorY, contentWidth, 5.2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, cursorY + 5.2, pageWidth - marginX, cursorY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(51, 65, 85);

    // Columnas exactas con espaciado amplio y calibrado (total ancho = 186mm)
    // marginX = 12mm, pageWidth - marginX = 198mm
    // N°: 12..18 (6mm)
    // CÓDIGO: 18..34 (16mm)
    // FECHA: 34..50 (16mm)
    // INSTITUCIÓN: 50..102 (52mm)
    // SOLICITANTE: 102..138 (36mm)
    // PIEZAS: 148 (alineado der)
    // MONTO (€): 162 (alineado der)
    // ESTADO PAGO: 165..182 (17mm)
    // ENTREGA: 196 (alineado der)
    doc.text('N°', marginX + 1.5, cursorY + 3.6);
    doc.text('CÓDIGO', marginX + 7, cursorY + 3.6);
    doc.text('FECHA', marginX + 23, cursorY + 3.6);
    doc.text('INSTITUCIÓN (PARROQUIA / COLEGIO)', marginX + 39, cursorY + 3.6);
    doc.text('SOLICITANTE / TELÉFONO', marginX + 92, cursorY + 3.6);
    doc.text('PIEZAS', marginX + 138, cursorY + 3.6, { align: 'right' });
    doc.text('TOTAL (€)', marginX + 153, cursorY + 3.6, { align: 'right' });
    doc.text('ESTADO PAGO', marginX + 157, cursorY + 3.6);
    doc.text('ENTREGA', marginX + 184, cursorY + 3.6, { align: 'right' });

    cursorY += 5.6;
  };

  // Helper para dibujar fila de reserva
  const drawReservationRow = (r: CrmReservation, index: number) => {
    const rowHeight = 5.2;
    const isEven = index % 2 === 0;

    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginX, cursorY, contentWidth, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(30, 41, 59);

    const numStr = String(index + 1).padStart(2, '0');
    const codeStr = r.code || '-';
    const dateStr = formatDateDMY(r.paymentDate || r.timestamp);

    // Truncar textos largos para garantizar cero solapamiento
    const instStr = r.institutionName
      ? r.institutionName.length > 29
        ? r.institutionName.slice(0, 27) + '..'
        : r.institutionName
      : '-';

    const contactStr = r.contactName
      ? r.contactName.length > 15
        ? r.contactName.slice(0, 13) + '..'
        : r.contactName
      : '-';

    const phoneStr = r.phone ? (r.phone.length > 11 ? r.phone.slice(0, 10) : r.phone) : '';
    const contactLine = phoneStr ? `${contactStr} (${phoneStr})` : contactStr;

    const totalPzs = r.totalQuantity || 0;
    const matStr = `${totalPzs} pzs`;

    const eurStr = formatEUR(r.totalEUR || 0);

    const paymentStatus = r.paymentStatus || 'Pendiente';
    const deliveryStatus = r.deliveryStatus || 'Pendiente';

    doc.text(numStr, marginX + 1.5, cursorY + 3.6);
    doc.text(codeStr, marginX + 7, cursorY + 3.6);
    doc.text(dateStr, marginX + 23, cursorY + 3.6);
    doc.text(instStr, marginX + 39, cursorY + 3.6);
    doc.text(contactLine, marginX + 92, cursorY + 3.6);
    doc.text(matStr, marginX + 138, cursorY + 3.6, { align: 'right' });
    doc.text(eurStr, marginX + 153, cursorY + 3.6, { align: 'right' });

    // Estado del Pago con color y badge distintivo
    doc.setFont('helvetica', 'bold');
    if (paymentStatus === 'Pagado') {
      doc.setTextColor(22, 101, 52); // Verde esmeralda
      doc.text('PAGADO', marginX + 157, cursorY + 3.6);
    } else if (paymentStatus === 'Verificando') {
      doc.setTextColor(2, 132, 199); // Azul cielo
      doc.text('VERIFIC.', marginX + 157, cursorY + 3.6);
    } else {
      doc.setTextColor(194, 65, 12); // Ámbar/Naranja
      doc.text('PENDIENTE', marginX + 157, cursorY + 3.6);
    }

    // Estado de Entrega
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.3);
    if (deliveryStatus === 'Entregado') {
      doc.setTextColor(22, 101, 52);
      doc.text('Entregado', marginX + 184, cursorY + 3.6, { align: 'right' });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('Por entregar', marginX + 184, cursorY + 3.6, { align: 'right' });
    }

    cursorY += rowHeight;
  };

  // Helper para fila de subtotales
  const drawSubtotalRow = (
    label: string,
    count: number,
    piezas: number,
    montoTotal: number,
    montoPagado: number
  ) => {
    checkPageBreak(7);
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, cursorY, contentWidth, 5.8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    doc.line(marginX, cursorY + 5.8, pageWidth - marginX, cursorY + 5.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(`SUBTOTAL ${label.toUpperCase()} (${count} reservas):`, marginX + 2, cursorY + 4);

    doc.text(`${piezas.toLocaleString()} pzs`, marginX + 138, cursorY + 4, { align: 'right' });
    doc.text(formatEUR(montoTotal), marginX + 152, cursorY + 4, { align: 'right' });

    doc.setTextColor(22, 101, 52);
    doc.text(`Pagado: ${formatEUR(montoPagado)}`, marginX + 156, cursorY + 4);

    doc.setTextColor(194, 65, 12);
    doc.text(`Pend: ${formatEUR(montoTotal - montoPagado)}`, marginX + 184, cursorY + 4, { align: 'right' });

    cursorY += 7.5;
  };

  // Helper para dibujar sub-encabezado por Estado de Pago
  const drawPaymentGroupHeader = (statusLabel: string, count: number, totalEUR: number, theme: 'Pagado' | 'Verificando' | 'Pendiente') => {
    checkPageBreak(7);
    if (theme === 'Pagado') {
      doc.setFillColor(240, 253, 244); // Green 50
      doc.setDrawColor(187, 247, 208); // Green 200
      doc.setTextColor(22, 101, 52); // Green 800
    } else if (theme === 'Verificando') {
      doc.setFillColor(239, 246, 255); // Blue 50
      doc.setDrawColor(191, 219, 254); // Blue 200
      doc.setTextColor(30, 64, 175); // Blue 800
    } else {
      doc.setFillColor(255, 247, 237); // Orange 50
      doc.setDrawColor(254, 215, 170); // Orange 200
      doc.setTextColor(194, 65, 12); // Orange 700
    }

    doc.rect(marginX, cursorY, contentWidth, 5.2, 'F');
    doc.rect(marginX, cursorY, contentWidth, 5.2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(`• ESTADO DEL PAGO: ${statusLabel.toUpperCase()} (${count} ${count === 1 ? 'reserva' : 'reservas'})`, marginX + 3, cursorY + 3.6);
    doc.text(`Subtotal: ${formatEUR(totalEUR)}`, pageWidth - marginX - 3, cursorY + 3.6, { align: 'right' });

    cursorY += 5.8;
  };

  // Helper para renderizar un bloque de institución agrupado por estado de pago
  const renderInstitutionGroup = (
    sectionNumber: number,
    sectionTitle: string,
    list: CrmReservation[],
    themeColor: [number, number, number]
  ) => {
    const sectionHeaderFn = () => {
      drawTableHeader(
        `${sectionNumber}. ${sectionTitle}`,
        `${list.length} Reservas registradas`,
        themeColor
      );
    };

    sectionHeaderFn();

    if (list.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('No hay reservaciones registradas para este grupo.', marginX + 4, cursorY + 4);
      cursorY += 7;
      return;
    }

    // Nivel 2: Agrupados por Estado del Pago
    // Nivel 3: Ordenados alfabéticamente por nombre de institución
    const paymentGroups: Array<{ status: 'Pagado' | 'Verificando' | 'Pendiente'; label: string }> = [
      { status: 'Pagado', label: 'PAGADAS / CONCILIADAS' },
      { status: 'Verificando', label: 'EN PROCESO DE VERIFICACIÓN' },
      { status: 'Pendiente', label: 'PENDIENTES POR PAGAR' }
    ];

    let globalItemIndex = 0;

    paymentGroups.forEach((group) => {
      const itemsInGroup = list
        .filter((r) => r.paymentStatus === group.status)
        .sort((a, b) => {
          const nameA = (a.institutionName || '').trim();
          const nameB = (b.institutionName || '').trim();
          return nameA.localeCompare(nameB, 'es', { sensitivity: 'base', numeric: true });
        });

      if (itemsInGroup.length > 0) {
        const groupTotalEUR = itemsInGroup.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
        drawPaymentGroupHeader(group.label, itemsInGroup.length, groupTotalEUR, group.status);

        itemsInGroup.forEach((r) => {
          checkPageBreak(5.5, sectionHeaderFn);
          drawReservationRow(r, globalItemIndex);
          globalItemIndex++;
        });

        cursorY += 1.5;
      }
    });

    const totalPiezas = list.reduce((acc, r) => acc + (Number(r.totalQuantity) || 0), 0);
    const totalEUR = list.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
    const pagadoEUR = list
      .filter((r) => r.paymentStatus === 'Pagado')
      .reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);

    drawSubtotalRow(
      sectionNumber === 1 ? 'Parroquias' : 'Colegios',
      list.length,
      totalPiezas,
      totalEUR,
      pagadoEUR
    );
  };

  // =========================================================================
  // SECCIÓN 1: PARROQUIAS ARQUIDIOCESANAS
  // =========================================================================
  renderInstitutionGroup(
    1,
    'RESERVACIONES DE PARROQUIAS ARQUIDIOCESANAS',
    parroquias,
    [30, 58, 138] // Azul
  );

  cursorY += 2;

  // =========================================================================
  // SECCIÓN 2: COLEGIOS E INSTITUCIONES EDUCATIVAS
  // =========================================================================
  checkPageBreak(18);
  renderInstitutionGroup(
    2,
    'RESERVACIONES DE COLEGIOS E INSTITUCIONES EDUCATIVAS',
    colegios,
    [180, 83, 9] // Ámbar / Naranja
  );

  cursorY += 2;

  // =========================================================================
  // SECCIÓN 3: CUADRO CONSOLIDADO Y RESUMEN GENERAL POR ESTADO DE PAGO
  // =========================================================================
  checkPageBreak(30);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, cursorY, contentWidth, 24, 1.8, 1.8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, cursorY, contentWidth, 24, 1.8, 1.8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CUADRO RESUMEN CONSOLIDADO POR ESTADO DEL PAGO', marginX + 3, cursorY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Distribución global de cobranzas Parroquias vs Colegios:', marginX + 3, cursorY + 8.5);

  // Tabla miniatura de resumen
  const tableY = cursorY + 10.5;
  const colW = contentWidth / 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);
  doc.text('CONCEPTO', marginX + 3, tableY);
  doc.text('PARROQUIAS', marginX + colW + 3, tableY);
  doc.text('COLEGIOS', marginX + colW * 2 + 3, tableY);
  doc.text('TOTAL CONSOLIDADO', marginX + colW * 3 + 3, tableY);

  // Línea 1: Pagadas
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text(`Reservas Pagadas:`, marginX + 3, tableY + 4);
  doc.text(`${parroquiasPagadas.length} (${formatEUR(parroquiasMontoPagado)})`, marginX + colW + 3, tableY + 4);
  doc.text(`${colegiosPagadas.length} (${formatEUR(colegiosMontoPagado)})`, marginX + colW * 2 + 3, tableY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalPagadasCount} (${formatEUR(totalMontoPagadoGeneral)})`, marginX + colW * 3 + 3, tableY + 4);

  // Línea 2: Pendientes
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(194, 65, 12);
  doc.text(`Reservas Pendientes:`, marginX + 3, tableY + 8);
  doc.text(`${parroquiasPendientes.length} (${formatEUR(parroquiasMontoPendiente)})`, marginX + colW + 3, tableY + 8);
  doc.text(`${colegiosPendientes.length} (${formatEUR(colegiosMontoPendiente)})`, marginX + colW * 2 + 3, tableY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalPendientesCount} (${formatEUR(totalMontoGeneral - totalMontoPagadoGeneral)})`, marginX + colW * 3 + 3, tableY + 8);

  // Línea 3: Total
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Gran Total:`, marginX + 3, tableY + 12);
  doc.text(`${parroquiasTotal} (${formatEUR(parroquiasMontoTotal)})`, marginX + colW + 3, tableY + 12);
  doc.text(`${colegiosTotal} (${formatEUR(colegiosMontoTotal)})`, marginX + colW * 2 + 3, tableY + 12);
  doc.text(`${totalReservasCount} (${formatEUR(totalMontoGeneral)})`, marginX + colW * 3 + 3, tableY + 12);

  cursorY += 27;

  // =========================================================================
  // PIE DE PÁGINA EN TODAS LAS PÁGINAS
  // =========================================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Línea separadora
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);

    doc.text(
      'Pastoral Familiar · Arquidiócesis de Maracaibo · Lista Oficial de Reservaciones de Materiales 2026',
      marginX,
      pageHeight - 7
    );

    doc.setFont('helvetica', 'bold');
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Descarga el blob del PDF generado
 */
export function downloadClassifiedReservationsPdf(
  doc: jsPDF,
  filename?: string
): boolean {
  try {
    const finalName =
      filename ||
      `Lista_Reservaciones_Parroquias_Colegios_AEF_2026_${new Date().toISOString().slice(0, 10)}.pdf`;

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Error al descargar lista clasificada en PDF:', err);
    return false;
  }
}

/**
 * Exportador estructurado a CSV de la lista completa clasificada por Parroquia y Colegios
 */
export function exportClassifiedReservationsCSV(
  reservations: CrmReservation[],
  filename?: string
): boolean {
  try {
    const now = new Date();
    const formattedDate = formatDateDMY(now.toISOString().slice(0, 10));

    const paymentStatusWeight: Record<string, number> = {
      'Pagado': 1,
      'Verificando': 2,
      'Pendiente': 3
    };

    const sortReservations = (a: CrmReservation, b: CrmReservation): number => {
      // Nivel 2: Estado del pago
      const statusWeightA = paymentStatusWeight[a.paymentStatus] || 99;
      const statusWeightB = paymentStatusWeight[b.paymentStatus] || 99;
      if (statusWeightA !== statusWeightB) return statusWeightA - statusWeightB;

      // Nivel 3: Alfabéticamente por el nombre de la institución
      const nameA = (a.institutionName || '').trim();
      const nameB = (b.institutionName || '').trim();
      const nameComp = nameA.localeCompare(nameB, 'es', { sensitivity: 'base', numeric: true });
      if (nameComp !== 0) return nameComp;

      return (a.code || '').localeCompare(b.code || '');
    };

    const parroquias = reservations
      .filter((r) => r.institutionType === 'Parroquia')
      .sort(sortReservations);

    const colegios = reservations
      .filter((r) => r.institutionType !== 'Parroquia')
      .sort(sortReservations);

    const headers = [
      'Clasificación',
      'Código',
      'Institución',
      'Solicitante',
      'Teléfono / WhatsApp',
      'Correo',
      'Fecha Creación (dd/mm/aaaa)',
      'Kits Completos',
      'Afiches',
      'Guías Facilitador',
      'Hojas del Niño',
      'Total Piezas',
      'Monto Total (EUR)',
      'Estado del Pago',
      'Método de Pago',
      'Referencia Pago',
      'Fecha de Pago (dd/mm/aaaa)',
      'Estado de Entrega',
      'Fecha de Entrega',
      'Notas'
    ];

    const lines: string[] = [];

    // Metadatos
    lines.push(`"LISTA OFICIAL DE RESERVACIONES CLASIFICADAS POR PARROQUIA Y COLEGIOS"`);
    lines.push(`"Secretariado de Pastoral Familiar - Arquidiócesis de Maracaibo"`);
    lines.push(`"Fecha de Emisión: ${formattedDate}"`);
    lines.push(`"Total Registros: ${reservations.length}"`);
    lines.push('');

    // Encabezado
    lines.push(headers.map((h) => `"${h}"`).join(','));

    // SECCIÓN 1: PARROQUIAS
    lines.push(`"--- SECCIÓN 1: PARROQUIAS ARQUIDIOCESANAS (${parroquias.length} REGISTROS) ---"`);
    parroquias.forEach((r) => {
      const row = [
        `"Parroquia"`,
        `"${r.code || ''}"`,
        `"${(r.institutionName || '').replace(/"/g, '""')}"`,
        `"${(r.contactName || '').replace(/"/g, '""')}"`,
        `"${r.phone || ''}"`,
        `"${r.email || ''}"`,
        `"${formatDateDMY(r.timestamp)}"`,
        r.kitQuantity || 0,
        r.aficheQuantity || 0,
        r.guiaQuantity || 0,
        r.hojaQuantity || 0,
        r.totalQuantity || 0,
        r.totalEUR || 0,
        `"${r.paymentStatus || 'Pendiente'}"`,
        `"${r.paymentMethod || ''}"`,
        `"${r.paymentRef || ''}"`,
        `"${formatDateDMY(r.paymentDate)}"`,
        `"${r.deliveryStatus || ''}"`,
        `"${formatDateDMY(r.deliveryDate)}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
      lines.push(row.join(','));
    });

    lines.push('');

    // SECCIÓN 2: COLEGIOS
    lines.push(`"--- SECCIÓN 2: COLEGIOS E INSTITUCIONES EDUCATIVAS (${colegios.length} REGISTROS) ---"`);
    colegios.forEach((r) => {
      const row = [
        `"Colegio"`,
        `"${r.code || ''}"`,
        `"${(r.institutionName || '').replace(/"/g, '""')}"`,
        `"${(r.contactName || '').replace(/"/g, '""')}"`,
        `"${r.phone || ''}"`,
        `"${r.email || ''}"`,
        `"${formatDateDMY(r.timestamp)}"`,
        r.kitQuantity || 0,
        r.aficheQuantity || 0,
        r.guiaQuantity || 0,
        r.hojaQuantity || 0,
        r.totalQuantity || 0,
        r.totalEUR || 0,
        `"${r.paymentStatus || 'Pendiente'}"`,
        `"${r.paymentMethod || ''}"`,
        `"${r.paymentRef || ''}"`,
        `"${formatDateDMY(r.paymentDate)}"`,
        `"${r.deliveryStatus || ''}"`,
        `"${formatDateDMY(r.deliveryDate)}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
      lines.push(row.join(','));
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      filename ||
      `Lista_Reservaciones_Parroquias_Colegios_AEF_2026_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (err) {
    console.error('Error al exportar CSV clasificado:', err);
    return false;
  }
}
