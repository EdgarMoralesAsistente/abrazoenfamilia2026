import { StoredReservation } from '../types';

export const DEFAULT_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbzknrMLSmdcZe2HUQIQ6nAJXzw_TA_QSiKj-Hgb-s0YvvBHbronT25t_TzDqcoZ5rOoCw/exec';

export const getSheetsWebhookUrl = (): string => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('sheets_url') || params.get('webhook');
    if (queryUrl && queryUrl.startsWith('http')) {
      localStorage.setItem('aef_sheets_webhook_url', queryUrl);
      return queryUrl;
    }
    const local = localStorage.getItem('aef_sheets_webhook_url');
    if (local && local.startsWith('http')) {
      return local;
    }
  }

  return (
    (import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL as string) ||
    (process.env.GOOGLE_SHEETS_WEBHOOK_URL as string) ||
    DEFAULT_SHEETS_WEBHOOK_URL
  );
};

export const setSheetsWebhookUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    if (url && url.trim().startsWith('http')) {
      localStorage.setItem('aef_sheets_webhook_url', url.trim());
    } else {
      localStorage.removeItem('aef_sheets_webhook_url');
    }
  }
};

export const formatCrmPayload = (res: StoredReservation) => {
  const itemsList = Array.isArray(res.items) ? res.items : [];
  const kitQty = itemsList.find((i: any) => i.itemId === 'kit-completo-2026')?.quantity || 0;
  const aficheQty = itemsList.find((i: any) => i.itemId === 'afiche-oficial-2026')?.quantity || 0;
  const guiaQty = itemsList.find((i: any) => i.itemId === 'guia-facilitador-2026')?.quantity || 0;
  const hojaQty = itemsList.find((i: any) => i.itemId === 'hoja-nino-2026')?.quantity || 0;
  const totalPiezas = kitQty + aficheQty + guiaQty + hojaQty;

  const now = new Date(res.createdAt || Date.now());
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    timestamp: dateFormatted,
    code: res.code || '',
    institutionType: res.institutionType === 'colegio' ? 'Colegio' : 'Parroquia',
    institutionName: res.parish || '',
    contactName: res.fullName || '',
    phone: res.phone || '',
    email: res.email || '',
    kitQuantity: kitQty,
    aficheQuantity: aficheQty,
    guiaQuantity: guiaQty,
    hojaQuantity: hojaQty,
    totalQuantity: totalPiezas,
    totalEUR: Number(res.totalEUR || 0),
    status: 'Nueva Reserva',
    paymentStatus: 'Pendiente',
    paymentMethod: '',
    paymentRef: '',
    deliveryStatus: 'Por Imprimir / En Caracas',
    deliveryDate: '',
    notes: res.notes || ''
  };
};

const syncedCodes = new Set<string>();

export const isReservationSynced = (code: string): boolean => {
  if (!code) return false;
  if (syncedCodes.has(code)) return true;
  try {
    const raw = sessionStorage.getItem('aef_synced_codes') || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.includes(code);
  } catch {
    return false;
  }
};

export const markReservationSynced = (code: string) => {
  if (!code) return;
  syncedCodes.add(code);
  try {
    const raw = sessionStorage.getItem('aef_synced_codes') || '[]';
    const parsed = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    if (!parsed.includes(code)) {
      parsed.push(code);
      sessionStorage.setItem('aef_synced_codes', JSON.stringify(parsed));
    }
  } catch {}
};

export const syncReservationToSheets = async (res: StoredReservation): Promise<boolean> => {
  if (!res || !res.code) return false;

  // Evitar envíos duplicados si este código de reserva ya fue enviado
  if (isReservationSynced(res.code)) {
    console.log(`Reserva ${res.code} ya fue sincronizada previamente.`);
    return true;
  }

  const webhookUrl = getSheetsWebhookUrl();
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.warn('Google Sheets Webhook URL no configurada.');
    return false;
  }

  // Marcar de inmediato como sincronizada para evitar peticiones concurrentes
  markReservationSynced(res.code);

  const payload = formatCrmPayload(res);
  const jsonString = JSON.stringify(payload);

  // Realizar un único envío directo y confiable hacia Google Apps Script
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: jsonString
    });
    return true;
  } catch (err) {
    console.warn('Error en envío directo, intentando vía backend:', err);
    try {
      await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservation: res,
          googleSheetsWebhookUrl: webhookUrl
        })
      });
      return true;
    } catch (backendErr) {
      console.warn('Fallo total de envío:', backendErr);
      return false;
    }
  }
};
