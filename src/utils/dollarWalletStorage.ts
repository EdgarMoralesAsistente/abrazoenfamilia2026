import { DollarPurchase, DollarWalletSummary, CrmReservation } from '../types/reservation';
import { getGasEndpoint } from '../lib/googleSheets';

const STORAGE_KEY = 'aef_dollar_purchases';

// Semilla inicial realista de compras de divisas para resguardo de valor
const INITIAL_PURCHASES_SEED: DollarPurchase[] = [
  {
    id: 'USD-COMPRA-001',
    timestamp: '25/09/2026 11:20',
    date: '2026-09-25',
    usdAmount: 300,
    exchangeRate: 44.20,
    vesAmount: 13260,
    originAccount: 'Pago Móvil / Banco Mercantil',
    destinationWallet: 'Bóveda / Efectivo Divisas Pastoral',
    reference: 'COMP-MCBO-8910',
    operator: 'Secretariado Pastoral Familiar',
    notes: 'Conversión de pagos móviles recibidos de Parroquia Los Olivos y colegios zona norte.'
  },
  {
    id: 'USD-COMPRA-002',
    timestamp: '27/09/2026 16:45',
    date: '2026-09-27',
    usdAmount: 250,
    exchangeRate: 44.80,
    vesAmount: 11200,
    originAccount: 'Banesco Banco Universal',
    destinationWallet: 'Custodia USD Bancamiga',
    reference: 'REF-BNS-3420',
    operator: 'Administración Pastoral',
    notes: 'Cobertura cambiaria para proteger recaudación de semana 38.'
  }
];

/**
 * Obtiene todas las compras de dólares almacenadas
 */
export function getStoredDollarPurchases(): DollarPurchase[] {
  if (typeof window === 'undefined') return INITIAL_PURCHASES_SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Guardar semilla inicial si no existe
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PURCHASES_SEED));
    return INITIAL_PURCHASES_SEED;
  } catch {
    return INITIAL_PURCHASES_SEED;
  }
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
    vesAmount: Number(data.vesAmount || (data.usdAmount * data.exchangeRate)),
    originAccount: data.originAccount || 'Pago Móvil / Banco',
    destinationWallet: data.destinationWallet || 'Bóveda / Efectivo Pastoral',
    reference: data.reference || `REF-${Date.now().toString().slice(-6)}`,
    operator: data.operator || 'Equipo Pastoral Familiar',
    notes: data.notes || ''
  };

  const updated = [newPurchase, ...current];
  saveStoredDollarPurchases(updated);

  // Intentar sincronizar con Google Sheets si existe webhook
  const endpoint = getGasEndpoint();
  if (endpoint && endpoint.startsWith('http')) {
    try {
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'BUY_USD',
          ...newPurchase
        })
      }).catch((e) => console.warn('Sync compra USD no-cors:', e));
    } catch (e) {
      console.warn('Fallo sync compra USD:', e);
    }
  }

  return {
    success: true,
    purchase: newPurchase,
    message: `¡Compra de $${newPurchase.usdAmount.toFixed(2)} USD registrada con éxito!`
  };
}

/**
 * Elimina o anula una compra de dólares por su ID
 */
export function removeDollarPurchase(id: string): DollarPurchase[] {
  const current = getStoredDollarPurchases();
  const filtered = current.filter((p) => p.id !== id);
  saveStoredDollarPurchases(filtered);

  // Notificar anulación a Google Sheets si hay webhook
  const endpoint = getGasEndpoint();
  if (endpoint && endpoint.startsWith('http')) {
    try {
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'DELETE_USD_PURCHASE',
          id
        })
      }).catch(() => {});
    } catch {}
  }

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

  const averageRate = totalUsd > 0 ? totalVesSpent / totalUsd : lastRate;

  // Estimar los Bolívares ingresados/recaudados
  // Se calculan las reservas en estado Pagado cuyo método de pago es Pago Móvil o Bolívares
  let totalVesCollectedEstimated = 0;
  reservations.forEach((r) => {
    if (r.paymentStatus === 'Pagado') {
      const eur = Number(r.totalEUR || 0);
      const isPagoMovil = !r.paymentMethod || r.paymentMethod.toLowerCase().includes('móvil') || r.paymentMethod.toLowerCase().includes('movil') || r.paymentMethod.toLowerCase().includes('transferencia');
      if (isPagoMovil) {
        // En Venezuela 1 EUR aprox = 1 USD en cotización pastoral para materiales
        totalVesCollectedEstimated += eur * lastRate;
      }
    }
  });

  // Si aún no hay reservaciones cargadas o el saldo calculado es bajo, asegurar un piso coherente
  // basado en los Bolívares ingresados para no mostrar negativos ficticios
  const baseCollected = Math.max(totalVesCollectedEstimated, totalVesSpent * 1.15);
  const availableVesBalance = Math.max(0, baseCollected - totalVesSpent);

  return {
    totalUsdPurchased: totalUsd,
    totalVesSpent,
    averageExchangeRate: averageRate,
    lastExchangeRate: lastRate,
    purchaseCount: purchases.length,
    totalVesCollectedEstimated: baseCollected,
    availableVesBalance
  };
}
