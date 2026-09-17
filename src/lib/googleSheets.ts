import { CrmReservation } from '../types/reservation';
import { getSheetsWebhookUrl } from '../utils/sheetsSync';

export const getGasEndpoint = (): string => {
  return getSheetsWebhookUrl();
};

/**
 * Obtiene todas las reservas directamente de Google Sheets (vía doGet de Apps Script)
 */
export async function fetchCrmReservations(): Promise<{ success: boolean; data: CrmReservation[]; message?: string; fromCache?: boolean }> {
  const endpoint = getGasEndpoint();

  if (!endpoint || !endpoint.startsWith('http')) {
    const cached = getLocalCrmCache();
    return {
      success: true,
      data: cached,
      fromCache: true,
      message: 'Mostrando datos almacenados en caché local (URL de Google Sheets no configurada).'
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const result = await response.json();

    if (result && Array.isArray(result.data)) {
      const formatted: CrmReservation[] = result.data.map((row: any) => ({
        id: row.code || String(row.id || Math.random()),
        timestamp: row.timestamp || '',
        code: row.code || '',
        institutionType: row.institutionType === 'Colegio' ? 'Colegio' : 'Parroquia',
        institutionName: row.institutionName || '',
        contactName: row.contactName || '',
        phone: String(row.phone || '').replace(/^'/, ''),
        email: row.email || '',
        kitQuantity: Number(row.kitQuantity || 0),
        aficheQuantity: Number(row.aficheQuantity || 0),
        guiaQuantity: Number(row.guiaQuantity || 0),
        hojaQuantity: Number(row.hojaQuantity || 0),
        totalQuantity: Number(row.totalQuantity || 0),
        totalEUR: Number(row.totalEUR || 0),
        status: (row.status || 'Nueva Reserva') as any,
        paymentStatus: (row.paymentStatus || 'Pendiente') as any,
        paymentMethod: row.paymentMethod || '',
        paymentRef: row.paymentRef || '',
        deliveryStatus: (row.deliveryStatus || 'Por Imprimir / En Caracas') as any,
        deliveryDate: row.deliveryDate || '',
        notes: row.notes || ''
      }));

      // Guardar en caché local para acceso offline instantáneo
      saveLocalCrmCache(formatted);

      return {
        success: true,
        data: formatted
      };
    }

    throw new Error('Respuesta de Google Sheets en formato inesperado');
  } catch (error: any) {
    console.warn('Error al consultar Google Sheets en vivo:', error);
    const cached = getLocalCrmCache();
    return {
      success: false,
      data: cached,
      fromCache: true,
      message: 'No se pudo conectar en vivo con Google Sheets. Mostrando datos locales en caché.'
    };
  }
}

/**
 * Crea una nueva reserva en Google Sheets (action: 'CREATE')
 */
export async function createCrmReservation(reservation: CrmReservation): Promise<{ success: boolean; message?: string }> {
  const endpoint = getGasEndpoint();
  const payload = {
    action: 'CREATE',
    ...reservation
  };

  // Actualizar caché local de inmediato
  const current = getLocalCrmCache();
  saveLocalCrmCache([reservation, ...current.filter((c) => c.code !== reservation.code)]);

  if (!endpoint) return { success: true, message: 'Guardado localmente' };

  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Actualiza una reserva existente en Google Sheets (action: 'UPDATE')
 */
export async function updateCrmReservation(code: string, updates: Partial<CrmReservation>): Promise<{ success: boolean; message?: string }> {
  const endpoint = getGasEndpoint();
  const payload = {
    action: 'UPDATE',
    code,
    ...updates
  };

  // Actualizar caché local
  const current = getLocalCrmCache();
  const updated = current.map((item) => (item.code === code ? { ...item, ...updates } : item));
  saveLocalCrmCache(updated);

  if (!endpoint) return { success: true, message: 'Actualizado localmente' };

  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.toString() };
  }
}

/**
 * Elimina una reserva de Google Sheets (action: 'DELETE')
 */
export async function deleteCrmReservation(code: string): Promise<{ success: boolean; message?: string }> {
  const endpoint = getGasEndpoint();
  const payload = {
    action: 'DELETE',
    code
  };

  // Actualizar caché local
  const current = getLocalCrmCache();
  const filtered = current.filter((item) => item.code !== code);
  saveLocalCrmCache(filtered);

  if (!endpoint) return { success: true, message: 'Eliminado localmente' };

  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.toString() };
  }
}

export function getLocalCrmCache(): CrmReservation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('aef_crm_cache');
    if (raw) return JSON.parse(raw);

    // Si no hay caché de CRM, transformar los almacenados en aef_reservations_mcbo
    const oldRaw = localStorage.getItem('aef_reservations_mcbo');
    if (oldRaw) {
      const oldList = JSON.parse(oldRaw);
      return oldList.map((r: any) => ({
        id: r.code || String(Math.random()),
        timestamp: new Date(r.createdAt || Date.now()).toLocaleString('es-VE'),
        code: r.code || '',
        institutionType: r.institutionType === 'colegio' ? 'Colegio' : 'Parroquia',
        institutionName: r.parish || '',
        contactName: r.fullName || '',
        phone: r.phone || '',
        email: r.email || '',
        kitQuantity: r.items?.find((i: any) => i.itemId === 'kit-completo-2026')?.quantity || 0,
        aficheQuantity: r.items?.find((i: any) => i.itemId === 'afiche-oficial-2026')?.quantity || 0,
        guiaQuantity: r.items?.find((i: any) => i.itemId === 'guia-facilitador-2026')?.quantity || 0,
        hojaQuantity: r.items?.find((i: any) => i.itemId === 'hoja-nino-2026')?.quantity || 0,
        totalQuantity: (r.items || []).reduce((acc: number, cur: any) => acc + (cur.quantity || 0), 0),
        totalEUR: Number(r.totalEUR || 0),
        status: 'Nueva Reserva',
        paymentStatus: 'Pendiente',
        paymentMethod: '',
        paymentRef: '',
        deliveryStatus: 'Por Imprimir / En Caracas',
        deliveryDate: '',
        notes: r.notes || ''
      }));
    }
  } catch {}
  return [];
}

export function saveLocalCrmCache(data: CrmReservation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('aef_crm_cache', JSON.stringify(data));
  } catch {}
}

import { AuthSession, CrmUser } from '../types/auth';

const CRM_SESSION_STORAGE_KEY = 'aef_crm_session';

export function getCrmSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CRM_SESSION_STORAGE_KEY) || sessionStorage.getItem(CRM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearCrmSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setCrmSession(user: CrmUser, remember: boolean = true): AuthSession {
  const session: AuthSession = {
    user,
    token: `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    loginTime: new Date().toISOString(),
    expiresAt: Date.now() + (remember ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 8) // 7 días o 8 horas
  };

  try {
    const serialized = JSON.stringify(session);
    if (remember) {
      localStorage.setItem(CRM_SESSION_STORAGE_KEY, serialized);
    } else {
      sessionStorage.setItem(CRM_SESSION_STORAGE_KEY, serialized);
    }
  } catch {}

  return session;
}

export function clearCrmSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CRM_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(CRM_SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * Autentica al usuario contra Google Apps Script (Hoja 'Usuarios CRM')
 * con soporte para verificación en contingencia.
 */
export async function authenticateCrmUser(
  emailOrUser: string,
  password: string
): Promise<{ success: boolean; user?: CrmUser; message?: string }> {
  const cleanInput = emailOrUser.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Usuarios autorizados por defecto del Equipo de Pastoral Familiar
  const defaultAuthorizedUsers = [
    {
      name: 'Secretariado de Pastoral Familiar Maracaibo',
      emailOrUser: 'lapastoralfamiliar.mcbo@gmail.com',
      password: 'pastoral2026',
      role: 'Administrador' as const,
      status: 'Activo' as const
    },
    {
      name: 'Equipo Arquidiocesano de Pastoral',
      emailOrUser: 'pastoral.maracaibo',
      password: 'familia2026',
      role: 'Equipo Pastoral' as const,
      status: 'Activo' as const
    },
    {
      name: 'Coordinador General CRM',
      emailOrUser: 'admin',
      password: 'admin2026',
      role: 'Administrador' as const,
      status: 'Activo' as const
    }
  ];

  const defaultMatch = defaultAuthorizedUsers.find(
    (u) => u.emailOrUser.toLowerCase() === cleanInput && u.password === cleanPass
  );

  const endpoint = getGasEndpoint();

  // Si hay endpoint de Google Apps Script, intentar validar en línea
  if (endpoint && endpoint.startsWith('http')) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'LOGIN',
          emailOrUser: cleanInput,
          password: cleanPass
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.user) {
          const crmUser: CrmUser = {
            id: result.user.emailOrUser || cleanInput,
            name: result.user.name || 'Miembro Pastoral',
            emailOrUser: result.user.emailOrUser || cleanInput,
            role: result.user.role || 'Equipo Pastoral',
            status: result.user.status || 'Activo'
          };
          return { success: true, user: crmUser };
        } else if (result.status === 'unauthorized' || result.status === 'forbidden') {
          // Si el servidor GAS rechazó explícitamente, pero coincide con las credenciales por defecto, permitimos acceso
          if (defaultMatch) {
            return {
              success: true,
              user: {
                id: defaultMatch.emailOrUser,
                name: defaultMatch.name,
                emailOrUser: defaultMatch.emailOrUser,
                role: defaultMatch.role,
                status: defaultMatch.status
              }
            };
          }
          return { success: false, message: result.message || 'Credenciales incorrectas.' };
        }
      }
    } catch {
      // Fallback a validación local si la red falla o está en modo no-cors
    }
  }

  // Verificación con usuarios autorizados
  if (defaultMatch) {
    return {
      success: true,
      user: {
        id: defaultMatch.emailOrUser,
        name: defaultMatch.name,
        emailOrUser: defaultMatch.emailOrUser,
        role: defaultMatch.role,
        status: defaultMatch.status
      }
    };
  }

  return {
    success: false,
    message: 'Usuario o contraseña incorrectos. Verifique sus datos de acceso.'
  };
}

