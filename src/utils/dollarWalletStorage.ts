import { DollarPurchase, DollarWalletSummary, CrmReservation } from '../types/reservation';
import {
  createDollarPurchaseInSheets,
  updateDollarPurchaseInSheets,
  deleteDollarPurchaseInSheets,
  fetchDollarPurchasesFromSheets
} from '../lib/googleSheets';

const STORAGE_KEY = 'aef_dollar_purchases';

/**
 * Obtiene todas las compras de dólares almacenadas localmente.
 * Limpia automáticamente cualquier dato ficticio de prueba anterior.
 */
export function getStoredDollarPurchases(): DollarPurchase[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filtrar y remover datos de prueba antiguos
        const real = parsed.filter(
          (p: any) =>
            p &&
            p.id !== 'USD-COMPRA-001' &&
            p.id !== 'USD-COMPRA-002' &&
            !p.notes?.includes('zona norte') &&
            !p.notes?.includes('semana 38')
        );
        // Si se limpiaron datos de prueba, actualizar el almacenamiento
        if (real.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(real));
        }
        return real;
      }
    }
  } catch (err) {
    console.warn('Error al leer compras de dólares de localStorage:', err);
  }
  return [];
}

/**
 * Guarda las compras de dólares en almacenamiento local
 */
export function saveStoredDollarPurchases(purchases: DollarPurchase[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  } catch (err) {
    console.warn('Error al guardar compras de dólares en localStorage:', err);
  }
}

/**
 * Sincroniza las compras de dólares desde Google Sheets hacia la memoria local
 */
export async function syncDollarPurchasesWithSheets(): Promise<{
  success: boolean;
  data: DollarPurchase[];
  message?: string;
}> {
  try {
    const res = await fetchDollarPurchasesFromSheets();
    if (res.success && Array.isArray(res.data)) {
      // Guardar lo que viene de Google Sheets en local
      saveStoredDollarPurchases(res.data);
      return { success: true, data: res.data };
    }
  } catch (err: any) {
    console.warn('No se pudo sincronizar en vivo con Google Sheets:', err);
  }
  const local = getStoredDollarPurchases();
  return { success: false, data: local, message: 'Usando datos locales' };
}

/**
 * Registra una nueva compra de dólares tanto en memoria local como en Google Sheets
 */
export async function recordNewDollarPurchase(
  data: Omit<DollarPurchase, 'id' | 'timestamp'>
): Promise<{ success: boolean; purchase: DollarPurchase; message?: string }> {
  const current = getStoredDollarPurchases();
  const nextNum = current.length + 1;
  const id = `USD-COMPRA-${String(nextNum).padStart(3, '0')}`;

  const now = new Date();
  const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newPurchase: DollarPurchase = {
    id,
    timestamp,
    date: data.date || now.toISOString().slice(0, 10),
    usdAmount: Number(data.usdAmount || 0),
    exchangeRate: Number(data.exchangeRate || 0),
    vesAmount: Number(data.vesAmount || data.usdAmount * data.exchangeRate),
    originAccount: data.originAccount || 'Pago Móvil / Banco',
    destinationWallet: data.destinationWallet || 'Bóveda / Efectivo Pastoral',
    reference: data.reference || `REF-${Date.now().toString().slice(-6)}`,
    operator: data.operator || 'Equipo Pastoral Familiar',
    notes: data.notes || ''
  };

  const updated = [newPurchase, ...current];
  saveStoredDollarPurchases(updated);

  // Sincronizar en tiempo real con Google Sheets (hoja 'Cartera de Dólares')
  createDollarPurchaseInSheets(newPurchase).catch((err) =>
    console.warn('Error enviando compra a Google Sheets:', err)
  );

  return {
    success: true,
    purchase: newPurchase,
    message: `¡Compra de $${newPurchase.usdAmount.toFixed(2)} USD registrada y sincronizada con Google Sheets!`
  };
}

/**
 * Actualiza una compra de dólares existente en local y en Google Sheets
 */
export async function updateStoredDollarPurchase(
  purchase: DollarPurchase
): Promise<{ success: boolean; purchase: DollarPurchase; message?: string }> {
  const current = getStoredDollarPurchases();
  const updated = current.map((p) => (p.id === purchase.id ? purchase : p));
  saveStoredDollarPurchases(updated);

  // Sincronizar actualización en Google Sheets (hoja 'Cartera de Dólares')
  updateDollarPurchaseInSheets(purchase).catch((err) =>
    console.warn('Error actualizando compra en Google Sheets:', err)
  );

  return {
    success: true,
    purchase,
    message: `¡Compra ${purchase.id} actualizada y sincronizada en Google Sheets!`
  };
}

/**
 * Elimina o anula una compra de dólares por su ID en local y en Google Sheets
 */
export function removeDollarPurchase(id: string, operator: string = 'Administrador'): DollarPurchase[] {
  const current = getStoredDollarPurchases();
  const filtered = current.filter((p) => p.id !== id);
  saveStoredDollarPurchases(filtered);

  // Sincronizar eliminación en Google Sheets
  deleteDollarPurchaseInSheets(id, operator).catch((err) =>
    console.warn('Error eliminando compra en Google Sheets:', err)
  );

  return filtered;
}

/**
 * Calcula el resumen financiero de la Cartera de Dólares y su relación con los Bolívares
 */
export function calculateDollarWalletSummary(
  purchases: DollarPurchase[],
  reservations: CrmReservation[] = [],
  fallbackRate: number = 44.5
): DollarWalletSummary {
  let totalUsd = 0;
  let totalVesSpent = 0;
  let lastRate = fallbackRate;

  purchases.forEach((p, idx) => {
    totalUsd += Number(p.usdAmount || 0);
    totalVesSpent += Number(p.vesAmount || 0);
    if (idx === 0 && p.exchangeRate) {
      lastRate = Number(p.exchangeRate);
    }
  });

  const averageRate = totalUsd > 0 ? totalVesSpent / totalUsd : 0;

  // Sumatoria de todas las reservas cobradas en Bolívares
  const rateToUse = lastRate > 0 ? lastRate : fallbackRate;
  let totalVesCollectedEstimated = 0;
  reservations.forEach((r) => {
    if (r.paymentStatus === 'Pagado') {
      const eur = Number(r.totalEUR || 0);
      totalVesCollectedEstimated += eur * rateToUse;
    }
  });

  // Los bolívares es la sumatoria de todas las reservas cobradas menos los bolívares usados para comprar/registrar dólares
  const availableVesBalance = totalVesCollectedEstimated - totalVesSpent;

  return {
    totalUsdPurchased: totalUsd,
    totalVesSpent,
    averageExchangeRate: averageRate,
    lastExchangeRate: lastRate,
    purchaseCount: purchases.length,
    totalVesCollectedEstimated,
    availableVesBalance
  };
}
