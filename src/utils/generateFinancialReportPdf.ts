import { jsPDF } from 'jspdf';
import { CrmReservation, CrmKPIs, CrmExpense, DollarPurchase } from '../types/reservation';
import { CrmUser } from '../types/auth';
import { getPastoralLogoDataUrl } from './generateCrmExecutivePdf';

interface FinancialReportData {
  reservations: CrmReservation[];
  kpis: CrmKPIs;
  expenses: CrmExpense[];
  dollarPurchases: DollarPurchase[];
  currentUser?: CrmUser;
}

/**
 * Normaliza cualquier entrada de fecha (ISO, timestamp con hora, formato en inglés o español)
 * al formato unificado estricto dd/mm/aaaa. Si no es una fecha válida, devuelve '-'.
 */
export function formatDateDMY(raw?: string | null): string {
  if (!raw) return '-';
  const str = String(raw).trim();
  if (!str) return '-';

  // Si ya es estrictamente dd/mm/aaaa
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Coincidencia tipo dd/mm/aaaa o d/m/aaaa (con o sin hora posterior)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const d = slashMatch[1].padStart(2, '0');
    const m = slashMatch[2].padStart(2, '0');
    const y = slashMatch[3];
    return `${d}/${m}/${y}`;
  }

  // Coincidencia ISO tipo yyyy-mm-dd (con o sin T o tiempo posterior)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Si viene una fecha en texto largo ej: "Wed Sep 30 2026 14:08:00 GMT-0400"
  const dObj = new Date(str);
  if (!isNaN(dObj.getTime())) {
    const d = String(dObj.getDate()).padStart(2, '0');
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const y = dObj.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return '-';
}

export async function generateFinancialReportPdf(data: FinancialReportData): Promise<jsPDF> {
  const { reservations, kpis, expenses, dollarPurchases, currentUser } = data;
  const wallet = kpis.walletSummary || {
    totalUsdPurchased: 0,
    totalVesSpent: 0,
    averageExchangeRate: 44.5,
    lastExchangeRate: 44.5,
    purchaseCount: 0,
    totalVesCollectedEstimated: 0,
    availableVesBalance: 0,
    walletBreakdown: [],
    totalExpensesVES: 0,
    totalExpensesUSD: 0
  };

  const totalExpensesVES = wallet.totalExpensesVES || 0;
  const totalExpensesUSD = wallet.totalExpensesUSD || 0;
  const grandTotalSalidasVES = (wallet.totalVesSpent || 0) + totalExpensesVES;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const reportId = `AEF-FIN-${Date.now().toString().slice(-6)}`;

  // =========================================================================
  // CONTROL DE PAGINACIÓN Y ENCABEZADOS RECURRENTES
  // =========================================================================
  let currentY = 0;

  const drawPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text('ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR', 14, 11);

    doc.setFontSize(9);
    doc.setTextColor(28, 25, 23); // Stone 900
    doc.text('REPORTE DE FINANZAS: ENTRADAS, SALIDAS Y DISPONIBILIDAD', 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text('Campaña Abrazo en Familia 2026 · Detalle de Transacciones (Continuación)', 14, 20);
    doc.text(`Fecha: ${formattedDate} ${formattedTime}`, 196, 16, { align: 'right' });

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(14, 23, 196, 23);
  };

  const ensureSpace = (neededHeight: number, onNewPageHeader?: () => void) => {
    if (currentY + neededHeight > 272) {
      doc.addPage();
      drawPageHeader();
      currentY = 27;
      if (onNewPageHeader) {
        onNewPageHeader();
      }
    }
  };

  // =========================================================================
  // PÁGINA 1: ENCABEZADO INSTITUCIONAL (SIN SOLAPAMIENTO DE TEXTO)
  // =========================================================================
  try {
    const logoDataUrl = await getPastoralLogoDataUrl();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 9, 16, 18, undefined, 'FAST');
    }
  } catch (err) {
    console.warn('No se pudo cargar el logo en el reporte financiero:', err);
  }

  // Título e institución (columna izquierda X: 33)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR', 33, 13);

  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text('REPORTE DE FINANZAS: ENTRADAS, SALIDAS Y DISPONIBILIDAD', 33, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(87, 83, 78);
  doc.text('Campaña Abrazo en Familia 2026 · Tesorería, Conciliación y Flujo de Fondos', 33, 23.5);

  // Metadatos a la derecha (alineados al margen derecho X: 196 con suficiente espacio)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(28, 25, 23);
  doc.text(`Fecha: ${formattedDate}`, 196, 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text(`Hora: ${formattedTime}`, 196, 17, { align: 'right' });

  const opName = currentUser ? currentUser.name : 'Secretariado Arquidiocesano';
  const opShort = opName.length > 24 ? `${opName.slice(0, 22)}..` : opName;
  doc.text(`Operador: ${opShort}`, 196, 21, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.35);
  doc.line(14, 28, 196, 28);

  // =========================================================================
  // 1. CUATRO TARJETAS FINANCIERAS RESUMEN (Y: 31 - 54)
  // =========================================================================
  const cardY = 31;
  const cardH = 22;
  const cardW = 43;
  const cardGap = 3.33;

  // 1.1 ENTRADAS (INGRESOS CONCILIADOS)
  const x1 = 14;
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.roundedRect(x1, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text('1. TOTAL ENTRADAS', x1 + 2.5, cardY + 5);

  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(`+Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, x1 + 2.5, cardY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(4, 120, 87);
  doc.text(`Recaudado: ${kpis.totalMontoRecaudadoEUR.toFixed(2)} €`, x1 + 2.5, cardY + 15.5);
  doc.text(`${kpis.reservasPagadas} reservas cobradas`, x1 + 2.5, cardY + 19);

  // 1.2 SALIDAS (EGRESOS TOTALES: COMPRA USD + OTRAS SALIDAS)
  const x2 = x1 + cardW + cardGap;
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(244, 63, 94); // Rose 500
  doc.roundedRect(x2, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(190, 18, 60);
  doc.text('2. TOTAL SALIDAS', x2 + 2.5, cardY + 5);

  doc.setFontSize(10);
  doc.setTextColor(159, 18, 57);
  doc.text(`-Bs. ${grandTotalSalidasVES.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, x2 + 2.5, cardY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(190, 18, 60);
  doc.text(`Compra USD: -Bs. ${wallet.totalVesSpent.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, x2 + 2.5, cardY + 15.5);
  doc.text(`Otras salidas: -Bs. ${totalExpensesVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, x2 + 2.5, cardY + 19);

  // 1.3 DISPONIBILIDAD EN BOLÍVARES
  const x3 = x2 + cardW + cardGap;
  doc.setFillColor(255, 253, 245); // Amber 50
  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.roundedRect(x3, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text('3. DISPONIBILIDAD EN BS.', x3 + 2.5, cardY + 5);

  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(`Bs. ${wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, x3 + 2.5, cardY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`(Entradas - Compra USD - Egresos)`, x3 + 2.5, cardY + 15.5);
  doc.text('Saldo neto en cuentas/caja', x3 + 2.5, cardY + 19);

  // 1.4 DISPONIBILIDAD EN DÓLARES (CARTERA USD)
  const x4 = x3 + cardW + cardGap;
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.roundedRect(x4, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 95, 70);
  doc.text('4. DISPONIBILIDAD EN USD', x4 + 2.5, cardY + 5);

  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(`$${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, x4 + 2.5, cardY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(5, 150, 105);
  doc.text(`${wallet.purchaseCount} compras de protección`, x4 + 2.5, cardY + 15.5);
  doc.text(`Tasa prom: ${wallet.averageExchangeRate.toFixed(2)} Bs/$`, x4 + 2.5, cardY + 19);

  // =========================================================================
  // 2. DISCRIMINACIÓN DE CARTERA USD (EN QUÉ CARTERA ESTÁN LOS DÓLARES)
  // =========================================================================
  const sec2Y = 56;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, sec2Y, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text('DISCRIMINACIÓN DE CARTERA DE DÓLARES (UBICACIÓN Y RESGUARDO)', 18, sec2Y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(87, 83, 78);
  doc.text('Distribución de los fondos en moneda extranjera comprados para salvaguardar el valor de la colecta:', 18, sec2Y + 9);

  const breakdown = wallet.walletBreakdown && wallet.walletBreakdown.length > 0
    ? wallet.walletBreakdown
    : [
        { wallet: 'Bóveda / Efectivo Divisas Pastoral', amountUSD: wallet.totalUsdPurchased, percentage: 100, count: wallet.purchaseCount }
      ];

  const colWidth = 182 / Math.max(breakdown.length, 1);
  breakdown.forEach((item, idx) => {
    const bx = 18 + idx * colWidth;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(bx, sec2Y + 11, colWidth - 5, 10.5, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(146, 64, 14);
    doc.text(item.wallet.length > 25 ? `${item.wallet.slice(0, 23)}..` : item.wallet, bx + 2, sec2Y + 15);

    doc.setFontSize(8);
    doc.setTextColor(6, 78, 59);
    doc.text(`$${item.amountUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, bx + 2, sec2Y + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(120, 113, 108);
    doc.text(`${item.percentage.toFixed(0)}% · ${item.count} ops`, bx + colWidth - 22, sec2Y + 19);
  });

  currentY = 83;

  // =========================================================================
  // 3. SECCIÓN DETALLE DE SALIDAS (AGRUPADAS: COMPRA DE DÓLARES Y OTRAS SALIDAS)
  // =========================================================================
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(159, 18, 57); // Rose 900
  doc.text('HISTORIAL DE SALIDAS Y EGRESOS DE FONDOS', 14, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`Total salidas: ${dollarPurchases.length + expenses.length} transacciones · Total: -Bs. ${grandTotalSalidasVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 196, currentY + 4, { align: 'right' });
  currentY += 7;

  // -------------------------------------------------------------------------
  // 3.1 SUBGRUPO: SALIDAS POR COMPRA DE DÓLARES
  // -------------------------------------------------------------------------
  const drawDollarPurchasesHeader = () => {
    doc.setFillColor(254, 242, 242); // Rose 50
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(14, currentY, 182, 5.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(159, 18, 57);
    doc.text(`A. COMPRA DE DÓLARES (${dollarPurchases.length} operaciones · Inversión: -Bs. ${wallet.totalVesSpent.toLocaleString('es-VE', { maximumFractionDigits: 0 })} → $${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD)`, 16, currentY + 3.8);

    currentY += 6.5;

    // Cabecera de columnas
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, currentY, 182, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(87, 83, 78);
    doc.text('FECHA', 16, currentY + 3.5);
    doc.text('CÓDIGO', 34, currentY + 3.5);
    doc.text('ORIGEN (CTA)', 52, currentY + 3.5);
    doc.text('DESTINO (CARTERA)', 82, currentY + 3.5);
    doc.text('TASA BS/$', 128, currentY + 3.5, { align: 'right' });
    doc.text('COMPRA USD', 152, currentY + 3.5, { align: 'right' });
    doc.text('SALIDA BS', 178, currentY + 3.5, { align: 'right' });
    doc.text('REF.', 194, currentY + 3.5, { align: 'right' });

    currentY += 5.5;
  };

  ensureSpace(16);
  drawDollarPurchasesHeader();

  if (dollarPurchases.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text('No hay compras de dólares registradas.', 16, currentY + 3.5);
    currentY += 6;
  } else {
    dollarPurchases.forEach((p, idx) => {
      ensureSpace(5.5, () => drawDollarPurchasesHeader());

      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 249);
        doc.rect(14, currentY - 1, 182, 5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(28, 25, 23);

      // Formato unificado dd/mm/aaaa
      const dateFormatted = formatDateDMY(p.date || p.timestamp);
      doc.text(dateFormatted, 16, currentY + 2.7);
      doc.text(p.id, 34, currentY + 2.7);

      const origShort = p.originAccount.length > 17 ? `${p.originAccount.slice(0, 15)}..` : p.originAccount;
      doc.text(origShort, 52, currentY + 2.7);

      const destShort = p.destinationWallet.length > 27 ? `${p.destinationWallet.slice(0, 25)}..` : p.destinationWallet;
      doc.text(destShort, 82, currentY + 2.7);

      doc.text(`${(p.exchangeRate || 0).toFixed(2)}`, 128, currentY + 2.7, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 78, 59);
      doc.text(`$${(p.usdAmount || 0).toFixed(2)}`, 152, currentY + 2.7, { align: 'right' });

      doc.setTextColor(190, 18, 60);
      doc.text(`-Bs. ${(p.vesAmount || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 178, currentY + 2.7, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(120, 113, 108);
      const refShort = p.reference ? (p.reference.length > 10 ? `${p.reference.slice(0, 9)}.` : p.reference) : '-';
      doc.text(refShort, 194, currentY + 2.7, { align: 'right' });

      currentY += 5;
    });

    // Subtotal Compra de Dólares
    ensureSpace(6);
    doc.setFillColor(245, 245, 244);
    doc.rect(14, currentY, 182, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(159, 18, 57);
    doc.text(`Subtotal Compra de Dólares (${dollarPurchases.length} ops):`, 16, currentY + 3.5);
    doc.setTextColor(6, 78, 59);
    doc.text(`$${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, 152, currentY + 3.5, { align: 'right' });
    doc.setTextColor(190, 18, 60);
    doc.text(`-Bs. ${wallet.totalVesSpent.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 178, currentY + 3.5, { align: 'right' });
    currentY += 7.5;
  }

  // -------------------------------------------------------------------------
  // 3.2 SUBGRUPO: OTRAS SALIDAS (GASTOS OPERATIVOS, LOGÍSTICA, IMPRENTA, ETC.)
  // -------------------------------------------------------------------------
  const drawOtherExpensesHeader = () => {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(14, currentY, 182, 5.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(159, 18, 57);
    doc.text(`B. OTRAS SALIDAS Y GASTOS OPERATIVOS (${expenses.length} comprobantes · Total: -Bs. ${totalExpensesVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}${totalExpensesUSD > 0 ? ` + $${totalExpensesUSD.toFixed(2)} USD` : ''})`, 16, currentY + 3.8);

    currentY += 6.5;

    // Cabecera de columnas
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, currentY, 182, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(87, 83, 78);
    doc.text('FECHA', 16, currentY + 3.5);
    doc.text('CÓDIGO', 34, currentY + 3.5);
    doc.text('CONCEPTO / DESCRIPCIÓN', 50, currentY + 3.5);
    doc.text('CATEGORÍA', 100, currentY + 3.5);
    doc.text('MÉTODO / ORIGEN', 130, currentY + 3.5);
    doc.text('BENEFICIARIO', 156, currentY + 3.5);
    doc.text('MONTO SALIDA', 194, currentY + 3.5, { align: 'right' });

    currentY += 5.5;
  };

  ensureSpace(16);
  drawOtherExpensesHeader();

  if (expenses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text('No hay otras salidas registradas aún en el sistema.', 16, currentY + 3.5);
    currentY += 6;
  } else {
    expenses.forEach((exp, idx) => {
      ensureSpace(5.5, () => drawOtherExpensesHeader());

      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 249);
        doc.rect(14, currentY - 1, 182, 5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(28, 25, 23);

      // Formato unificado dd/mm/aaaa
      const dateFormatted = formatDateDMY(exp.date || exp.timestamp);
      doc.text(dateFormatted, 16, currentY + 2.7);
      doc.text(exp.id, 34, currentY + 2.7);

      const conceptShort = exp.concept.length > 34 ? `${exp.concept.slice(0, 32)}..` : exp.concept;
      doc.text(conceptShort, 50, currentY + 2.7);

      doc.setTextColor(120, 113, 108);
      const catShort = exp.category.length > 18 ? `${exp.category.slice(0, 16)}..` : exp.category;
      doc.text(catShort, 100, currentY + 2.7);

      const payShort = exp.paymentMethod.length > 16 ? `${exp.paymentMethod.slice(0, 14)}..` : exp.paymentMethod;
      doc.text(payShort, 130, currentY + 2.7);

      const benShort = exp.beneficiary ? (exp.beneficiary.length > 16 ? `${exp.beneficiary.slice(0, 14)}..` : exp.beneficiary) : '-';
      doc.text(benShort, 156, currentY + 2.7);

      doc.setFont('helvetica', 'bold');
      if (exp.currency === 'USD' || (exp.amountUSD && exp.amountUSD > 0)) {
        doc.setTextColor(6, 78, 59);
        doc.text(`$${(exp.amountUSD || 0).toFixed(2)} USD`, 194, currentY + 2.7, { align: 'right' });
      } else {
        doc.setTextColor(190, 18, 60);
        doc.text(`-Bs. ${exp.amountVES.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 194, currentY + 2.7, { align: 'right' });
      }

      currentY += 5;
    });

    // Subtotal Otras Salidas
    ensureSpace(6);
    doc.setFillColor(245, 245, 244);
    doc.rect(14, currentY, 182, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(159, 18, 57);
    doc.text(`Subtotal Otras Salidas (${expenses.length} comprobantes):`, 16, currentY + 3.5);
    doc.text(`-Bs. ${totalExpensesVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}${totalExpensesUSD > 0 ? ` (+ $${totalExpensesUSD.toFixed(2)} USD)` : ''}`, 194, currentY + 3.5, { align: 'right' });
    currentY += 7.5;
  }

  // -------------------------------------------------------------------------
  // CONSOLIDADO TOTAL DE SALIDAS
  // -------------------------------------------------------------------------
  ensureSpace(9);
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(244, 63, 94);
  doc.roundedRect(14, currentY, 182, 7, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(159, 18, 57);
  doc.text('TOTAL CONSOLIDADO DE SALIDAS (COMPRA USD + OTRAS SALIDAS):', 18, currentY + 4.5);
  doc.setFontSize(8);
  doc.text(`-Bs. ${grandTotalSalidasVES.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 194, currentY + 4.8, { align: 'right' });
  currentY += 11;

  // =========================================================================
  // 4. SECCIÓN DETALLE DE ENTRADAS (AGRUPADAS POR PARROQUIA O COLEGIO)
  // =========================================================================
  // Filtrar reservas que constituyen entradas (pagadas). Si no hay ninguna pagada, usar todas para evitar reporte vacío.
  const allPaid = reservations.filter((r) => r.paymentStatus === 'Pagado');
  const useFallbackAll = allPaid.length === 0 && reservations.length > 0;
  const targetReservations = useFallbackAll ? reservations : allPaid;

  const parroquias = targetReservations.filter((r) => r.institutionType === 'Parroquia');
  const colegios = targetReservations.filter((r) => r.institutionType !== 'Parroquia');

  const calcSubtotals = (list: CrmReservation[]) => {
    let eur = 0;
    let ves = 0;
    const rate = wallet.lastExchangeRate > 0 ? wallet.lastExchangeRate : 44.5;
    list.forEach((r) => {
      const e = Number(r.totalEUR || 0);
      eur += e;
      ves += e * rate;
    });
    return { eur, ves };
  };

  const subParroquias = calcSubtotals(parroquias);
  const subColegios = calcSubtotals(colegios);

  // Encabezado general de entradas
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87); // Emerald 800
  doc.text('HISTORIAL DE ENTRADAS (RESERVACIONES CONCILIADAS)', 14, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text(
    useFallbackAll
      ? `Total registradas: ${reservations.length} reservas (aviso: sin marcar como pagadas aún)`
      : `Total cobros conciliados: ${allPaid.length} reservas · Total: +Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { maximumFractionDigits: 0 })} (${kpis.totalMontoRecaudadoEUR.toFixed(2)} €)`,
    196,
    currentY + 4,
    { align: 'right' }
  );
  currentY += 7;

  // -------------------------------------------------------------------------
  // 4.1 SUBGRUPO: ENTRADAS POR PARROQUIAS
  // -------------------------------------------------------------------------
  const drawParroquiasHeader = () => {
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, currentY, 182, 5.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(4, 120, 87);
    doc.text(`A. ENTRADAS: PARROQUIAS (${parroquias.length} transacciones · Total: ${subParroquias.eur.toFixed(2)} € ≈ +Bs. ${subParroquias.ves.toLocaleString('es-VE', { maximumFractionDigits: 0 })})`, 16, currentY + 3.8);

    currentY += 6.5;

    // Cabecera de columnas
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, currentY, 182, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(87, 83, 78);
    doc.text('FECHA', 16, currentY + 3.5);
    doc.text('CÓDIGO', 34, currentY + 3.5);
    doc.text('PARROQUIA / CONTACTO', 52, currentY + 3.5);
    doc.text('MÉTODO PAGO', 110, currentY + 3.5);
    doc.text('REF. PAGO', 140, currentY + 3.5);
    doc.text('MONTO EUR', 168, currentY + 3.5, { align: 'right' });
    doc.text('MONTO BS (EST)', 194, currentY + 3.5, { align: 'right' });

    currentY += 5.5;
  };

  ensureSpace(16);
  drawParroquiasHeader();

  if (parroquias.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text('No hay entradas de Parroquias conciliadas aún.', 16, currentY + 3.5);
    currentY += 6;
  } else {
    const rateToUse = wallet.lastExchangeRate > 0 ? wallet.lastExchangeRate : 44.5;
    parroquias.forEach((r, idx) => {
      ensureSpace(5.5, () => drawParroquiasHeader());

      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 249);
        doc.rect(14, currentY - 1, 182, 5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(28, 25, 23);

      // Formato unificado dd/mm/aaaa
      const dateFormatted = formatDateDMY(r.paymentDate || r.timestamp);
      doc.text(dateFormatted, 16, currentY + 2.7);
      doc.text(r.code || 'RES', 34, currentY + 2.7);

      const nameShort = r.institutionName.length > 34 ? `${r.institutionName.slice(0, 32)}..` : r.institutionName;
      doc.text(nameShort, 52, currentY + 2.7);

      doc.setTextColor(120, 113, 108);
      const methodShort = r.paymentMethod ? (r.paymentMethod.length > 18 ? `${r.paymentMethod.slice(0, 16)}..` : r.paymentMethod) : 'Pago Móvil';
      doc.text(methodShort, 110, currentY + 2.7);

      const refShort = r.paymentRef ? (r.paymentRef.length > 16 ? `${r.paymentRef.slice(0, 14)}..` : r.paymentRef) : '-';
      doc.text(refShort, 140, currentY + 2.7);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(`${(r.totalEUR || 0).toFixed(2)} €`, 168, currentY + 2.7, { align: 'right' });

      const vesAmount = (r.totalEUR || 0) * rateToUse;
      doc.text(`+Bs. ${vesAmount.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 194, currentY + 2.7, { align: 'right' });

      currentY += 5;
    });

    // Subtotal Parroquias
    ensureSpace(6);
    doc.setFillColor(245, 245, 244);
    doc.rect(14, currentY, 182, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(4, 120, 87);
    doc.text(`Subtotal Parroquias (${parroquias.length} reservas):`, 16, currentY + 3.5);
    doc.text(`${subParroquias.eur.toFixed(2)} €`, 168, currentY + 3.5, { align: 'right' });
    doc.text(`+Bs. ${subParroquias.ves.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 194, currentY + 3.5, { align: 'right' });
    currentY += 7.5;
  }

  // -------------------------------------------------------------------------
  // 4.2 SUBGRUPO: ENTRADAS POR COLEGIOS E INSTITUTOS EDUCATIVOS
  // -------------------------------------------------------------------------
  const drawColegiosHeader = () => {
    doc.setFillColor(236, 253, 245); // Emerald 50
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, currentY, 182, 5.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(4, 120, 87);
    doc.text(`B. ENTRADAS: COLEGIOS E INSTITUTOS (${colegios.length} transacciones · Total: ${subColegios.eur.toFixed(2)} € ≈ +Bs. ${subColegios.ves.toLocaleString('es-VE', { maximumFractionDigits: 0 })})`, 16, currentY + 3.8);

    currentY += 6.5;

    // Cabecera de columnas
    doc.setFillColor(245, 245, 244);
    doc.setDrawColor(229, 231, 235);
    doc.rect(14, currentY, 182, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(87, 83, 78);
    doc.text('FECHA', 16, currentY + 3.5);
    doc.text('CÓDIGO', 34, currentY + 3.5);
    doc.text('COLEGIO / CONTACTO', 52, currentY + 3.5);
    doc.text('MÉTODO PAGO', 110, currentY + 3.5);
    doc.text('REF. PAGO', 140, currentY + 3.5);
    doc.text('MONTO EUR', 168, currentY + 3.5, { align: 'right' });
    doc.text('MONTO BS (EST)', 194, currentY + 3.5, { align: 'right' });

    currentY += 5.5;
  };

  ensureSpace(16);
  drawColegiosHeader();

  if (colegios.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text('No hay entradas de Colegios conciliadas aún.', 16, currentY + 3.5);
    currentY += 6;
  } else {
    const rateToUse = wallet.lastExchangeRate > 0 ? wallet.lastExchangeRate : 44.5;
    colegios.forEach((r, idx) => {
      ensureSpace(5.5, () => drawColegiosHeader());

      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 249);
        doc.rect(14, currentY - 1, 182, 5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(28, 25, 23);

      // Formato unificado dd/mm/aaaa
      const dateFormatted = formatDateDMY(r.paymentDate || r.timestamp);
      doc.text(dateFormatted, 16, currentY + 2.7);
      doc.text(r.code || 'RES', 34, currentY + 2.7);

      const nameShort = r.institutionName.length > 34 ? `${r.institutionName.slice(0, 32)}..` : r.institutionName;
      doc.text(nameShort, 52, currentY + 2.7);

      doc.setTextColor(120, 113, 108);
      const methodShort = r.paymentMethod ? (r.paymentMethod.length > 18 ? `${r.paymentMethod.slice(0, 16)}..` : r.paymentMethod) : 'Pago Móvil';
      doc.text(methodShort, 110, currentY + 2.7);

      const refShort = r.paymentRef ? (r.paymentRef.length > 16 ? `${r.paymentRef.slice(0, 14)}..` : r.paymentRef) : '-';
      doc.text(refShort, 140, currentY + 2.7);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87);
      doc.text(`${(r.totalEUR || 0).toFixed(2)} €`, 168, currentY + 2.7, { align: 'right' });

      const vesAmount = (r.totalEUR || 0) * rateToUse;
      doc.text(`+Bs. ${vesAmount.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 194, currentY + 2.7, { align: 'right' });

      currentY += 5;
    });

    // Subtotal Colegios
    ensureSpace(6);
    doc.setFillColor(245, 245, 244);
    doc.rect(14, currentY, 182, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(4, 120, 87);
    doc.text(`Subtotal Colegios (${colegios.length} reservas):`, 16, currentY + 3.5);
    doc.text(`${subColegios.eur.toFixed(2)} €`, 168, currentY + 3.5, { align: 'right' });
    doc.text(`+Bs. ${subColegios.ves.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 194, currentY + 3.5, { align: 'right' });
    currentY += 7.5;
  }

  // -------------------------------------------------------------------------
  // CONSOLIDADO TOTAL DE ENTRADAS
  // -------------------------------------------------------------------------
  ensureSpace(9);
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(14, currentY, 182, 7, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87);
  doc.text('TOTAL CONSOLIDADO DE ENTRADAS (PARROQUIAS + COLEGIOS):', 18, currentY + 4.5);
  doc.setFontSize(8);
  doc.text(`+Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${kpis.totalMontoRecaudadoEUR.toFixed(2)} €)`, 194, currentY + 4.8, { align: 'right' });
  currentY += 12;

  // =========================================================================
  // 5. RESUMEN DE CONCILIACIÓN Y DISPONIBILIDAD FINAL (CUADRE DE TESORERÍA)
  // =========================================================================
  ensureSpace(28);
  doc.setFillColor(255, 251, 235); // Amber 50
  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.roundedRect(14, currentY, 182, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('CUADRE DE TESORERÍA Y DISPONIBILIDAD CONSOLIDADA', 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(28, 25, 23);

  // Fila de resumen matemático
  const balY = currentY + 11;
  doc.text(`(+) Entradas Totales:`, 18, balY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 78, 59);
  doc.text(`+Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 47, balY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(28, 25, 23);
  doc.text(`(-) Compra Dólares:`, 80, balY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60);
  doc.text(`-Bs. ${wallet.totalVesSpent.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 110, balY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(28, 25, 23);
  doc.text(`(-) Otras Salidas:`, 140, balY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 18, 60);
  doc.text(`-Bs. ${totalExpensesVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, 166, balY);

  // Segunda fila: saldos finales
  const balY2 = currentY + 18.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text(`(=) DISPONIBILIDAD EN BOLÍVARES:`, 18, balY2);
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`Bs. ${wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 74, balY2);

  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text(`(=) DISPONIBILIDAD EN DÓLARES (CARTERA):`, 120, balY2);
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text(`$${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, 194, balY2, { align: 'right' });

  // =========================================================================
  // PIE DE PÁGINA EN TODAS LAS PÁGINAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(14, 283, 196, 283);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(28, 25, 23);
    doc.text('Secretariado Arquidiocesano de Pastoral Familiar · Arquidiócesis de Maracaibo', 14, 287);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(120, 113, 108);
    doc.text('Documento oficial de tesorería y rendición de cuentas para auditoría de campaña.', 14, 290.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text(`Página ${p} de ${totalPages} · ID: ${reportId}`, 196, 287, { align: 'right' });

    // Franja decorativa inferior
    doc.setFillColor(146, 64, 14);
    doc.rect(0, 293.5, 210, 3.5, 'F');
  }

  return doc;
}

export function downloadFinancialReportPdfBlob(doc: jsPDF, filename: string): boolean {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.warn('Error con Blob URL en PDF de finanzas, usando doc.save()', err);
    try {
      doc.save(filename);
      return true;
    } catch {
      return false;
    }
  }
}
