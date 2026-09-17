import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Definición simple de reservación en memoria
interface StoredReservation {
  id: string;
  code: string;
  createdAt: string;
  fullName: string;
  idNumber: string;
  phone: string;
  email: string;
  institutionType?: 'parroquia' | 'colegio';
  schoolName?: string;
  parish: string;
  customParish?: string;
  role: string;
  deliveryMethod: string;
  notes?: string;
  items: Array<{ itemId: string; quantity: number }>;
  totalEUR?: number;
  totalUSD?: number;
  totalVES?: number;
  exchangeRate?: number;
  status: 'pendiente_pago' | 'verificado' | 'en_proceso_caracas' | 'listo_entrega';
  syncedToGoogleSheets?: boolean;
  emailSent?: boolean;
}

// Semilla inicial de reservaciones reales de Maracaibo para mostrar en el panel
const reservationsStore: StoredReservation[] = [
  {
    id: 'res-init-1',
    code: 'AEF26-MCBO-4910',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    fullName: 'Pbro. Alexander Díaz',
    idNumber: 'V-14.289.412',
    phone: '0414-6321190',
    email: 'parroquia.coromoto.mcbo@gmail.com',
    parish: 'Parroquia Nuestra Señora de Coromoto (Los Olivos)',
    role: 'Párroco / Vicario Parroquial',
    deliveryMethod: 'retiro_sede',
    notes: 'Lote prioritario para inicio de catequesis en octubre.',
    items: [{ itemId: 'kit-completo-2026', quantity: 20 }],
    totalUSD: 70.0,
    totalVES: 3115.0,
    exchangeRate: 44.5,
    status: 'verificado',
    syncedToGoogleSheets: true,
    emailSent: true
  },
  {
    id: 'res-init-2',
    code: 'AEF26-MCBO-4892',
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    fullName: 'Carlos Villalobos',
    idNumber: 'V-16.782.903',
    phone: '0424-6554321',
    email: 'cvillalobos.sanonofre@gmail.com',
    parish: 'Parroquia San Onofre (Av. Delicias / Tierra Negra)',
    role: 'Coordinador(a) Parroquial de Pastoral Familiar',
    deliveryMethod: 'retiro_sede',
    notes: 'Incluir hojas para niños de primaria.',
    items: [
      { itemId: 'kit-completo-2026', quantity: 15 },
      { itemId: 'hoja-nino-2026', quantity: 50 }
    ],
    totalUSD: 77.5,
    totalVES: 3448.75,
    exchangeRate: 44.5,
    status: 'pendiente_pago',
    syncedToGoogleSheets: true,
    emailSent: true
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Listar todas las reservaciones
  app.get('/api/reservations', (req, res) => {
    res.json({
      success: true,
      reservations: reservationsStore
    });
  });

  // API: Guardar nueva reservación
  app.post('/api/reservations', async (req, res) => {
    try {
      const { reservation, googleSheetsWebhookUrl } = req.body;
      if (!reservation) {
        return res.status(400).json({ error: 'Datos de reservación requeridos' });
      }

      const newReservation: StoredReservation = {
        ...reservation,
        syncedToGoogleSheets: false,
        emailSent: true
      };

      // Si se configuró un webhook de Google Sheets, enviar
      const DEFAULT_SHEETS_URL =
        'https://script.google.com/macros/s/AKfycbzknrMLSmdcZe2HUQIQ6nAJXzw_TA_QSiKj-Hgb-s0YvvBHbronT25t_TzDqcoZ5rOoCw/exec';

      const targetWebhook =
        googleSheetsWebhookUrl ||
        process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
        process.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL ||
        DEFAULT_SHEETS_URL;
      if (targetWebhook && typeof targetWebhook === 'string' && targetWebhook.startsWith('http')) {
        try {
          // Extraer cantidades por material para el CRM
          const itemsList = Array.isArray(newReservation.items) ? newReservation.items : [];
          const kitQty = itemsList.find((i: any) => i.itemId === 'kit-completo-2026')?.quantity || 0;
          const aficheQty = itemsList.find((i: any) => i.itemId === 'afiche-oficial-2026')?.quantity || 0;
          const guiaQty = itemsList.find((i: any) => i.itemId === 'guia-facilitador-2026')?.quantity || 0;
          const hojaQty = itemsList.find((i: any) => i.itemId === 'hoja-nino-2026')?.quantity || 0;
          const totalPiezas = kitQty + aficheQty + guiaQty + hojaQty;

          const now = new Date(newReservation.createdAt || Date.now());
          const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          const crmPayload = {
            timestamp: dateFormatted,
            code: newReservation.code,
            institutionType: newReservation.institutionType === 'colegio' ? 'Colegio' : 'Parroquia',
            institutionName: newReservation.parish,
            contactName: newReservation.fullName,
            phone: newReservation.phone,
            email: newReservation.email,
            kitQuantity: kitQty,
            aficheQuantity: aficheQty,
            guiaQuantity: guiaQty,
            hojaQuantity: hojaQty,
            totalQuantity: totalPiezas,
            totalEUR: Number(newReservation.totalEUR || 0),
            status: 'Nueva Reserva',
            paymentStatus: 'Pendiente',
            paymentMethod: '',
            paymentRef: '',
            deliveryStatus: 'Por Imprimir / En Caracas',
            deliveryDate: '',
            notes: newReservation.notes || '',
            reservation: newReservation
          };

          const sheetRes = await fetch(targetWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(crmPayload),
            redirect: 'follow'
          });

          if (sheetRes.ok) {
            newReservation.syncedToGoogleSheets = true;
          }
        } catch (webhookErr) {
          console.error('Error enviando al Webhook de Google Sheets CRM:', webhookErr);
        }
      }

      reservationsStore.unshift(newReservation);

      // Simulación de despacho de correo con instrucciones de Pago Móvil
      console.log(`[CORREO PAGO MÓVIL ENVIADO] A: ${newReservation.email} | Código: ${newReservation.code} | Monto: ${newReservation.totalVES} Bs`);

      res.status(201).json({
        success: true,
        reservation: newReservation
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error interno del servidor' });
    }
  });

  // API: Actualizar estado de una reservación
  app.patch('/api/reservations/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const item = reservationsStore.find((r) => r.id === id || r.code === id);
    if (!item) {
      return res.status(404).json({ error: 'Reservación no encontrada' });
    }

    item.status = status;
    res.json({ success: true, reservation: item });
  });

  // API: Test Google Sheets Webhook
  app.post('/api/test-webhook', async (req, res) => {
    const { webhookUrl, sample } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return res.status(400).json({ error: 'URL de Webhook inválida' });
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test_connection',
          timestamp: new Date().toISOString(),
          reservation: sample
        })
      });

      res.json({ success: response.ok, statusText: response.statusText });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware para dev / estáticos para prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Abrazo en Familia 2026 corriendo en http://localhost:${PORT}`);
  });
}

startServer();
