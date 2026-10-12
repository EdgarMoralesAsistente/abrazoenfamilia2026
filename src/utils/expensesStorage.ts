import { CrmExpense, ExpensesSummary } from '../types/reservation';
import {
  createExpenseInSheets,
  updateExpenseInSheets,
  deleteExpenseInSheets,
  fetchExpensesFromSheets
} from '../lib/googleSheets';

const STORAGE_KEY = 'aef_crm_expenses';

/**
 * Obtiene todas las salidas y gastos almacenados en localStorage.
 */
export function getStoredExpenses(): CrmExpense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error al leer gastos de localStorage:', err);
  }
  return [];
}

/**
 * Guarda la lista de salidas y gastos en localStorage
 */
export function saveStoredExpenses(expenses: CrmExpense[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.warn('Error al guardar gastos en localStorage:', err);
  }
}

/**
 * Sincroniza las salidas y gastos desde Google Sheets
 */
export async function syncExpensesWithSheets(): Promise<{
  success: boolean;
  data: CrmExpense[];
  message?: string;
}> {
  try {
    const res = await fetchExpensesFromSheets();
    if (res.success && Array.isArray(res.data)) {
      saveStoredExpenses(res.data);
      return { success: true, data: res.data };
    }
  } catch (err: any) {
    console.warn('No se pudo sincronizar gastos con Google Sheets:', err);
  }
  const local = getStoredExpenses();
  return { success: false, data: local, message: 'Usando datos locales' };
}

/**
 * Registra un nuevo gasto / salida tanto en local como en Google Sheets
 */
export async function recordNewExpense(
  data: Omit<CrmExpense, 'id' | 'timestamp'>
): Promise<{ success: boolean; expense: CrmExpense; message?: string }> {
  const current = getStoredExpenses();
  const nextNum = current.length + 1;
  const id = `EXP-${String(nextNum).padStart(3, '0')}`;

  const now = new Date();
  const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newExpense: CrmExpense = {
    id,
    timestamp,
    date: data.date || now.toISOString().slice(0, 10),
    concept: data.concept || 'Gasto Operativo',
    category: data.category || 'Operativo / Imprenta',
    amountVES: Number(data.amountVES || 0),
    amountUSD: data.amountUSD !== undefined ? Number(data.amountUSD) : undefined,
    currency: data.currency || 'VES',
    paymentMethod: data.paymentMethod || 'Pago Móvil / Banco',
    beneficiary: data.beneficiary || '',
    reference: data.reference || `REF-${Date.now().toString().slice(-6)}`,
    operator: data.operator || 'Equipo Pastoral',
    notes: data.notes || ''
  };

  const updated = [newExpense, ...current];
  saveStoredExpenses(updated);

  // Sincronizar en Google Sheets (hoja 'Salidas y Gastos')
  createExpenseInSheets(newExpense).catch((err) =>
    console.warn('Error enviando gasto a Google Sheets:', err)
  );

  return {
    success: true,
    expense: newExpense,
    message: `¡Salida de ${newExpense.currency === 'USD' ? `$${(newExpense.amountUSD || 0).toFixed(2)} USD` : `Bs. ${newExpense.amountVES.toLocaleString('es-VE')}`} registrada con éxito!`
  };
}

/**
 * Actualiza una salida existente
 */
export async function updateStoredExpense(
  expense: CrmExpense
): Promise<{ success: boolean; expense: CrmExpense; message?: string }> {
  const current = getStoredExpenses();
  const updated = current.map((e) => (e.id === expense.id ? expense : e));
  saveStoredExpenses(updated);

  updateExpenseInSheets(expense).catch((err) =>
    console.warn('Error actualizando gasto en Google Sheets:', err)
  );

  return {
    success: true,
    expense,
    message: `¡Salida ${expense.id} actualizada correctamente!`
  };
}

/**
 * Elimina una salida
 */
export function removeStoredExpense(id: string, operator: string = 'Administrador'): CrmExpense[] {
  const current = getStoredExpenses();
  const filtered = current.filter((e) => e.id !== id);
  saveStoredExpenses(filtered);

  deleteExpenseInSheets(id, operator).catch((err) =>
    console.warn('Error eliminando gasto en Google Sheets:', err)
  );

  return filtered;
}

/**
 * Calcula el resumen de salidas
 */
export function calculateExpensesSummary(expenses: CrmExpense[]): ExpensesSummary {
  let totalVES = 0;
  let totalUSD = 0;

  expenses.forEach((e) => {
    totalVES += Number(e.amountVES || 0);
    if (e.amountUSD) {
      totalUSD += Number(e.amountUSD);
    }
  });

  return {
    totalExpensesVES: totalVES,
    totalExpensesUSD: totalUSD,
    expenseCount: expenses.length
  };
}
