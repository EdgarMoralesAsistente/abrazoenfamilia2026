import { jsPDF } from 'jspdf';
import {
  CrmReservation,
  CrmKPIs,
  CrmExpense,
  DollarPurchase
} from '../types/reservation';
import { CrmUser } from '../types/auth';
import {
  generateUnifiedCrmPdf,
  downloadUnifiedPdfBlob,
  formatDateDMY,
  UnifiedReportData
} from './generateUnifiedCrmReportPdf';

export interface FinancialReportData {
  reservations: CrmReservation[];
  kpis: CrmKPIs;
  expenses: CrmExpense[];
  dollarPurchases: DollarPurchase[];
  currentUser?: CrmUser;
}

/**
 * Genera el Reporte de Finanzas unificado e integrado con el Reporte Ejecutivo.
 * Ambos reportes ahora son el mismo documento integral.
 */
export async function generateFinancialReportPdf(data: FinancialReportData): Promise<jsPDF> {
  const unifiedData: UnifiedReportData = {
    reservations: data.reservations,
    kpis: data.kpis,
    expenses: data.expenses,
    dollarPurchases: data.dollarPurchases,
    currentUser: data.currentUser
  };
  return generateUnifiedCrmPdf(unifiedData);
}

/**
 * Descarga el PDF unificado de finanzas y gestión de manera confiable
 */
export function downloadFinancialReportPdfBlob(doc: jsPDF, filename?: string): boolean {
  const fileDate = new Date().toISOString().slice(0, 10);
  const targetFilename = filename || `Reporte_Ejecutivo_Gestion_Finanzas_AEF_2026_${fileDate}.pdf`;
  return downloadUnifiedPdfBlob(doc, targetFilename);
}

export { formatDateDMY };
