import { jsPDF } from 'jspdf';
import { CrmReservation, CrmKPIs, CrmExpense, DollarPurchase } from '../types/reservation';
import { CrmUser } from '../types/auth';
import {
  generateUnifiedCrmPdf,
  downloadUnifiedPdfBlob,
  getPastoralLogoDataUrl as getLogoUnified,
  OFFICIAL_PASTORAL_LOGO_URL as LOGO_URL_UNIFIED,
  formatDateDMY
} from './generateUnifiedCrmReportPdf';

export const OFFICIAL_PASTORAL_LOGO_URL = LOGO_URL_UNIFIED;
export const getPastoralLogoDataUrl = getLogoUnified;

/**
 * Genera el Reporte Ejecutivo y Financiero Integral Unificado.
 * Ahora incluye de manera 100% cohesionada:
 * - Resumen Ejecutivo de Gestión, Producción & Metas de Imprenta
 * - Disponibilidad de Tesorería, Flujo de Caja & Cartera de Dólares
 * - Análisis Comparativo de Entradas vs Salidas
 * - Historial Completo de Salidas (Compra de Dólares y Otras Salidas)
 * - Historial Completo de Entradas (Agrupadas por Parroquias y Colegios)
 * - Conciliación Final, Balance de Disponibilidad y Firmas
 */
export async function generateCrmExecutivePdf(
  kpis: CrmKPIs,
  reservations: CrmReservation[],
  currentUser?: CrmUser,
  expenses?: CrmExpense[],
  dollarPurchases?: DollarPurchase[]
): Promise<jsPDF> {
  return generateUnifiedCrmPdf({
    reservations,
    kpis,
    expenses,
    dollarPurchases,
    currentUser
  });
}

/**
 * Descarga el documento PDF de manera 100% segura y resiliente
 */
export function downloadExecutivePdfBlob(doc: jsPDF, filename?: string): boolean {
  const fileDate = new Date().toISOString().slice(0, 10);
  const targetFilename = filename || `Reporte_Ejecutivo_Gestion_Finanzas_AEF_2026_${fileDate}.pdf`;
  return downloadUnifiedPdfBlob(doc, targetFilename);
}

export { formatDateDMY };
