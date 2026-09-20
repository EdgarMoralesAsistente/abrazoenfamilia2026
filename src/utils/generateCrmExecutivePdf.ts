import { jsPDF } from 'jspdf';
import { CrmReservation, CrmKPIs } from '../types/reservation';
import { CrmUser } from '../types/auth';

export const OFFICIAL_PASTORAL_LOGO_URL =
  'https://res.cloudinary.com/djvpapwvq/image/upload/v1789603448/Logo_del_Secretariado_de_Pastoral_Familiar_Sin_fondo_nffmht.png';
const LOCAL_PASTORAL_LOGO_URL = '/logo_pastoral_familiar.png';

let cachedLogoDataUrl: string | null = null;

/**
 * Obtiene el logo oficial de la Pastoral Familiar en formato Base64 Data URL
 * para que jsPDF lo dibuje con máxima fidelidad sin bordes ni pérdida de calidad.
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
      // Intentar con el siguiente candidato
    }
  }

  // Fallback con elemento Image y Canvas
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
 * Genera un reporte ejecutivo en PDF de EXACTAMENTE 1 PÁGINA (A4 Vertical)
 * con diseño vectorial de alta resolución, tipografía clara, tarjetas KPI,
 * gráficos de barras con cantidades visibles y alertas estratégicas.
 */
export async function generateCrmExecutivePdf(
  kpis: CrmKPIs,
  reservations: CrmReservation[],
  currentUser?: CrmUser
): Promise<jsPDF> {
  // Crear documento A4 vertical: 210 x 297 mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Cargar logo oficial
  let logoDataUrl = '';
  try {
    logoDataUrl = await getPastoralLogoDataUrl();
  } catch (e) {
    console.warn('No se pudo cargar el logo oficial para el PDF:', e);
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = now.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Métricas calculadas
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

  // Institución con mayor volumen
  const instMap: Record<string, { name: string; type: string; piezas: number; monto: number }> = {};
  reservations.forEach((r) => {
    const key = r.institutionName.trim();
    if (key) {
      if (!instMap[key]) {
        instMap[key] = { name: key, type: r.institutionType, piezas: 0, monto: 0 };
      }
      instMap[key].piezas += Number(r.totalQuantity || 0);
      instMap[key].monto += Number(r.totalEUR || 0);
    }
  });
  const topInstitutions = Object.values(instMap).sort((a, b) => b.piezas - a.piezas);
  const topInst = topInstitutions[0] || null;

  // =========================================================================
  // 1. BARRA SUPERIOR DE MARCA (AMBER 800)
  // =========================================================================
  doc.setFillColor(146, 64, 14); // #92400e
  doc.rect(0, 0, 210, 4.5, 'F');

  // =========================================================================
  // 2. ENCABEZADO INSTITUCIONAL (Y: 8 - 32)
  // =========================================================================
  // Logo Oficial del Secretariado de Pastoral Familiar (Sin fondo)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 13.5, 7, 15.5, 17.5, undefined, 'FAST');
    } catch (e) {
      console.warn('Error agregando logo al PDF:', e);
    }
  }

  // Textos de Cabecera
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('ARQUIDIÓCESIS DE MARACAIBO · SECRETARIADO DE PASTORAL FAMILIAR', 32, 12);

  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23); // Stone 900
  doc.text('Campaña Abrazo en Familia 2026', 32, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(87, 83, 78); // Stone 600
  doc.text('Reporte Ejecutivo de Gestión, Producción & Cobranzas CRM', 32, 23);

  // Cuadro de fecha y metadatos a la derecha
  doc.setFillColor(245, 245, 244); // Stone 100
  doc.setDrawColor(231, 229, 228); // Stone 200
  doc.roundedRect(138, 8, 58, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(28, 25, 23);
  doc.text(`Fecha: ${formattedDate}`, 141, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`Hora de corte: ${formattedTime}`, 141, 17.5);
  doc.text(`Emitido: ${currentUser ? currentUser.name : 'Secretariado Arquidiocesano'}`, 141, 21.5);

  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.setFont('helvetica', 'bold');
  doc.text('• Sincronizado en tiempo real con Google Sheets', 141, 25);

  // Línea divisoria suave
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, 29, 196, 29);

  // =========================================================================
  // 3. SECCIÓN: 5 TARJETAS DE KPIS CON BARRAS DE PROGRESO (Y: 33 - 63)
  // =========================================================================
  const cardY = 32;
  const cardW = 34.4;
  const cardH = 30;
  const cardGap = 2.5;

  // --- TARJETA 1: TOTAL RESERVAS ---
  const x1 = 14;
  doc.setFillColor(250, 250, 249);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(x1, cardY, cardW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL RESERVAS', x1 + 3, cardY + 5.5);

  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.totalReservas}`, x1 + 3, cardY + 13);

  // Badge %
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(x1 + cardW - 17, cardY + 8, 14, 5, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`${pctReservasPagadas}% pag.`, x1 + cardW - 16, cardY + 11.5);

  // Barra de progreso
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(x1 + 3, cardY + 17, cardW - 6, 2.5, 1, 1, 'F');
  doc.setFillColor(5, 150, 105); // Emerald 600
  const wBar1 = ((cardW - 6) * Math.min(pctReservasPagadas, 100)) / 100;
  if (wBar1 > 0) doc.roundedRect(x1 + 3, cardY + 17, wBar1, 2.5, 1, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.reservasPagadas} pagadas · ${kpis.reservasPendientesPago} pend.`, x1 + 3, cardY + 24);
  doc.text('Solicitudes totales registradas', x1 + 3, cardY + 27.5);

  // --- TARJETA 2: MONTO TOTAL (€) ---
  const x2 = x1 + cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(x2, cardY, cardW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('MONTO TOTAL (€)', x2 + 3, cardY + 5.5);

  doc.setFontSize(14.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.totalMontoEUR.toFixed(2)} €`, x2 + 3, cardY + 13);

  // Badge %
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(x2 + cardW - 17, cardY + 8, 14, 5, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`${pctMontoRecaudado}%`, x2 + cardW - 14, cardY + 11.5);

  // Barra de progreso
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(x2 + 3, cardY + 17, cardW - 6, 2.5, 1, 1, 'F');
  doc.setFillColor(5, 150, 105);
  const wBar2 = ((cardW - 6) * Math.min(pctMontoRecaudadoNum, 100)) / 100;
  if (wBar2 > 0) doc.roundedRect(x2 + 3, cardY + 17, wBar2, 2.5, 1, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(4, 120, 87);
  doc.text(`${kpis.totalMontoRecaudadoEUR.toFixed(2)} € cobrado`, x2 + 3, cardY + 24);
  doc.setTextColor(180, 83, 9);
  doc.text(`Por cobrar: ${kpis.montoPendientePagoEUR.toFixed(2)} €`, x2 + 3, cardY + 27.5);

  // --- TARJETA 3: TOTAL PIEZAS ---
  const x3 = x2 + cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(x3, cardY, cardW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('TOTAL PIEZAS', x3 + 3, cardY + 5.5);

  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.totalPiezas}`, x3 + 3, cardY + 13);

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(x3 + cardW - 17, cardY + 8, 14, 5, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(146, 64, 14);
  doc.text(`${kpis.totalKits} kits`, x3 + cardW - 14, cardY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.totalAfiches} afiches oficiales`, x3 + 3, cardY + 20);
  doc.text(`${kpis.totalGuias} guías del facilitador`, x3 + 3, cardY + 24);
  doc.text(`${kpis.totalHojas} hojas del niño`, x3 + 3, cardY + 27.5);

  // --- TARJETA 4: POR COBRAR ---
  const x4 = x3 + cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(x4, cardY, cardW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('POR COBRAR', x4 + 3, cardY + 5.5);

  doc.setFontSize(14.5);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(`${kpis.montoPendientePagoEUR.toFixed(2)} €`, x4 + 3, cardY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.reservasPendientesPago} reservas pendientes`, x4 + 3, cardY + 20);

  if (kpis.reservasVerificando > 0) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(x4 + 3, cardY + 22.5, cardW - 6, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(29, 78, 216);
    doc.text(`${kpis.reservasVerificando} por conciliar banco`, x4 + 5, cardY + 26);
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text('Pagos al día en verificación', x4 + 3, cardY + 26);
  }

  // --- TARJETA 5: LOGÍSTICA / DESPACHO ---
  const x5 = x4 + cardW + cardGap;
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(x5, cardY, cardW, cardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('DESPACHO', x5 + 3, cardY + 5.5);

  doc.setFontSize(16);
  doc.setTextColor(28, 25, 23);
  doc.text(`${pctEntregas}%`, x5 + 3, cardY + 13);

  doc.setFillColor(245, 245, 244);
  doc.roundedRect(x5 + cardW - 17, cardY + 8, 14, 5, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.entregasCompletadas} entr.`, x5 + cardW - 15, cardY + 11.5);

  // Barra de despacho
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(x5 + 3, cardY + 17, cardW - 6, 2.5, 1, 1, 'F');
  doc.setFillColor(68, 64, 60);
  const wBar5 = ((cardW - 6) * Math.min(pctEntregas, 100)) / 100;
  if (wBar5 > 0) doc.roundedRect(x5 + 3, cardY + 17, wBar5, 2.5, 1, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(87, 83, 78);
  doc.text(`${kpis.entregasCompletadas} en destino final`, x5 + 3, cardY + 24);
  doc.text(`${kpis.entregasPendientes} en Caracas o ruta`, x5 + 3, cardY + 27.5);

  // =========================================================================
  // 4. SECCIÓN CENTRAL: MATERIALES SOLICITADOS (CARACAS) & COMPARATIVA PARROQUIAS/COLEGIOS (Y: 66 - 158)
  // =========================================================================
  const sec2Y = 65;

  // -------------------------------------------------------------------------
  // 4A. BLOQUE IZQUIERDO: MATERIALES SOLICITADOS PARA CARACAS (IMPRENTA)
  // -------------------------------------------------------------------------
  const matW = 106;
  const matH = 92;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, sec2Y, matW, matH, 3, 3, 'FD');

  // Cabecera del bloque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('MATERIALES SOLICITADOS PARA CARACAS (IMPRENTA)', 19, sec2Y + 7);

  // Badge Total piezas
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(14 + matW - 38, sec2Y + 3, 33, 5.5, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14);
  doc.text(`Total: ${kpis.totalPiezas} piezas`, 14 + matW - 35, sec2Y + 6.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Cantidades requeridas para orden nacional de producción con cantidad visible en cada barra:', 19, sec2Y + 12);

  // Barras de Materiales
  const materialsList = [
    { label: 'Kits Completos', count: kpis.totalKits, color: [146, 64, 14] as [number, number, number], note: 'Contiene Afiche + Guía + Hojas' },
    { label: 'Afiches Oficiales', count: kpis.totalAfiches, color: [217, 119, 6] as [number, number, number], note: 'Promocionales para carteleras y templos' },
    { label: 'Guías del Facilitador', count: kpis.totalGuias, color: [2, 132, 199] as [number, number, number], note: 'Material doctrinal para orientadores' },
    { label: 'Hojas del Niño', count: kpis.totalHojas, color: [22, 163, 74] as [number, number, number], note: 'Dinámicas para catequesis y aulas' }
  ];

  const maxMat = Math.max(...materialsList.map((m) => m.count), 1);
  let barY = sec2Y + 17;

  materialsList.forEach((mat) => {
    // Fila de texto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(mat.label, 19, barY + 3.5);

    // Cantidad explícita destacada
    doc.setFontSize(10);
    doc.setTextColor(mat.color[0], mat.color[1], mat.color[2]);
    doc.text(`${mat.count} unidades`, 19 + matW - 32, barY + 3.5);

    // Barra de progreso fondo
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(19, barY + 5.5, matW - 10, 5, 1.5, 1.5, 'F');

    // Barra relleno con proporción
    const pct = Math.max((mat.count / maxMat), 0.08);
    const fillWidth = (matW - 10) * pct;
    doc.setFillColor(mat.color[0], mat.color[1], mat.color[2]);
    doc.roundedRect(19, barY + 5.5, fillWidth, 5, 1.5, 1.5, 'F');

    // Etiqueta de cantidad sobre la barra
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${mat.count}`, 22, barY + 9.2);

    // Subnota
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text(mat.note, 19, barY + 14);

    barY += 16;
  });

  // Mini resumen en 4 columnas
  const miniY = sec2Y + matH - 12;
  const miniW = (matW - 12) / 4;
  const miniLabels = [
    { title: 'KITS', val: `${kpis.totalKits}`, bg: [254, 243, 199] as [number, number, number], c: [146, 64, 14] as [number, number, number] },
    { title: 'AFICHES', val: `${kpis.totalAfiches}`, bg: [250, 250, 249] as [number, number, number], c: [68, 64, 60] as [number, number, number] },
    { title: 'GUÍAS', val: `${kpis.totalGuias}`, bg: [240, 249, 255] as [number, number, number], c: [2, 132, 199] as [number, number, number] },
    { title: 'HOJAS', val: `${kpis.totalHojas}`, bg: [240, 253, 244] as [number, number, number], c: [22, 163, 74] as [number, number, number] }
  ];

  miniLabels.forEach((ml, idx) => {
    const mx = 19 + idx * miniW;
    doc.setFillColor(ml.bg[0], ml.bg[1], ml.bg[2]);
    doc.roundedRect(mx, miniY, miniW - 2, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 113, 108);
    doc.text(ml.title, mx + 2, miniY + 3.5);
    doc.setFontSize(8.5);
    doc.setTextColor(ml.c[0], ml.c[1], ml.c[2]);
    doc.text(ml.val, mx + 2, miniY + 7.5);
  });

  // -------------------------------------------------------------------------
  // 4B. BLOQUE DERECHO: COMPARATIVA PARROQUIAS VS COLEGIOS
  // -------------------------------------------------------------------------
  const compX = 124;
  const compW = 72;
  const compH = 92;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(compX, sec2Y, compW, compH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 25, 23);
  doc.text('COMPARATIVA INSTITUCIONAL', compX + 5, sec2Y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Parroquias vs Colegios de la Arquidiócesis:', compX + 5, sec2Y + 12);

  // Tarjetas lado a lado Parroquias vs Colegios
  const sideW = (compW - 13) / 2;
  const sideH = 40;
  const sideY = sec2Y + 15;

  // Parroquia
  doc.setFillColor(254, 243, 199); // Amber 50
  doc.setDrawColor(251, 191, 36); // Amber 400
  doc.roundedRect(compX + 5, sideY, sideW, sideH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text(`PARROQUIAS (${pctParroquias}%)`, compX + 7, sideY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`• Reservas: ${kpis.totalParroquias}`, compX + 7, sideY + 12);
  doc.text(`• Piezas: ${kpis.piezasParroquias}`, compX + 7, sideY + 18);
  doc.text(`• Kits: ${kpis.totalKits}`, compX + 7, sideY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14);
  doc.text(`Aporte: ${kpis.montoParroquiasEUR.toFixed(2)} €`, compX + 7, sideY + 34);

  // Colegios
  const colX = compX + 5 + sideW + 3;
  doc.setFillColor(240, 249, 255); // Sky 50
  doc.setDrawColor(56, 189, 248); // Sky 400
  doc.roundedRect(colX, sideY, sideW, sideH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(2, 132, 199);
  doc.text(`COLEGIOS (${pctColegios}%)`, colX + 2, sideY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text(`• Reservas: ${kpis.totalColegios}`, colX + 2, sideY + 12);
  doc.text(`• Piezas: ${kpis.piezasColegios}`, colX + 2, sideY + 18);
  doc.text(`• Kits: ${kpis.totalColegios}`, colX + 2, sideY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(`Aporte: ${kpis.montoColegiosEUR.toFixed(2)} €`, colX + 2, sideY + 34);

  // Barra de Distribución Porcentual
  const distY = sideY + sideH + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(87, 83, 78);
  doc.text('Distribución de Demanda:', compX + 5, distY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pctParroquias}% Parroquias  ·  ${pctColegios}% Colegios`, compX + 5, distY + 4.5);

  // Barra bicolor
  const barDistW = compW - 10;
  doc.setFillColor(146, 64, 14); // Parroquias
  const wPar = (barDistW * pctParroquias) / 100;
  if (wPar > 0) doc.roundedRect(compX + 5, distY + 6.5, wPar, 4, 1, 1, 'F');

  doc.setFillColor(2, 132, 199); // Colegios
  const wCol = barDistW - wPar;
  if (wCol > 0) doc.roundedRect(compX + 5 + wPar, distY + 6.5, wCol, 4, 1, 1, 'F');

  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`Total registrado: ${totalInst} instituciones arquidiocesanas`, compX + 5, distY + 17);

  // =========================================================================
  // 5. SECCIÓN INFERIOR: FINANZAS, LOGÍSTICA & TOMA DE DECISIONES (Y: 161 - 263)
  // =========================================================================
  const sec3Y = 161;
  const col3W = 58;
  const col3H = 96;

  // -------------------------------------------------------------------------
  // 5A. COLUMNA 1: ESTADO DE COBRANZAS Y RECAUDACIÓN
  // -------------------------------------------------------------------------
  const col1X = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col1X, sec3Y, col3W, col3H, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text('ESTADO DE COBRANZAS', col1X + 4, sec3Y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text('Control de ingresos y pagos:', col1X + 4, sec3Y + 11.5);

  // Bloque Pagados
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(col1X + 4, sec3Y + 15, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('PAGADOS (100% Confirmado)', col1X + 6, sec3Y + 20);
  doc.setFontSize(11);
  doc.text(`${kpis.totalMontoRecaudadoEUR.toFixed(2)} €`, col1X + 6, sec3Y + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`${kpis.reservasPagadas} reservaciones conciliadas`, col1X + 6, sec3Y + 30);

  // Bloque Pendientes
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(col1X + 4, sec3Y + 35, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('PENDIENTES DE COBRO', col1X + 6, sec3Y + 40);
  doc.setFontSize(11);
  doc.text(`${kpis.montoPendientePagoEUR.toFixed(2)} €`, col1X + 6, sec3Y + 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`${kpis.reservasPendientesPago} reservas por liquidar`, col1X + 6, sec3Y + 50);

  // Bloque Verificando
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(col1X + 4, sec3Y + 55, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(29, 78, 216);
  doc.text('EN VERIFICACIÓN BANCARIA', col1X + 6, sec3Y + 60);
  doc.setFontSize(9.5);
  doc.text(`${kpis.reservasVerificando} pagos con referencia`, col1X + 6, sec3Y + 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Requieren confirmación de banco', col1X + 6, sec3Y + 70);

  // Resumen en caja
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(col1X + 4, sec3Y + 75, col3W - 8, 15, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(87, 83, 78);
  doc.text('TOTAL GENERAL EN CAJA:', col1X + 6, sec3Y + 80);
  doc.setFontSize(12);
  doc.setTextColor(4, 120, 87);
  doc.text(`${kpis.totalMontoRecaudadoEUR.toFixed(2)} €`, col1X + 6, sec3Y + 87);

  // -------------------------------------------------------------------------
  // 5B. COLUMNA 2: CADENA LOGÍSTICA Y DESPACHO
  // -------------------------------------------------------------------------
  const col2X = col1X + col3W + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col2X, sec3Y, col3W, col3H, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 25, 23);
  doc.text('CADENA DE DESPACHO', col2X + 4, sec3Y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text('Flujo Caracas ➔ Maracaibo ➔ Parroquia:', col2X + 4, sec3Y + 11.5);

  // Estado 1: Caracas
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(col2X + 4, sec3Y + 15, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 64, 60);
  doc.text('1. POR IMPRIMIR / EN CARACAS', col2X + 6, sec3Y + 20);
  doc.setFontSize(11);
  doc.setTextColor(28, 25, 23);
  doc.text(`${kpis.entregasPendientes} pedidos`, col2X + 6, sec3Y + 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Material en preparación nacional', col2X + 6, sec3Y + 30);

  // Estado 2: En tránsito
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(col2X + 4, sec3Y + 35, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text('2. EN RUTA O CENTRO DE ACOPIO', col2X + 6, sec3Y + 40);
  doc.setFontSize(11);
  doc.text('Sede Maracaibo', col2X + 6, sec3Y + 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Recepción y embalaje por zona', col2X + 6, sec3Y + 50);

  // Estado 3: Entregados
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(col2X + 4, sec3Y + 55, col3W - 8, 17, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('3. ENTREGADOS EN DESTINO', col2X + 6, sec3Y + 60);
  doc.setFontSize(11);
  doc.text(`${kpis.entregasCompletadas} pedidos (${pctEntregas}%)`, col2X + 6, sec3Y + 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Recibidos por la comunidad', col2X + 6, sec3Y + 70);

  // Efectividad
  doc.setFillColor(250, 250, 249);
  doc.roundedRect(col2X + 4, sec3Y + 75, col3W - 8, 15, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(87, 83, 78);
  doc.text('EFECTIVIDAD DE ENTREGA:', col2X + 6, sec3Y + 80);
  doc.setFontSize(12);
  doc.setTextColor(28, 25, 23);
  doc.text(`${pctEntregas}% completado`, col2X + 6, sec3Y + 87);

  // -------------------------------------------------------------------------
  // 5C. COLUMNA 3: ALERTAS PARA TOMA DE DECISIONES
  // -------------------------------------------------------------------------
  const col3X = col2X + col3W + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(col3X, sec3Y, col3W, col3H, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text('TOMA DE DECISIONES', col3X + 4, sec3Y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 113, 108);
  doc.text('Alertas estratégicas recomendadas:', col3X + 4, sec3Y + 11.5);

  // Alerta 1: Despacho prioritario
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(col3X + 4, sec3Y + 15, col3W - 8, 21, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('• PRIORIDAD DE DESPACHO', col3X + 6, sec3Y + 20);
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text(`${pedidosPagadosSinEntregar} pedidos listos`, col3X + 6, sec3Y + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Tienen pago verificado al 100% y esperan por entrega inmediata.', col3X + 6, sec3Y + 29.5, { maxWidth: col3W - 12 });

  // Alerta 2: Cobranza
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(col3X + 4, sec3Y + 39, col3W - 8, 21, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('• PRIORIDAD DE COBRANZA', col3X + 6, sec3Y + 44);
  doc.setFontSize(8.5);
  doc.setTextColor(120, 53, 15);
  doc.text(`${kpis.montoPendientePagoEUR.toFixed(2)} € por recaudar`, col3X + 6, sec3Y + 49);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`${kpis.reservasPendientesPago} instituciones con saldo pendiente. Recordar comprobante.`, col3X + 6, sec3Y + 53.5, { maxWidth: col3W - 12 });

  // Alerta 3: Top Demanda
  doc.setFillColor(245, 245, 244);
  doc.setDrawColor(231, 229, 228);
  doc.roundedRect(col3X + 4, sec3Y + 63, col3W - 8, 27, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(68, 64, 60);
  doc.text('• INSTITUCIÓN DE MAYOR DEMANDA', col3X + 6, sec3Y + 68);

  if (topInst) {
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    const instTitle = topInst.name.length > 24 ? topInst.name.substring(0, 24) + '...' : topInst.name;
    doc.text(instTitle, col3X + 6, sec3Y + 73.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Solicitó ${topInst.piezas} piezas (${topInst.type}).`, col3X + 6, sec3Y + 78);
    doc.text('Priorizar embalaje y logística anticipada.', col3X + 6, sec3Y + 82);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Sin registros suficientes para ranking.', col3X + 6, sec3Y + 75);
  }

  // =========================================================================
  // 6. PIE DE PÁGINA INSTITUCIONAL (Y: 265 - 297)
  // =========================================================================
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, 268, 196, 268);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(28, 25, 23);
  doc.text('Secretariado Arquidiocesano de Pastoral Familiar · Arquidiócesis de Maracaibo', 14, 273);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text('Documento ejecutivo oficial generado desde el CRM Pastoral para el análisis y toma de decisiones.', 14, 277);
  doc.text('Reservados todos los derechos · Campaña Arquidiocesana del Abrazo en Familia 2026', 14, 281);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text('PÁGINA 1 DE 1', 196, 273, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 113, 108);
  doc.text('ID: AEF-2026-REP-EXECUTIVE', 196, 277, { align: 'right' });

  // Barra inferior decorativa
  doc.setFillColor(146, 64, 14);
  doc.rect(0, 293, 210, 4, 'F');

  return doc;
}

/**
 * Descarga el documento PDF de manera 100% segura y resiliente en cualquier navegador,
 * incluso dentro de iframes restringidos.
 */
export function downloadExecutivePdfBlob(doc: jsPDF, filename: string): boolean {
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
    console.warn('Falla en descarga por Blob URL, intentando método estándar doc.save()', blobErr);
    try {
      doc.save(filename);
      return true;
    } catch (saveErr) {
      console.error('Error crítico al guardar PDF:', saveErr);
      return false;
    }
  }
}
