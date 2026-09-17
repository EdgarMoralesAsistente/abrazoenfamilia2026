// Serverless function for Vercel deployment
// Handles /api/reservations and proxies directly to Google Apps Script CRM

export default async function handler(req: any, res: any) {
  // Configurar encabezados CORS para permitir llamadas seguras
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      hasWebhookConfigured: Boolean(
        process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL
      )
    });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { reservation, googleSheetsWebhookUrl } = body;

      const DEFAULT_SHEETS_URL =
        'https://script.google.com/macros/s/AKfycbzknrMLSmdcZe2HUQIQ6nAJXzw_TA_QSiKj-Hgb-s0YvvBHbronT25t_TzDqcoZ5rOoCw/exec';

      const targetWebhook =
        process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
        process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
        googleSheetsWebhookUrl ||
        DEFAULT_SHEETS_URL;

      if (!reservation) {
        res.status(400).json({ error: 'Faltan datos de la reserva' });
        return;
      }

      if (!targetWebhook || !targetWebhook.startsWith('http')) {
        console.warn('No hay webhook de Google Sheets configurado en el servidor');
        res.status(200).json({
          status: 'warning',
          message: 'Reserva procesada localmente pero no hay webhook de Google Sheets configurado',
          code: reservation.code
        });
        return;
      }

      // Preparar payload para CRM en Google Sheets
      const itemsList = Array.isArray(reservation.items) ? reservation.items : [];
      const kitQty = itemsList.find((i: any) => i.itemId === 'kit-completo-2026')?.quantity || 0;
      const aficheQty = itemsList.find((i: any) => i.itemId === 'afiche-oficial-2026')?.quantity || 0;
      const guiaQty = itemsList.find((i: any) => i.itemId === 'guia-facilitador-2026')?.quantity || 0;
      const hojaQty = itemsList.find((i: any) => i.itemId === 'hoja-nino-2026')?.quantity || 0;
      const totalPiezas = kitQty + aficheQty + guiaQty + hojaQty;

      const now = new Date(reservation.createdAt || Date.now());
      const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const crmPayload = {
        timestamp: dateFormatted,
        code: reservation.code || '',
        institutionType: reservation.institutionType === 'colegio' ? 'Colegio' : 'Parroquia',
        institutionName: reservation.parish || '',
        contactName: reservation.fullName || '',
        phone: reservation.phone || '',
        email: reservation.email || '',
        kitQuantity: kitQty,
        aficheQuantity: aficheQty,
        guiaQuantity: guiaQty,
        hojaQuantity: hojaQty,
        totalQuantity: totalPiezas,
        totalEUR: Number(reservation.totalEUR || 0),
        status: 'Nueva Reserva',
        paymentStatus: 'Pendiente',
        paymentMethod: '',
        paymentRef: '',
        deliveryStatus: 'Por Imprimir / En Caracas',
        deliveryDate: '',
        notes: reservation.notes || ''
      };

      const sheetRes = await fetch(targetWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crmPayload),
        redirect: 'follow'
      });

      const responseText = await sheetRes.text();
      console.log('Respuesta de Google Apps Script:', responseText);

      res.status(200).json({
        status: 'success',
        synced: true,
        code: reservation.code
      });
    } catch (err: any) {
      console.error('Error enviando a Google Sheets en Vercel:', err);
      res.status(500).json({ error: err.message || 'Error al conectar con Google Sheets' });
    }
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
