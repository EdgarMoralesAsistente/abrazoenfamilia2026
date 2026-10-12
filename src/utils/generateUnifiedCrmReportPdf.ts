import { jsPDF } from 'jspdf';
import {
  CrmReservation,
  CrmKPIs,
  CrmExpense,
  DollarPurchase,
  ExpensesSummary,
  DollarWalletSummary
} from '../types/reservation';
import { CrmUser } from '../types/auth';
import { getStoredExpenses, calculateExpensesSummary } from './expensesStorage';
import { getStoredDollarPurchases, calculateDollarWalletSummary } from './dollarWalletStorage';

export const OFFICIAL_PASTORAL_LOGO_URL =
  'https://res.cloudinary.com/djvpapwvq/image/upload/v1789603448/Logo_del_Secretariado_de_Pastoral_Familiar_Sin_fondo_nffmht.png';
const LOCAL_PASTORAL_LOGO_URL = '/logo_pastoral_familiar.png';

let cachedLogoDataUrl: string | null = null;

/**
 * Obtiene el logo oficial de la Pastoral Familiar en formato Base64 Data URL
 */
export async function getPastoralLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  const candidates = [LOCAL_PASTORAL_LOGO_URL, OFFICIAL_PASTORAL_LOGO_URL];

  for (const url of candidates) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (dataUrl && dataUrl.startsWith('data:image')) {
          cachedLogoDataUrl = dataUrl;
          return dataUrl;
        }
      }
    } catch {
      // Intentar con siguiente candidato
    }
  }

  // Fallback con canvas
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 471;
          canvas.height = img.naturalHeight || 530;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            reject(new Error('No canvas context'));
          }
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = OFFICIAL_PASTORAL_LOGO_URL;
    });

    if (dataUrl) {
      cachedLogoDataUrl = dataUrl;
      return dataUrl;
    }
  } catch (canvasErr) {
    console.warn('Fallback canvas para logo falló:', canvasErr);
  }

  return '';
}

/**
 * Formateador universal y estricto de fechas al formato unificado dd/mm/aaaa
 */
export function formatDateDMY(raw?: string | number | null): string {
  if (!raw) return '-';
  const str = String(raw).trim();
  if (!str) return '-';

  // Si ya viene como dd/mm/aaaa
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Si viene como d/m/aaaa o dd/m/aaaa o d/mm/aaaa
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Si viene en formato ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // Si viene con timestamp de Javascript
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return str;
}

export interface UnifiedReportData {
  reservations: CrmReservation[];
  kpis: CrmKPIs;
  expenses?: CrmExpense[];
  dollarPurchases?: DollarPurchase[];
  currentUser?: CrmUser;
}

/**
 * Genera el Reporte Ejecutivo y Financiero Integral Unificado en formato PDF.
 * Integra de manera fluida y cohesionada:
 * 1. Resumen Ejecutivo de Gestión, Producción & Metas de Imprenta
 * 2. Disponibilidad de Tesorería, Flujo de Caja & Cartera de Dólares
 * 3. Análisis Comparativo de Entradas vs Salidas
 * 4. Historial Completo de Salidas (Compra de Dólares y Otras Salidas)
 * 5. Historial Completo de Entradas (Agrupadas por Parroquia y Colegio)
 * 6. Conciliación Final, Balance de Disponibilidad y Certificación Oficial
 */
export async function generateUnifiedCrmPdf(data: UnifiedReportData): Promise<jsPDF> {
  const {
    reservations,
    kpis,
    expenses: inputExpenses,
    dollarPurchases: inputPurchases,
    currentUser
  } = data;

  // Obtener salidas y compras reales si no fueron inyectadas
  const expenses: CrmExpense[] = inputExpenses || getStoredExpenses();
  const dollarPurchases: DollarPurchase[] = inputPurchases || getStoredDollarPurchases();

  // Calcular resúmenes financieros exactos
  const expensesSummary: ExpensesSummary =
    kpis.expensesSummary || calculateExpensesSummary(expenses);

  const wallet: DollarWalletSummary =
    kpis.walletSummary ||
    calculateDollarWalletSummary(
      dollarPurchases,
      reservations,
      44.5,
      expensesSummary.totalExpensesVES,
      expensesSummary.totalExpensesUSD
    );

  // Crear documento A4 vertical: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Pre-cargar logo institucional
  let logoDataUrl = '';
  try {
    logoDataUrl = await getPastoralLogoDataUrl();
  } catch (e) {
    console.warn('No se pudo cargar el logo oficial para el PDF:', e);
  }

  // Metadatos de fecha y hora
  const now = new Date();
  const formattedDate = formatDateDMY(now.toISOString().slice(0, 10));
  const formattedTime = now.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Márgenes y dimensiones del documento
  const marginX = 14;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - marginX * 2; // 182 mm
  let cursorY = 0;

  // Helper para verificar y ejecutar saltos de página con encabezado repetido
  const checkPageBreak = (neededHeight: number, isTable = false): boolean => {
    if (cursorY + neededHeight > pageHeight - 18) {
      doc.addPage();
      drawPageMiniHeader();
      cursorY = 20;
      return true;
    }
    return false;
  };

  // Mini encabezado para páginas 2 en adelante
  const drawPageMiniHeader = () => {
    doc.setFillColor(146, 64, 14); // Amber 800
    doc.rect(0, 0, pageWidth, 3.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text(
      'ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR · CAMPAÑA ABRAZO EN FAMILIA 2026',
      marginX,
      9
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text(
      'Reporte Ejecutivo Integral: Gestión, Producción, Cobranzas & Tesorería',
      marginX,
      13
    );

    doc.text(`Corte: ${formattedDate} ${formattedTime}`, pageWidth - marginX, 13, { align: 'right' });

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.line(marginX, 15.5, pageWidth - marginX, 15.5);
  };

  // Métricas de Gestión y Cobranzas
  const pctReservasPagadas =
    kpis.totalReservas > 0
      ? Math.round((kpis.reservasPagadas / kpis.totalReservas) * 100)
      : 0;

  const pctMontoRecaudadoNum =
    kpis.totalMontoEUR > 0
      ? (kpis.totalMontoRecaudadoEUR / kpis.totalMontoEUR) * 100
      : 0;
  const pctMontoRecaudado = pctMontoRecaudadoNum.toFixed(1);

  const pctEntregas =
    kpis.totalReservas > 0
      ? Math.round((kpis.entregasCompletadas / kpis.totalReservas) * 100)
      : 0;

  const totalInst = kpis.totalParroquias + kpis.totalColegios;
  const pctParroquias = totalInst > 0 ? Math.round((kpis.totalParroquias / totalInst) * 100) : 0;
  const pctColegios = totalInst > 0 ? Math.round((kpis.totalColegios / totalInst) * 100) : 0;

  const pedidosPagadosSinEntregar = reservations.filter(
    (r) => r.paymentStatus === 'Pagado' && r.deliveryStatus !== 'Entregado'
  ).length;

  // =========================================================================
  // PÁGINA 1: RESUMEN EJECUTIVO DE GESTIÓN, PRODUCCIÓN Y DISPONIBILIDAD
  // =========================================================================

  // 1. Barra superior de marca
  doc.setFillColor(146, 64, 14); // Amber 800
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  // 2. Encabezado Oficial
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 13.5, 7.5, 15.5, 17.5, undefined, 'FAST');
    } catch (e) {
      console.warn('Error al estampar logo en portada:', e);
    }
  }

  // Textos del Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR', 32, 11.5);

  doc.setFontSize(15);
  doc.setTextColor(28, 25, 23);
  doc.text('Campaña Abrazo en Familia 2026', 32, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(87, 83, 78);
  doc.text('Reporte Ejecutivo Integral: Gestión, Producción, Cobranzas & Tesorería', 32, 22.5);

  // Cuadro de Metadatos de Emisión a la derecha
  const metaBoxX = 135;
  const metaBoxW = 61;
  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(metaBoxX, 7.5, metaBoxW, 18.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`Fecha emisión: ${formattedDate}`, metaBoxX + 2.5, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(87, 83, 78);
  doc.text(`Hora de corte: ${formattedTime}`, metaBoxX + 2.5, 16);
  doc.text(`Operador: ${currentUser ? currentUser.name : 'Secretariado Pastoral'}`, metaBoxX + 2.5, 20);

  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('• En vivo · Sincronizado Google Sheets', metaBoxX + 2.5, 24);

  // Línea separadora
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, 28.5, pageWidth - marginX, 28.5);

  // =========================================================================
  // FILA 1 DE KPIS OPERATIVOS & GESTIÓN (5 TARJETAS)
  // =========================================================================
  const cardY = 31.5;
  const cardH = 18;
  const cardGap = 2.5;
  const cardW = (contentWidth - cardGap * 4) / 5; // ~34.4 mm

  // KPI 1: Total Reservas
  let cx = marginX;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL RESERVAS', cx + 2.5, cardY + 4.5);

  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.totalReservas}`, cx + 2.5, cardY + 10.5);

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(cx + cardW - 13, cardY + 6.5, 11, 4.2, 1, 1, 'F');
  doc.setFontSize(5.2);
  doc.setTextColor(4, 120, 87);
  doc.text(`${pctReservasPagadas}%`, cx + cardW - 11, cardY + 9.5);

  doc.setFillColor(229, 231, 235);
  doc.roundedRect(cx + 2.5, cardY + 12.5, cardW - 5, 1.8, 0.8, 0.8, 'F');
  doc.setFillColor(5, 150, 105);
  const wBar1 = ((cardW - 5) * Math.min(pctReservasPagadas, 100)) / 100;
  if (wBar1 > 0) doc.roundedRect(cx + 2.5, cardY + 12.5, wBar1, 1.8, 0.8, 0.8, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.reservasPagadas} pag. · ${kpis.reservasPendientesPago} pend.`, cx + 2.5, cardY + 16.5);

  // KPI 2: Monto Total (€)
  cx += cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL CAMPAÑA (€)', cx + 2.5, cardY + 4.5);

  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.totalMontoEUR.toFixed(2)} €`, cx + 2.5, cardY + 10.5);

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(cx + cardW - 13, cardY + 6.5, 11, 4.2, 1, 1, 'F');
  doc.setFontSize(5.2);
  doc.setTextColor(4, 120, 87);
  doc.text(`${pctMontoRecaudado}%`, cx + cardW - 11.2, cardY + 9.5);

  doc.setFillColor(229, 231, 235);
  doc.roundedRect(cx + 2.5, cardY + 12.5, cardW - 5, 1.8, 0.8, 0.8, 'F');
  doc.setFillColor(5, 150, 105);
  const wBar2 = ((cardW - 5) * Math.min(pctMontoRecaudadoNum, 100)) / 100;
  if (wBar2 > 0) doc.roundedRect(cx + 2.5, cardY + 12.5, wBar2, 1.8, 0.8, 0.8, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(4, 120, 87);
  doc.text(`${kpis.totalMontoRecaudadoEUR.toFixed(2)} € cobrado`, cx + 2.5, cardY + 16.5);

  // KPI 3: Total Piezas Imprenta
  cx += cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL PIEZAS IMPRENTA', cx + 2.5, cardY + 4.5);

  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.totalPiezas}`, cx + 2.5, cardY + 10.5);

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(cx + cardW - 13, cardY + 6.5, 11, 4.2, 1, 1, 'F');
  doc.setFontSize(5.2);
  doc.setTextColor(146, 64, 14);
  doc.text(`${kpis.totalKits} kits`, cx + cardW - 11.5, cardY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.totalAfiches} af · ${kpis.totalGuias} g · ${kpis.totalHojas} h`, cx + 2.5, cardY + 16.5);

  // KPI 4: Por Cobrar
  cx += cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text('POR COBRAR (€)', cx + 2.5, cardY + 4.5);

  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text(`${kpis.montoPendientePagoEUR.toFixed(2)} €`, cx + 2.5, cardY + 10.5);

  if (kpis.reservasVerificando > 0) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(cx + cardW - 14, cardY + 6.5, 12, 4.2, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.8);
    doc.setTextColor(29, 78, 216);
    doc.text(`${kpis.reservasVerificando} verif.`, cx + cardW - 13, cardY + 9.5);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.reservasPendientesPago} reservas pend.`, cx + 2.5, cardY + 16.5);

  // KPI 5: Despacho y Logística
  cx += cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text('DESPACHO / LOGÍSTICA', cx + 2.5, cardY + 4.5);

  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(`${pctEntregas}%`, cx + 2.5, cardY + 10.5);

  doc.setFillColor(245, 245, 244);
  doc.roundedRect(cx + cardW - 13, cardY + 6.5, 11, 4.2, 1, 1, 'F');
  doc.setFontSize(5.2);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.entregasCompletadas} ok`, cx + cardW - 11, cardY + 9.5);

  doc.setFillColor(229, 231, 235);
  doc.roundedRect(cx + 2.5, cardY + 12.5, cardW - 5, 1.8, 0.8, 0.8, 'F');
  doc.setFillColor(68, 64, 60);
  const wBar5 = ((cardW - 5) * Math.min(pctEntregas, 100)) / 100;
  if (wBar5 > 0) doc.roundedRect(cx + 2.5, cardY + 12.5, wBar5, 1.8, 0.8, 0.8, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.entregasCompletadas} entr. · ${kpis.entregasPendientes} ruta`, cx + 2.5, cardY + 16.5);

  // =========================================================================
  // FILA 2: DISPONIBILIDAD DE TESORERÍA & FLUJO DE CAJA (3 TARJETAS)
  // =========================================================================
  const row2Y = 51.5;
  const row2H = 19.5;
  const row2Gap = 3.5;
  const row2W = (contentWidth - row2Gap * 2) / 3; // ~58.3 mm

  // Tarjeta 1: Disponibilidad en Bolívares (VES)
  let r2x = marginX;
  doc.setFillColor(255, 253, 245);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.35);
  doc.roundedRect(r2x, row2Y, row2W, row2H, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(146, 64, 14);
  doc.text('DISPONIBILIDAD EN BOLÍVARES (VES)', r2x + 3, row2Y + 4.5);

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(r2x + row2W - 22, row2Y + 1.8, 20, 3.8, 1, 1, 'F');
  doc.setFontSize(4.8);
  doc.setTextColor(146, 64, 14);
  doc.text('SALDO NETO', r2x + row2W - 19, row2Y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(
    `Bs. ${wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    r2x + 3,
    row2Y + 10.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(4, 120, 87);
  doc.text(
    `(+) Recaudado: Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
    r2x + 3,
    row2Y + 14.5
  );

  doc.setTextColor(180, 83, 9);
  const totalSalidasYUsd = wallet.totalVesSpent + (wallet.totalExpensesVES || 0);
  doc.text(
    `(-) Salidas & USD: -Bs. ${totalSalidasYUsd.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
    r2x + 3,
    row2Y + 17.8
  );

  // Tarjeta 2: Disponibilidad en Dólares (USD) - Cartera de Divisas
  r2x += row2W + row2Gap;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.35);
  doc.roundedRect(r2x, row2Y, row2W, row2H, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(6, 95, 70);
  doc.text('DISPONIBILIDAD EN DÓLARES (USD)', r2x + 3, row2Y + 4.5);

  doc.setFillColor(209, 250, 229);
  doc.roundedRect(r2x + row2W - 27, row2Y + 1.8, 25, 3.8, 1, 1, 'F');
  doc.setFontSize(4.8);
  doc.setTextColor(4, 120, 87);
  doc.text('CARTERA USD ANTI-DEV.', r2x + row2W - 25.5, row2Y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text(
    `$${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
    r2x + 3,
    row2Y + 10.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `• ${wallet.purchaseCount} compras · Tasa prom: ${wallet.averageExchangeRate > 0 ? wallet.averageExchangeRate.toFixed(2) : '0.00'} Bs/$`,
    r2x + 3,
    row2Y + 14.5
  );

  doc.setTextColor(5, 150, 105);
  doc.text(
    `• Resguardo: Bóveda / Custodia Pastoral Familiar`,
    r2x + 3,
    row2Y + 17.8
  );

  // Tarjeta 3: Salidas Operativas y Gastos
  r2x += row2W + row2Gap;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.35);
  doc.roundedRect(r2x, row2Y, row2W, row2H, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(159, 18, 57);
  doc.text('SALIDAS & GASTOS OPERATIVOS', r2x + 3, row2Y + 4.5);

  doc.setFillColor(255, 228, 230);
  doc.roundedRect(r2x + row2W - 25, row2Y + 1.8, 23, 3.8, 1, 1, 'F');
  doc.setFontSize(4.8);
  doc.setTextColor(159, 18, 57);
  doc.text(`${expenses.length} COMPROBANTES`, r2x + row2W - 23.5, row2Y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(136, 19, 55);
  const totalExpensesVesPrint = expensesSummary.totalExpensesVES || wallet.totalExpensesVES || 0;
  doc.text(
    `Bs. ${totalExpensesVesPrint.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    r2x + 3,
    row2Y + 10.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  doc.setTextColor(159, 18, 57);
  const totalExpUsdPrint = expensesSummary.totalExpensesUSD || wallet.totalExpensesUSD || 0;
  doc.text(
    `• Salidas en USD: $${totalExpUsdPrint.toFixed(2)} USD`,
    r2x + 3,
    row2Y + 14.5
  );
  doc.setTextColor(87, 83, 78);
  doc.text(
    `• Gastos de flete, imprenta, envíos y suministros`,
    r2x + 3,
    row2Y + 17.8
  );

  doc.setLineWidth(0.2);

  // =========================================================================
  // SECCIÓN CENTRAL: MATERIALES PARA CARACAS & COMPARATIVA INSTITUCIONAL
  // =========================================================================
  const sec2Y = 73.5;

  // Bloque Izquierdo: Materiales para Caracas (Imprenta)
  const matW = 106;
  const matH = 88;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(marginX, sec2Y, matW, matH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text('MATERIALES SOLICITADOS PARA CARACAS (IMPRENTA)', marginX + 4, sec2Y + 6.2);

  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(marginX + matW - 38, sec2Y + 2.5, 34, 5, 1.5, 1.5, 'FD');
  doc.setFontSize(6.8);
  doc.setTextColor(146, 64, 14);
  doc.text(`Total: ${kpis.totalPiezas} piezas`, marginX + matW - 35, sec2Y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(120, 113, 108);
  doc.text('Cantidades requeridas para orden nacional de producción con cantidad visible en cada barra:', marginX + 4, sec2Y + 10.8);

  const materialsList = [
    { label: 'Kits Completos', count: kpis.totalKits, color: [146, 64, 14] as [number, number, number], note: 'Contiene Afiche + Guía + Hojas' },
    { label: 'Afiches Oficiales', count: kpis.totalAfiches, color: [217, 119, 6] as [number, number, number], note: 'Promocionales para carteleras y templos' },
    { label: 'Guías del Facilitador', count: kpis.totalGuias, color: [2, 132, 199] as [number, number, number], note: 'Material doctrinal para orientadores' },
    { label: 'Hojas del Niño', count: kpis.totalHojas, color: [22, 163, 74] as [number, number, number], note: 'Dinámicas para catequesis y aulas' }
  ];

  const maxMat = Math.max(...materialsList.map((m) => m.count), 1);
  let barY = sec2Y + 15;

  materialsList.forEach((mat) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    doc.text(mat.label, marginX + 4, barY + 3.2);

    doc.setFontSize(9);
    doc.setTextColor(mat.color[0], mat.color[1], mat.color[2]);
    doc.text(`${mat.count} unidades`, marginX + matW - 32, barY + 3.2);

    doc.setFillColor(245, 245, 244);
    doc.roundedRect(marginX + 4, barY + 5, matW - 8, 4.5, 1.2, 1.2, 'F');

    const pct = Math.max(mat.count / maxMat, 0.08);
    const fillWidth = (matW - 8) * pct;
    doc.setFillColor(mat.color[0], mat.color[1], mat.color[2]);
    doc.roundedRect(marginX + 4, barY + 5, fillWidth, 4.5, 1.2, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text(`${mat.count}`, marginX + 7, barY + 8.4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 113, 108);
    doc.text(mat.note, marginX + 4, barY + 12.8);

    barY += 15;
  });

  // Mini resumen 4 bloques
  const miniY = sec2Y + matH - 11;
  const miniW = (matW - 10) / 4;
  const miniLabels = [
    { title: 'KITS', val: `${kpis.totalKits}`, bg: [254, 243, 199], c: [146, 64, 14] },
    { title: 'AFICHES', val: `${kpis.totalAfiches}`, bg: [250, 250, 249], c: [68, 64, 60] },
    { title: 'GUÍAS', val: `${kpis.totalGuias}`, bg: [240, 249, 255], c: [2, 132, 199] },
    { title: 'HOJAS', val: `${kpis.totalHojas}`, bg: [240, 253, 244], c: [22, 163, 74] }
  ];

  miniLabels.forEach((ml, idx) => {
    const mx = marginX + 4 + idx * miniW;
    doc.setFillColor(ml.bg[0], ml.bg[1], ml.bg[2]);
    doc.roundedRect(mx, miniY, miniW - 2, 8.8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(120, 113, 108);
    doc.text(ml.title, mx + 2, miniY + 3.2);
    doc.setFontSize(8);
    doc.setTextColor(ml.c[0], ml.c[1], ml.c[2]);
    doc.text(ml.val, mx + 2, miniY + 7.2);
  });

  // Bloque Derecho: Comparativa Parroquias vs Colegios
  const compX = marginX + matW + 4;
  const compW = contentWidth - matW - 4; // ~72 mm
  const compH = 88;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(compX, sec2Y, compW, compH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text('COMPARATIVA INSTITUCIONAL', compX + 4, sec2Y + 6.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(120, 113, 108);
  doc.text('Demanda y aportes por tipo de centro:', compX + 4, sec2Y + 10.8);

  const sideW = (compW - 11) / 2;
  const sideH = 37;
  const sideY = sec2Y + 14;

  // Parroquia
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(compX + 4, sideY, sideW, sideH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text(`PARROQUIAS (${pctParroquias}%)`, compX + 6, sideY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(28, 25, 23);
  doc.text(`• Reservas: ${kpis.totalParroquias}`, compX + 6, sideY + 11.5);
  doc.text(`• Piezas: ${kpis.piezasParroquias}`, compX + 6, sideY + 17);
  doc.text(`• Kits: ${kpis.totalKits}`, compX + 6, sideY + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text(`Aporte: ${kpis.montoParroquiasEUR.toFixed(2)} €`, compX + 6, sideY + 32);

  // Colegios
  const colX = compX + 4 + sideW + 3;
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(56, 189, 248);
  doc.roundedRect(colX, sideY, sideW, sideH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`COLEGIOS (${pctColegios}%)`, colX + 2, sideY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(28, 25, 23);
  doc.text(`• Reservas: ${kpis.totalColegios}`, colX + 2, sideY + 11.5);
  doc.text(`• Piezas: ${kpis.piezasColegios}`, colX + 2, sideY + 17);
  doc.text(`• Kits: ${kpis.totalColegios}`, colX + 2, sideY + 22.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`Aporte: ${kpis.montoColegiosEUR.toFixed(2)} €`, colX + 2, sideY + 32);

  // Barra de Distribución Porcentual
  const distY = sideY + sideH + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(87, 83, 78);
  doc.text('Distribución de Demanda:', compX + 4, distY);

  const barDistW = compW - 8;
  doc.setFillColor(146, 64, 14);
  const wPar = (barDistW * pctParroquias) / 100;
  if (wPar > 0) doc.roundedRect(compX + 4, distY + 5.5, wPar, 3.5, 1, 1, 'F');

  doc.setFillColor(2, 132, 199);
  const wCol = barDistW - wPar;
  if (wCol > 0) doc.roundedRect(compX + 4 + wPar, distY + 5.5, wCol, 3.5, 1, 1, 'F');

  doc.setFontSize(6);
  doc.setTextColor(120, 113, 108);
  doc.text(`Total registrado: ${totalInst} instituciones arquidiocesanas`, compX + 4, distY + 14);

  // =========================================================================
  // SECCIÓN INFERIOR PÁGINA 1: ALERTAS ESTRATÉGICAS Y ACCIONES RECOMENDADAS
  // =========================================================================
  const sec3Y = 164.5;
  const col3W = (contentWidth - 8) / 3; // ~58 mm
  const col3H = 99;

  // Columna 1: Estado de Cobranzas
  const col1X = marginX;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col1X, sec3Y, col3W, col3H, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 25, 23);
  doc.text('ESTADO DE COBRANZAS', col1X + 4, sec3Y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Control de ingresos y pagos:', col1X + 4, sec3Y + 10.5);

  // Pagados
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(col1X + 4, sec3Y + 13.5, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(4, 120, 87);
  doc.text('PAGADOS (100% Confirmado)', col1X + 6, sec3Y + 18);
  doc.setFontSize(10.5);
  doc.text(`${kpis.totalMontoRecaudadoEUR.toFixed(2)} €`, col1X + 6, sec3Y + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(`${kpis.reservasPagadas} reservaciones conciliadas`, col1X + 6, sec3Y + 28);

  // Pendientes
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(col1X + 4, sec3Y + 33, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 83, 9);
  doc.text('PENDIENTES DE PAGO', col1X + 6, sec3Y + 37.5);
  doc.setFontSize(10.5);
  doc.text(`${kpis.montoPendientePagoEUR.toFixed(2)} €`, col1X + 6, sec3Y + 43.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(`${kpis.reservasPendientesPago} reservas por liquidar`, col1X + 6, sec3Y + 47.5);

  // Verificando
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(col1X + 4, sec3Y + 52.5, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(29, 78, 216);
  doc.text('EN VERIFICACIÓN BANCARIA', col1X + 6, sec3Y + 57);
  doc.setFontSize(9);
  doc.text(`${kpis.reservasVerificando} pagos con referencia`, col1X + 6, sec3Y + 63);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Requieren cotejo con estados de cuenta', col1X + 6, sec3Y + 67);

  // Total en caja & Cartera
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(col1X + 4, sec3Y + 72, col3W - 8, 23, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(87, 83, 78);
  doc.text('DISPONIBLE EN CAJA & CARTERA:', col1X + 6, sec3Y + 76.5);
  doc.setFontSize(9.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`${kpis.totalMontoRecaudadoEUR.toFixed(2)} €`, col1X + 6, sec3Y + 82);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(6, 95, 70);
  doc.text(`Cartera: $${wallet.totalUsdPurchased.toFixed(2)} USD protegidos`, col1X + 6, sec3Y + 87.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 113, 108);
  doc.text(`Saldo Bs: ${wallet.availableVesBalance.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs.`, col1X + 6, sec3Y + 92);

  // Columna 2: Cadena Logística y Despacho
  const col2X = col1X + col3W + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col2X, sec3Y, col3W, col3H, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 25, 23);
  doc.text('CADENA DE DESPACHO', col2X + 4, sec3Y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Flujo Caracas ➔ Maracaibo ➔ Destino:', col2X + 4, sec3Y + 10.5);

  doc.setFillColor(250, 250, 249);
  doc.roundedRect(col2X + 4, sec3Y + 13.5, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(68, 64, 60);
  doc.text('1. POR IMPRIMIR / EN CARACAS', col2X + 6, sec3Y + 18);
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.entregasPendientes} pedidos`, col2X + 6, sec3Y + 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(120, 113, 108);
  doc.text('Material en preparación nacional', col2X + 6, sec3Y + 28);

  doc.setFillColor(240, 249, 255);
  doc.roundedRect(col2X + 4, sec3Y + 33, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(2, 132, 199);
  doc.text('2. EN RUTA O CENTRO DE ACOPIO', col2X + 6, sec3Y + 37.5);
  doc.setFontSize(10.5);
  doc.text('Sede Maracaibo', col2X + 6, sec3Y + 43.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Recepción y embalaje por zona', col2X + 6, sec3Y + 47.5);

  doc.setFillColor(236, 253, 245);
  doc.roundedRect(col2X + 4, sec3Y + 52.5, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(4, 120, 87);
  doc.text('3. ENTREGADOS EN DESTINO', col2X + 6, sec3Y + 57);
  doc.setFontSize(10.5);
  doc.text(`${kpis.entregasCompletadas} pedidos (${pctEntregas}%)`, col2X + 6, sec3Y + 63);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Recibidos por la comunidad', col2X + 6, sec3Y + 67);

  doc.setFillColor(250, 250, 249);
  doc.roundedRect(col2X + 4, sec3Y + 72, col3W - 8, 23, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(87, 83, 78);
  doc.text('EFECTIVIDAD DE ENTREGA:', col2X + 6, sec3Y + 78);
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(`${pctEntregas}% completado`, col2X + 6, sec3Y + 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(120, 113, 108);
  doc.text(`${kpis.entregasPendientes} despachos en programación`, col2X + 6, sec3Y + 91);

  // Columna 3: Alertas para Toma de Decisiones
  const col3X = col2X + col3W + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col3X, sec3Y, col3W, col3H, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('TOMA DE DECISIONES', col3X + 4, sec3Y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Alertas estratégicas recomendadas:', col3X + 4, sec3Y + 10.5);

  // Alerta 1
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(col3X + 4, sec3Y + 13.5, col3W - 8, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(4, 120, 87);
  doc.text('• PRIORIDAD DE DESPACHO', col3X + 6, sec3Y + 18);
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text(`${pedidosPagadosSinEntregar} pedidos listos`, col3X + 6, sec3Y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Pagos confirmados esperando por despacho y entrega parroquial.', col3X + 6, sec3Y + 27.5, { maxWidth: col3W - 12 });

  // Alerta 2
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(col3X + 4, sec3Y + 40, col3W - 8, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(180, 83, 9);
  doc.text('• PRIORIDAD DE COBRANZA', col3X + 6, sec3Y + 44.5);
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15);
  doc.text(`${kpis.montoPendientePagoEUR.toFixed(2)} € por recaudar`, col3X + 6, sec3Y + 49.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(`${kpis.reservasPendientesPago} reservas con saldo pendiente. Emitir recordatorio de pago.`, col3X + 6, sec3Y + 54, { maxWidth: col3W - 12 });

  // Alerta 3
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(col3X + 4, sec3Y + 66.5, col3W - 8, 28.5, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text('• RESGUARDO CAMBIARIO ACTIVO', col3X + 6, sec3Y + 71);
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text(`$${wallet.totalUsdPurchased.toFixed(2)} USD en Cartera`, col3X + 6, sec3Y + 76);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.text(`Invertidos ${wallet.totalVesSpent.toLocaleString('es-VE')} Bs. a ${wallet.averageExchangeRate.toFixed(2)} Bs/$ de tasa promedio.`, col3X + 6, sec3Y + 80.5, { maxWidth: col3W - 12 });
  doc.text('Fondos protegidos contra devaluación.', col3X + 6, sec3Y + 90);

  // Línea inferior página 1
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginX, 266, pageWidth - marginX, 266);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(28, 25, 23);
  doc.text('Secretariado Arquidiocesano de Pastoral Familiar · Arquidiócesis de Maracaibo', marginX, 270.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(120, 113, 108);
  doc.text('Campaña Abrazo en Familia 2026 · Documento Oficial Auditado · Continúa en Página 2 con detalle de transacciones ➔', marginX, 274.5);

  // =========================================================================
  // PÁGINA 2: ANÁLISIS DE ENTRADAS VS SALIDAS & HISTORIAL DE SALIDAS
  // =========================================================================
  doc.addPage();
  drawPageMiniHeader();
  cursorY = 20;

  // Título de Sección II
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(146, 64, 14);
  doc.text('SECCIÓN II: ANÁLISIS DE ENTRADAS VS SALIDAS Y FLUJO DE TESORERÍA', marginX, cursorY);
  cursorY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 113, 108);
  doc.text(
    'Conciliación de ingresos recaudados contra egresos operativos y adquisiciones de protección cambiaria:',
    marginX,
    cursorY
  );
  cursorY += 5;

  // Cuadrícula de 4 tarjetas comparativas
  const compCardW = (contentWidth - 6) / 4;
  const compCardH = 18;

  // 1. Entradas Recaudadas
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(marginX, cursorY, compCardW, compCardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 95, 70);
  doc.text('(+) ENTRADAS RECAUDADAS', marginX + 2.5, cursorY + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text(
    `Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
    marginX + 2.5,
    cursorY + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.text(`≈ ${kpis.totalMontoRecaudadoEUR.toFixed(2)} € (${kpis.reservasPagadas} pagadas)`, marginX + 2.5, cursorY + 15);

  // 2. Compra de Dólares
  let cx2 = marginX + compCardW + 2;
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(cx2, cursorY, compCardW, compCardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text('(-) COMPRA DE DÓLARES', cx2 + 2.5, cursorY + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(120, 53, 15);
  doc.text(
    `-Bs. ${wallet.totalVesSpent.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
    cx2 + 2.5,
    cursorY + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.text(`Adquiridos: $${wallet.totalUsdPurchased.toFixed(2)} USD`, cx2 + 2.5, cursorY + 15);

  // 3. Otras Salidas Operativas
  cx2 += compCardW + 2;
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(244, 63, 94);
  doc.roundedRect(cx2, cursorY, compCardW, compCardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(159, 18, 57);
  doc.text('(-) OTRAS SALIDAS Y GASTOS', cx2 + 2.5, cursorY + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(136, 19, 55);
  doc.text(
    `-Bs. ${totalExpensesVesPrint.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
    cx2 + 2.5,
    cursorY + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.text(`En USD: $${totalExpUsdPrint.toFixed(2)} USD (${expenses.length} gastos)`, cx2 + 2.5, cursorY + 15);

  // 4. Saldo Neto en Bolívares
  cx2 += compCardW + 2;
  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(120, 113, 108);
  doc.roundedRect(cx2, cursorY, compCardW, compCardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(28, 25, 23);
  doc.text('(=) DISPONIBLE EN BS.', cx2 + 2.5, cursorY + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(
    `Bs. ${wallet.availableVesBalance.toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
    cx2 + 2.5,
    cursorY + 10.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(4, 120, 87);
  doc.text(`+ $${wallet.totalUsdPurchased.toFixed(2)} USD en cartera`, cx2 + 2.5, cursorY + 15);

  cursorY += compCardH + 8;

  // =========================================================================
  // SECCIÓN III: HISTORIAL COMPLETO DE SALIDAS (AGRUPADAS)
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(146, 64, 14);
  doc.text('SECCIÓN III: HISTORIAL COMPLETO DE SALIDAS', marginX, cursorY);
  cursorY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 113, 108);
  doc.text(
    'Totalidad de transacciones de egreso agrupadas en: 1. Compra de Dólares y 2. Otras Salidas Operativas:',
    marginX,
    cursorY
  );
  cursorY += 6;

  // -------------------------------------------------------------------------
  // SUBSECCIÓN III-A: COMPRA DE DÓLARES (PROTECCIÓN CAMBIARIA)
  // -------------------------------------------------------------------------
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(marginX, cursorY, contentWidth, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(146, 64, 14);
  doc.text('1. SALIDAS POR COMPRA DE DÓLARES (PROTECCIÓN CAMBIARIA)', marginX + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`${dollarPurchases.length} operaciones registradas`, pageWidth - marginX - 3, cursorY + 4.2, { align: 'right' });
  cursorY += 7.5;

  // Encabezado de tabla Compra de Dólares
  const drawDollarTableHeader = () => {
    doc.setFillColor(245, 245, 244);
    doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.line(marginX, cursorY + 5.5, pageWidth - marginX, cursorY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(68, 64, 60);

    doc.text('FECHA', marginX + 2, cursorY + 3.8);
    doc.text('REF / COMP.', marginX + 22, cursorY + 3.8);
    doc.text('BENEFICIARIO / OPERADOR', marginX + 46, cursorY + 3.8);
    doc.text('MONTO USD', marginX + 98, cursorY + 3.8, { align: 'right' });
    doc.text('TASA (Bs/$)', marginX + 120, cursorY + 3.8, { align: 'right' });
    doc.text('COSTO BS.', marginX + 148, cursorY + 3.8, { align: 'right' });
    doc.text('CARTERA / DESTINO', marginX + 152, cursorY + 3.8);
    cursorY += 6;
  };

  drawDollarTableHeader();

  let subtotalUsdPurchased = 0;
  let subtotalVesSpent = 0;

  if (dollarPurchases.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text('No se registran compras de dólares en el período.', marginX + 3, cursorY + 4);
    cursorY += 6.5;
  } else {
    dollarPurchases.forEach((p, idx) => {
      checkPageBreak(6);

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(250, 250, 249);
        doc.rect(marginX, cursorY, contentWidth, 5.2, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(28, 25, 23);

      const dDate = formatDateDMY(p.date);
      const dRef = p.reference ? (p.reference.length > 12 ? p.reference.slice(0, 12) + '...' : p.reference) : '-';
      const dEntity = (p as any).sellerName || p.operator || 'Casa de Cambio';
      const entityClean = dEntity.length > 26 ? dEntity.slice(0, 24) + '...' : dEntity;
      const dUsd = Number(p.usdAmount || (p as any).amountUSD || 0);
      const dRate = Number(p.exchangeRate || 0);
      const dVes = Number(p.vesAmount || (p as any).amountVES || (dUsd * dRate));
      const dWallet = p.destinationWallet || (p as any).targetWallet || 'Bóveda';

      subtotalUsdPurchased += dUsd;
      subtotalVesSpent += dVes;

      doc.text(dDate, marginX + 2, cursorY + 3.6);
      doc.text(dRef, marginX + 22, cursorY + 3.6);
      doc.text(entityClean, marginX + 46, cursorY + 3.6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 95, 70);
      doc.text(`$${dUsd.toFixed(2)}`, marginX + 98, cursorY + 3.6, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(68, 64, 60);
      doc.text(`${dRate.toFixed(2)}`, marginX + 120, cursorY + 3.6, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(`${dVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, marginX + 148, cursorY + 3.6, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(87, 83, 78);
      doc.text(dWallet.length > 16 ? dWallet.slice(0, 15) + '...' : dWallet, marginX + 152, cursorY + 3.6);

      cursorY += 5.2;
    });

    // Fila de Subtotal Compra de Dólares
    checkPageBreak(6.5);
    doc.setFillColor(254, 243, 199);
    doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text('SUBTOTAL COMPRA DE DÓLARES:', marginX + 2, cursorY + 3.8);

    doc.setTextColor(6, 95, 70);
    doc.text(`$${subtotalUsdPurchased.toFixed(2)} USD`, marginX + 98, cursorY + 3.8, { align: 'right' });

    const avgSubRate = subtotalUsdPurchased > 0 ? (subtotalVesSpent / subtotalUsdPurchased).toFixed(2) : '-';
    doc.setTextColor(68, 64, 60);
    doc.text(`Tasa prom: ${avgSubRate}`, marginX + 120, cursorY + 3.8, { align: 'right' });

    doc.setTextColor(180, 83, 9);
    doc.text(`Bs. ${subtotalVesSpent.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, marginX + 148, cursorY + 3.8, { align: 'right' });
    cursorY += 7.5;
  }

  // -------------------------------------------------------------------------
  // SUBSECCIÓN III-B: OTRAS SALIDAS OPERATIVAS Y GASTOS
  // -------------------------------------------------------------------------
  checkPageBreak(12);
  doc.setFillColor(255, 241, 242); // Rose 100
  doc.roundedRect(marginX, cursorY, contentWidth, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(159, 18, 57);
  doc.text('2. OTRAS SALIDAS OPERATIVAS Y GASTOS (NO COMPRA DE DIVISAS)', marginX + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`${expenses.length} comprobantes registrados`, pageWidth - marginX - 3, cursorY + 4.2, { align: 'right' });
  cursorY += 7.5;

  const drawExpenseTableHeader = () => {
    doc.setFillColor(245, 245, 244);
    doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.line(marginX, cursorY + 5.5, pageWidth - marginX, cursorY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(68, 64, 60);

    doc.text('FECHA', marginX + 2, cursorY + 3.8);
    doc.text('REF / COMP.', marginX + 22, cursorY + 3.8);
    doc.text('CATEGORÍA', marginX + 44, cursorY + 3.8);
    doc.text('CONCEPTO / DETALLE', marginX + 70, cursorY + 3.8);
    doc.text('MONTO BS.', marginX + 130, cursorY + 3.8, { align: 'right' });
    doc.text('MONTO USD', marginX + 155, cursorY + 3.8, { align: 'right' });
    doc.text('MÉTODO', marginX + 160, cursorY + 3.8);
    cursorY += 6;
  };

  drawExpenseTableHeader();

  let subtotalExpensesVes = 0;
  let subtotalExpensesUsd = 0;

  if (expenses.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text('No se registran gastos operativos en el período.', marginX + 3, cursorY + 4);
    cursorY += 6.5;
  } else {
    expenses.forEach((e, idx) => {
      checkPageBreak(6);

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(250, 250, 249);
        doc.rect(marginX, cursorY, contentWidth, 5.2, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(28, 25, 23);

      const eDate = formatDateDMY(e.date);
      const eRef = e.reference ? (e.reference.length > 10 ? e.reference.slice(0, 10) + '...' : e.reference) : '-';
      const eCat = e.category || 'Operativo';
      const eConcept = e.concept ? (e.concept.length > 34 ? e.concept.slice(0, 32) + '...' : e.concept) : '-';
      const eVes = Number(e.amountVES || 0);
      const eUsd = Number(e.amountUSD || 0);
      const eMethod = e.paymentMethod || 'Transferencia';

      subtotalExpensesVes += eVes;
      subtotalExpensesUsd += eUsd;

      doc.text(eDate, marginX + 2, cursorY + 3.6);
      doc.text(eRef, marginX + 22, cursorY + 3.6);
      doc.text(eCat.length > 14 ? eCat.slice(0, 13) + '.' : eCat, marginX + 44, cursorY + 3.6);
      doc.text(eConcept, marginX + 70, cursorY + 3.6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(159, 18, 57);
      doc.text(`${eVes > 0 ? eVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}`, marginX + 130, cursorY + 3.6, { align: 'right' });

      doc.setTextColor(6, 95, 70);
      doc.text(`${eUsd > 0 ? `$${eUsd.toFixed(2)}` : '-'}`, marginX + 155, cursorY + 3.6, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(87, 83, 78);
      doc.text(eMethod.length > 12 ? eMethod.slice(0, 11) + '.' : eMethod, marginX + 160, cursorY + 3.6);

      cursorY += 5.2;
    });

    // Fila de Subtotal Otras Salidas
    checkPageBreak(6.5);
    doc.setFillColor(255, 228, 230);
    doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(159, 18, 57);
    doc.text('SUBTOTAL OTRAS SALIDAS Y GASTOS:', marginX + 2, cursorY + 3.8);

    doc.text(`Bs. ${subtotalExpensesVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, marginX + 130, cursorY + 3.8, { align: 'right' });
    doc.setTextColor(6, 95, 70);
    doc.text(`$${subtotalExpensesUsd.toFixed(2)} USD`, marginX + 155, cursorY + 3.8, { align: 'right' });
    cursorY += 8;
  }

  // =========================================================================
  // PÁGINA 3: HISTORIAL COMPLETO DE ENTRADAS (AGRUPADAS POR PARROQUIA Y COLEGIO)
  // =========================================================================
  doc.addPage();
  drawPageMiniHeader();
  cursorY = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(146, 64, 14);
  doc.text('SECCIÓN IV: HISTORIAL COMPLETO DE ENTRADAS', marginX, cursorY);
  cursorY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 113, 108);
  doc.text(
    'Totalidad de reservaciones registradas en el sistema agrupadas por: 1. Parroquias y 2. Colegios:',
    marginX,
    cursorY
  );
  cursorY += 6;

  // Filtrar reservas por parroquias y colegios
  const parroquiasReservas = reservations.filter((r) => r.institutionType === 'Parroquia');
  const colegiosReservas = reservations.filter((r) => r.institutionType !== 'Parroquia');

  // Helper para dibujar encabezado de tabla de Entradas
  const drawIncomeTableHeader = () => {
    doc.setFillColor(245, 245, 244);
    doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.line(marginX, cursorY + 5.5, pageWidth - marginX, cursorY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(68, 64, 60);

    doc.text('FECHA', marginX + 2, cursorY + 3.8);
    doc.text('CÓDIGO', marginX + 22, cursorY + 3.8);
    doc.text('INSTITUCIÓN (PARROQUIA / COLEGIO)', marginX + 44, cursorY + 3.8);
    doc.text('PIEZAS', marginX + 104, cursorY + 3.8, { align: 'right' });
    doc.text('TOTAL (€)', marginX + 124, cursorY + 3.8, { align: 'right' });
    doc.text('PAGO / REF.', marginX + 128, cursorY + 3.8);
    doc.text('ESTADO PAGO', marginX + 180, cursorY + 3.8, { align: 'right' });
    cursorY += 6;
  };

  // -------------------------------------------------------------------------
  // SUBSECCIÓN IV-A: ENTRADAS POR PARROQUIAS
  // -------------------------------------------------------------------------
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(marginX, cursorY, contentWidth, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(146, 64, 14);
  doc.text('1. ENTRADAS DE PARROQUIAS ARQUIDIOCESANAS', marginX + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`${parroquiasReservas.length} registros`, pageWidth - marginX - 3, cursorY + 4.2, { align: 'right' });
  cursorY += 7.5;

  drawIncomeTableHeader();

  let subtotalParroquiaPiezas = 0;
  let subtotalParroquiaMonto = 0;
  let subtotalParroquiaRecaudado = 0;

  parroquiasReservas.forEach((r, idx) => {
    checkPageBreak(5.6);

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 249);
      doc.rect(marginX, cursorY, contentWidth, 5.2, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(28, 25, 23);

    const rDate = formatDateDMY(r.paymentDate || r.timestamp);
    const rCode = r.code || '-';
    const rInst = r.institutionName ? (r.institutionName.length > 34 ? r.institutionName.slice(0, 32) + '...' : r.institutionName) : '-';
    const rPiezas = Number(r.totalQuantity || 0);
    const rEur = Number(r.totalEUR || 0);
    const rRef = r.paymentRef ? (r.paymentRef.length > 14 ? r.paymentRef.slice(0, 13) + '..' : r.paymentRef) : '-';
    const rStatus = r.paymentStatus || 'Pendiente';

    subtotalParroquiaPiezas += rPiezas;
    subtotalParroquiaMonto += rEur;
    if (rStatus === 'Pagado') {
      subtotalParroquiaRecaudado += rEur;
    }

    doc.text(rDate, marginX + 2, cursorY + 3.6);
    doc.text(rCode, marginX + 22, cursorY + 3.6);
    doc.text(rInst, marginX + 44, cursorY + 3.6);

    doc.setFont('helvetica', 'bold');
    doc.text(`${rPiezas}`, marginX + 104, cursorY + 3.6, { align: 'right' });

    doc.setTextColor(146, 64, 14);
    doc.text(`${rEur.toFixed(2)} €`, marginX + 124, cursorY + 3.6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    doc.text(rRef, marginX + 128, cursorY + 3.6);

    // Estado con color
    if (rStatus === 'Pagado') {
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.text('Pagado', marginX + 180, cursorY + 3.6, { align: 'right' });
    } else if (rStatus === 'Verificando') {
      doc.setTextColor(29, 78, 216);
      doc.setFont('helvetica', 'bold');
      doc.text('Verificando', marginX + 180, cursorY + 3.6, { align: 'right' });
    } else {
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'normal');
      doc.text('Pendiente', marginX + 180, cursorY + 3.6, { align: 'right' });
    }

    cursorY += 5.2;
  });

  // Fila de Subtotal Parroquias
  checkPageBreak(6.5);
  doc.setFillColor(254, 243, 199);
  doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text(`SUBTOTAL PARROQUIAS (${parroquiasReservas.length} inst.):`, marginX + 2, cursorY + 3.8);

  doc.setTextColor(28, 25, 23);
  doc.text(`${subtotalParroquiaPiezas} piezas`, marginX + 104, cursorY + 3.8, { align: 'right' });

  doc.setTextColor(146, 64, 14);
  doc.text(`${subtotalParroquiaMonto.toFixed(2)} €`, marginX + 124, cursorY + 3.8, { align: 'right' });

  doc.setTextColor(4, 120, 87);
  doc.text(`Cobrado: ${subtotalParroquiaRecaudado.toFixed(2)} €`, marginX + 180, cursorY + 3.8, { align: 'right' });
  cursorY += 8.5;

  // -------------------------------------------------------------------------
  // SUBSECCIÓN IV-B: ENTRADAS POR COLEGIOS
  // -------------------------------------------------------------------------
  checkPageBreak(12);
  doc.setFillColor(240, 249, 255); // Sky 100
  doc.roundedRect(marginX, cursorY, contentWidth, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(2, 132, 199);
  doc.text('2. ENTRADAS DE COLEGIOS Y CENTROS EDUCATIVOS', marginX + 3, cursorY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(`${colegiosReservas.length} registros`, pageWidth - marginX - 3, cursorY + 4.2, { align: 'right' });
  cursorY += 7.5;

  drawIncomeTableHeader();

  let subtotalColegioPiezas = 0;
  let subtotalColegioMonto = 0;
  let subtotalColegioRecaudado = 0;

  colegiosReservas.forEach((r, idx) => {
    checkPageBreak(5.6);

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 249);
      doc.rect(marginX, cursorY, contentWidth, 5.2, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(28, 25, 23);

    const rDate = formatDateDMY(r.paymentDate || r.timestamp);
    const rCode = r.code || '-';
    const rInst = r.institutionName ? (r.institutionName.length > 34 ? r.institutionName.slice(0, 32) + '...' : r.institutionName) : '-';
    const rPiezas = Number(r.totalQuantity || 0);
    const rEur = Number(r.totalEUR || 0);
    const rRef = r.paymentRef ? (r.paymentRef.length > 14 ? r.paymentRef.slice(0, 13) + '..' : r.paymentRef) : '-';
    const rStatus = r.paymentStatus || 'Pendiente';

    subtotalColegioPiezas += rPiezas;
    subtotalColegioMonto += rEur;
    if (rStatus === 'Pagado') {
      subtotalColegioRecaudado += rEur;
    }

    doc.text(rDate, marginX + 2, cursorY + 3.6);
    doc.text(rCode, marginX + 22, cursorY + 3.6);
    doc.text(rInst, marginX + 44, cursorY + 3.6);

    doc.setFont('helvetica', 'bold');
    doc.text(`${rPiezas}`, marginX + 104, cursorY + 3.6, { align: 'right' });

    doc.setTextColor(2, 132, 199);
    doc.text(`${rEur.toFixed(2)} €`, marginX + 124, cursorY + 3.6, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);
    doc.text(rRef, marginX + 128, cursorY + 3.6);

    if (rStatus === 'Pagado') {
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.text('Pagado', marginX + 180, cursorY + 3.6, { align: 'right' });
    } else if (rStatus === 'Verificando') {
      doc.setTextColor(29, 78, 216);
      doc.setFont('helvetica', 'bold');
      doc.text('Verificando', marginX + 180, cursorY + 3.6, { align: 'right' });
    } else {
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'normal');
      doc.text('Pendiente', marginX + 180, cursorY + 3.6, { align: 'right' });
    }

    cursorY += 5.2;
  });

  // Fila de Subtotal Colegios
  checkPageBreak(6.5);
  doc.setFillColor(240, 249, 255);
  doc.rect(marginX, cursorY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`SUBTOTAL COLEGIOS (${colegiosReservas.length} inst.):`, marginX + 2, cursorY + 3.8);

  doc.setTextColor(28, 25, 23);
  doc.text(`${subtotalColegioPiezas} piezas`, marginX + 104, cursorY + 3.8, { align: 'right' });

  doc.setTextColor(2, 132, 199);
  doc.text(`${subtotalColegioMonto.toFixed(2)} €`, marginX + 124, cursorY + 3.8, { align: 'right' });

  doc.setTextColor(4, 120, 87);
  doc.text(`Cobrado: ${subtotalColegioRecaudado.toFixed(2)} €`, marginX + 180, cursorY + 3.8, { align: 'right' });
  cursorY += 8.5;

  // =========================================================================
  // PÁGINA 4: CONCILIACIÓN FINAL, BALANCE DE DISPONIBILIDAD Y FIRMAS
  // =========================================================================
  doc.addPage();
  drawPageMiniHeader();
  cursorY = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(146, 64, 14);
  doc.text('SECCIÓN V: CONCILIACIÓN FINAL, BALANCE DE DISPONIBILIDAD Y CERTIFICACIÓN', marginX, cursorY);
  cursorY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(120, 113, 108);
  doc.text(
    'Cuadro oficial de cierre financiero auditado y balance de activos al corte de emisión:',
    marginX,
    cursorY
  );
  cursorY += 6;

  // Tabla Matemática de Conciliación
  const concLines = [
    { label: '(+) Total Ingresos Recaudados (Reservas Pagadas)', amount: `Bs. ${wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `≈ ${kpis.totalMontoRecaudadoEUR.toFixed(2)} € recibidos en cuentas oficiales`, color: [4, 120, 87] },
    { label: '(-) Desembolsos por Compra de Dólares (Resguardo Cambiario)', amount: `-Bs. ${wallet.totalVesSpent.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `Adquiridos $${wallet.totalUsdPurchased.toFixed(2)} USD a tasa prom. ${wallet.averageExchangeRate.toFixed(2)} Bs/$`, color: [180, 83, 9] },
    { label: '(-) Salidas Operativas y Gastos Ejecutados', amount: `-Bs. ${totalExpensesVesPrint.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `Gastos de logística, transporte y operatividad (${expenses.length} comprobantes)`, color: [159, 18, 57] },
    { label: '(=) DISPONIBILIDAD NETA EN BOLÍVARES (VES)', amount: `Bs. ${wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: 'Saldo neto exacto disponible en cuentas bancarias / caja chica', color: [28, 25, 23], bold: true },
    { label: '(+) DISPONIBILIDAD EN CARTERA DE DÓLARES (USD)', amount: `$${wallet.totalUsdPurchased.toFixed(2)} USD`, sub: 'Divisas en custodia física / bóveda para pago a imprenta y proveedores', color: [6, 95, 70], bold: true }
  ];

  concLines.forEach((item, idx) => {
    checkPageBreak(12);

    const isHighlight = item.bold;
    if (isHighlight) {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(marginX, cursorY, contentWidth, 11, 2, 2, 'F');
    } else {
      doc.setFillColor(idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 249 : 255);
      doc.roundedRect(marginX, cursorY, contentWidth, 10.5, 1.5, 1.5, 'F');
    }

    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setFontSize(isHighlight ? 7.8 : 7.2);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, marginX + 3.5, cursorY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isHighlight ? 9 : 8);
    doc.text(item.amount, pageWidth - marginX - 3.5, cursorY + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(120, 113, 108);
    doc.text(item.sub, marginX + 3.5, cursorY + 8.2);

    cursorY += isHighlight ? 12.5 : 11.5;
  });

  cursorY += 4;

  // Cuadro de Resumen Ejecutivo de Patrimonio y Cobertura
  checkPageBreak(28);
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(marginX, cursorY, contentWidth, 24, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70);
  doc.text('RESGUARDO PATRIMONIAL Y COBERTURA INTEGRAL ACTIVA', marginX + 4, cursorY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(28, 25, 23);
  doc.text(
    `La estrategia de compra de divisas ha permitido proteger el 100% de los fondos contra la volatilidad cambiaria. El total de $${wallet.totalUsdPurchased.toFixed(2)} USD adquiridos garantiza la liquidez necesaria para la cancelación oportuna de la factura de imprenta nacional en Caracas.`,
    marginX + 4,
    cursorY + 11.5,
    { maxWidth: contentWidth - 8 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(4, 120, 87);
  doc.text(
    `• Saldo conciliado en Bolívares: Bs. ${wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}   ·   Cartera en Divisas: $${wallet.totalUsdPurchased.toFixed(2)} USD`,
    marginX + 4,
    cursorY + 20
  );

  cursorY += 28;

  // Cuadro de Firmas Institucionales y Auditoría
  checkPageBreak(38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 25, 23);
  doc.text('CERTIFICACIÓN Y FIRMAS DE AUTORIZACIÓN ARQUIDIOCESANA:', marginX, cursorY);
  cursorY += 4.5;

  const signW = (contentWidth - 6) / 3;
  const signH = 26;

  // Firma 1: Producción y Cobranzas
  let sx = marginX;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(sx, cursorY, signW, signH, 2, 2, 'FD');
  doc.setDrawColor(168, 162, 158);
  doc.line(sx + 5, cursorY + 16, sx + signW - 5, cursorY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(28, 25, 23);
  doc.text('COORDINACIÓN DE COBRANZAS', sx + signW / 2, cursorY + 19.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Producción y Logística Caracas', sx + signW / 2, cursorY + 23, { align: 'center' });

  // Firma 2: Tesorería y Finanzas
  sx += signW + 3;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(sx, cursorY, signW, signH, 2, 2, 'FD');
  doc.line(sx + 5, cursorY + 16, sx + signW - 5, cursorY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(28, 25, 23);
  doc.text('TESORERÍA Y ADMINISTRACIÓN', sx + signW / 2, cursorY + 19.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Custodia de Fondos y Divisas', sx + signW / 2, cursorY + 23, { align: 'center' });

  // Firma 3: Secretariado Pastoral Familiar
  sx += signW + 3;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(sx, cursorY, signW, signH, 2, 2, 'FD');
  doc.line(sx + 5, cursorY + 16, sx + signW - 5, cursorY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text('SECRETARIADO PASTORAL FAMILIAR', sx + signW / 2, cursorY + 19.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Arquidiócesis de Maracaibo', sx + signW / 2, cursorY + 23, { align: 'center' });

  // =========================================================================
  // NUMERACIÓN DE PÁGINAS & FOOTER EN TODAS LAS HOJAS
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Barra inferior de cierre
    doc.setFillColor(146, 64, 14);
    doc.rect(0, pageHeight - 3.8, pageWidth, 3.8, 'F');

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `Campaña Abrazo en Familia 2026 · Secretariado de Pastoral Familiar (Maracaibo) · Corte: ${formattedDate} ${formattedTime}`,
      marginX,
      pageHeight - 5.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text(`Página ${i} de ${totalPages} · Reporte Oficial Integral CRM`, pageWidth - marginX, pageHeight - 5.5, {
      align: 'right'
    });
  }

  return doc;
}

/**
 * Descarga el PDF unificado de manera 100% confiable y resiliente
 */
export function downloadUnifiedPdfBlob(doc: jsPDF, filename: string): boolean {
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
  } catch (blobErr) {
    console.warn('Fallback doc.save() ejecutado:', blobErr);
    try {
      doc.save(filename);
      return true;
    } catch (saveErr) {
      console.error('Error al guardar PDF:', saveErr);
      return false;
    }
  }
}
