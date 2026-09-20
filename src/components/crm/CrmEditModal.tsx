import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  RefreshCw,
  MessageSquare,
  Send,
  Copy,
  Check,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Euro,
  User,
  Phone,
  Mail,
  FileText,
  Church,
  School,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { CrmReservation, ReservationStatus, PaymentStatus, DeliveryStatus } from '../../types/reservation';

interface CrmEditModalProps {
  isOpen: boolean;
  reservation: CrmReservation | null;
  onClose: () => void;
  onSave: (code: string, updates: Partial<CrmReservation>) => Promise<void>;
}

type ActiveTab = 'gestion' | 'materiales' | 'whatsapp';

interface WhatsAppTemplate {
  id: string;
  title: string;
  category: string;
  tag: string;
  tagColor: string;
  icon: string;
  generateText: (res: CrmReservation) => string;
}

// Formateador telefónico internacional para WhatsApp (+58 para Venezuela)
const formatWhatsAppPhone = (rawPhone: string): string => {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '58' + digits.substring(1);
  } else if (!digits.startsWith('58')) {
    return '58' + digits;
  }
  return digits;
};

export const CrmEditModal: React.FC<CrmEditModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('gestion');
  const [status, setStatus] = useState<ReservationStatus>('Nueva Reserva');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pendiente');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('Por Imprimir / En Caracas');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Estados para WhatsApp
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('confirmacion');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Definición de las plantillas predeterminadas de WhatsApp con tono cercano y fraterno
  const templates: WhatsAppTemplate[] = [
    {
      id: 'confirmacion',
      title: 'Confirmación y Bienvenida',
      category: 'Recepción',
      tag: 'Nueva Reserva',
      tagColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '👋',
      generateText: (res) => {
        const itemLines: string[] = [];
        if (res.kitQuantity > 0) itemLines.push(`• *${res.kitQuantity}x* Kits Impresos Completos (7,00 € c/u)`);
        if (res.aficheQuantity > 0) itemLines.push(`• *${res.aficheQuantity}x* Afiches Oficiales 2026 (3,00 € c/u)`);
        if (res.guiaQuantity > 0) itemLines.push(`• *${res.guiaQuantity}x* Guías del Facilitador (4,00 € c/u)`);
        if (res.hojaQuantity > 0) itemLines.push(`• *${res.hojaQuantity}x* Hojas del Niño (1,00 € c/u)`);
        const itemsSummary = itemLines.length > 0 ? itemLines.join('\n') : `• *${res.totalQuantity}* piezas variadas`;

        return [
          `¡Paz y Bien, *${res.contactName}*! Te saludamos con mucha alegría desde el *Secretariado de Pastoral Familiar de la Arquidiócesis de Maracaibo*.`,
          ``,
          `Recibimos con éxito tu solicitud de reserva para *${res.institutionName}* (${res.institutionType}) en el marco de la *Campaña Abrazo en Familia 2026*.`,
          ``,
          `📄 *Código de Reserva:* \`${res.code}\``,
          `📦 *Materiales Solicitados:*`,
          itemsSummary,
          `📊 *Total de Piezas:* ${res.totalQuantity} unidades`,
          `💰 *Monto Total:* *${Number(res.totalEUR).toFixed(2)} €*`,
          ``,
          `📌 *Próximo Paso:* Para asegurar el lote de impresión de tu comunidad, por favor envíanos el comprobante de tu aporte por este mismo chat.`,
          ``,
          `¡Que el Señor bendiga abundantemente a tu familia y comunidad!`
        ].join('\n');
      }
    },
    {
      id: 'recordatorio_pago',
      title: 'Recordatorio de Pago & Cuentas',
      category: 'Cobranza',
      tag: 'Pendiente',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-200',
      icon: '💳',
      generateText: (res) => [
        `¡Paz y Bien, *${res.contactName}*! Te escribimos desde el *Secretariado de Pastoral Familiar de la Arquidiócesis de Maracaibo* para acompañarte con tu reserva *${res.code}* de *${res.institutionName}*.`,
        ``,
        `Te recordamos con cariño que tu solicitud se encuentra en estatus *PENDIENTE DE PAGO* por un total de *${Number(res.totalEUR).toFixed(2)} €* (${res.totalQuantity} piezas solicitadas).`,
        ``,
        `🏦 *DATOS OFICIALES PARA PAGO MÓVIL:*`,
        `• *Banco:* Banco Nacional de Crédito - BNC`,
        `• *Teléfono:* 04246379307`,
        `• *Cédula:* 13495695`,
        `• *Concepto:* \`${res.code} - ${res.institutionName}\``,
        ``,
        `Al realizar tu Pago Móvil, compártenos por favor la captura o número de referencia por este chat para conciliar tu pedido y garantizar tus materiales. ¡Muchísimas gracias por tu compromiso!`
      ].join('\n')
    },
    {
      id: 'verificando',
      title: 'Comprobante en Verificación',
      category: 'Conciliación',
      tag: 'En Verificación',
      tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '🔍',
      generateText: (res) => [
        `¡Paz y Bien, *${res.contactName}*! Te escribimos desde el *Secretariado de Pastoral Familiar*.`,
        ``,
        `Confirmamos la recepción de tu comprobante de pago para la reserva *${res.code}* de *${res.institutionName}*. ¡Muchas gracias!`,
        ``,
        `🔍 *Estado actual:* Nuestro equipo de administración se encuentra verificando la acreditación bancaria correspondiente a los *${Number(res.totalEUR).toFixed(2)} €*.`,
        ``,
        `Una vez conciliado el abono en cuenta, te notificaremos de inmediato con la confirmación definitiva de tu lote. ¡Cualquier duda, estamos a tu total orden!`
      ].join('\n')
    },
    {
      id: 'pago_confirmado',
      title: 'Pago Confirmado al 100%',
      category: 'Aprobación',
      tag: 'Pagado',
      tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: '✅',
      generateText: (res) => [
        `¡Paz y Bien, *${res.contactName}*! Te escribimos con gran alegría desde el *Secretariado de Pastoral Familiar*.`,
        ``,
        `Te informamos que el pago de tu reserva *${res.code}* ha sido *CONFIRMADO Y CONCILIADO AL 100%*.`,
        ``,
        `✅ *Institución:* ${res.institutionName}`,
        `✅ *Monto Acreditado:* *${Number(res.totalEUR).toFixed(2)} €*`,
        `✅ *Piezas Garantizadas:* ${res.totalQuantity} unidades`,
        `✅ *Estado en Sistema:* PAGADO / EN PRODUCCIÓN`,
        ``,
        `Tu pedido queda formalmente asegurado dentro del contingente de impresión para la Arquidiócesis de Maracaibo. Te mantendremos oportunamente informado sobre los tiempos de arribo y entrega.`,
        ``,
        `¡Que Dios bendiga y multiplique los frutos del Abrazo en Familia 2026 en tu comunidad!`
      ].join('\n')
    },
    {
      id: 'retiro_listo',
      title: 'Material Listo para Retiro',
      category: 'Despacho',
      tag: 'Disponible',
      tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: '📦',
      generateText: (res) => {
        const itemLines: string[] = [];
        if (res.kitQuantity > 0) itemLines.push(`• *${res.kitQuantity}x* Kits Completos`);
        if (res.aficheQuantity > 0) itemLines.push(`• *${res.aficheQuantity}x* Afiches Oficiales 2026`);
        if (res.guiaQuantity > 0) itemLines.push(`• *${res.guiaQuantity}x* Guías del Facilitador`);
        if (res.hojaQuantity > 0) itemLines.push(`• *${res.hojaQuantity}x* Hojas del Niño`);
        const itemsSummary = itemLines.length > 0 ? itemLines.join('\n') : `• *${res.totalQuantity}* piezas`;

        return [
          `¡Buenas noticias, *${res.contactName}*! Te escribimos desde el *Secretariado de Pastoral Familiar*.`,
          ``,
          `Te avisamos con alegría que los materiales de la *Campaña Abrazo en Familia 2026* correspondientes a tu reserva *${res.code}* para *${res.institutionName}* ya se encuentran *LISTOS PARA SU RETIRO*.`,
          ``,
          `📦 *Detalle de tu paquete a retirar:*`,
          itemsSummary,
          `📊 *Total Piezas:* ${res.totalQuantity} unidades`,
          ``,
          `📍 *Punto de Retiro:* Sede del Secretariado de Pastoral Familiar (Arquidiócesis de Maracaibo).`,
          `🕒 *Horario de Atención:* Lunes a Viernes de 8:30 AM a 1:00 PM.`,
          ``,
          `Por favor indícanos con antelación el día y nombre de la persona autorizada que acudirá a retirar el paquete para tenerlo embalado e identificado esperándote. ¡Paz y Bien!`
        ].join('\n');
      }
    },
    {
      id: 'recibo_proforma',
      title: 'Recibo Proforma Completo',
      category: 'Facturación',
      tag: 'Comprobante',
      tagColor: 'bg-stone-200 text-stone-900 border-stone-300',
      icon: '🧾',
      generateText: (res) => {
        const itemLines: string[] = [];
        if (res.kitQuantity > 0) itemLines.push(`▪ *${res.kitQuantity}x* Kits Impresos Completos (7,00 €) = *${(res.kitQuantity * 7).toFixed(2)} €*`);
        if (res.aficheQuantity > 0) itemLines.push(`▪ *${res.aficheQuantity}x* Afiches Oficiales (3,00 €) = *${(res.aficheQuantity * 3).toFixed(2)} €*`);
        if (res.guiaQuantity > 0) itemLines.push(`▪ *${res.guiaQuantity}x* Guías Facilitador (4,00 €) = *${(res.guiaQuantity * 4).toFixed(2)} €*`);
        if (res.hojaQuantity > 0) itemLines.push(`▪ *${res.hojaQuantity}x* Hojas del Niño (1,00 €) = *${(res.hojaQuantity * 1).toFixed(2)} €*`);
        const itemsSummary = itemLines.join('\n');

        return [
          `🧾 *COMPROBANTE OFICIAL DE RESERVA CRM*`,
          `*PASTORAL FAMILIAR · ARQUIDIÓCESIS DE MARACAIBO*`,
          `_Campaña Arquidiocesana Abrazo en Familia 2026_`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `📄 *N° DE RESERVA:* \`${res.code}\``,
          `📅 *FECHA DE REGISTRO:* ${res.timestamp || new Date().toLocaleDateString('es-VE')}`,
          `📌 *ESTADO DE PAGO:* ${res.paymentStatus.toUpperCase()}`,
          `🚚 *ESTADO DE ENTREGA:* ${res.deliveryStatus}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `👤 *DATOS DEL SOLICITANTE:*`,
          `• *${res.institutionType.toUpperCase()}:* ${res.institutionName}`,
          `• *Contacto:* ${res.contactName}`,
          `• *Teléfono:* ${res.phone}`,
          `• *Correo:* ${res.email || 'No registrado'}`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `📋 *MATERIALES SOLICITADOS:*`,
          itemsSummary,
          `━━━━━━━━━━━━━━━━━━━━`,
          `📦 *CANTIDAD TOTAL:* ${res.totalQuantity} piezas`,
          `💰 *TOTAL GENERAL:* *${Number(res.totalEUR).toFixed(2)} €*`,
          `━━━━━━━━━━━━━━━━━━━━`,
          `📌 _¡Gracias por caminar juntos! Secretariado de Pastoral Familiar · Maracaibo._`
        ].join('\n');
      }
    },
    {
      id: 'libre',
      title: 'Mensaje Personalizado Libre',
      category: 'Libre',
      tag: 'Personalizado',
      tagColor: 'bg-stone-100 text-stone-700 border-stone-200',
      icon: '✍️',
      generateText: (res) => [
        `¡Paz y Bien, *${res.contactName}*! Te escribimos desde el *Secretariado de Pastoral Familiar de la Arquidiócesis de Maracaibo* en relación a tu reserva *${res.code}* para *${res.institutionName}*.`,
        ``,
        `[Escribe aquí tu mensaje específico o actualización pastoral]`,
        ``,
        `¡Un saludo fraterno y bendiciones para tu comunidad!`
      ].join('\n')
    }
  ];

  // Sincronizar datos de la reserva al abrir el modal
  useEffect(() => {
    if (reservation) {
      setStatus(reservation.status || 'Nueva Reserva');
      setPaymentStatus(reservation.paymentStatus || 'Pendiente');
      setPaymentMethod(reservation.paymentMethod || '');
      setPaymentRef(reservation.paymentRef || '');
      setDeliveryStatus(reservation.deliveryStatus || 'Por Imprimir / En Caracas');
      setDeliveryDate(reservation.deliveryDate || '');
      setNotes(reservation.notes || '');
      setTargetPhone(reservation.phone || '');

      // Generar plantilla inicial
      const initialTemplate = templates.find((t) => t.id === 'confirmacion') || templates[0];
      setCustomMessage(initialTemplate.generateText(reservation));
    }
  }, [reservation]);

  // Cambiar de plantilla seleccionada
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!reservation) return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setCustomMessage(template.generateText(reservation));
    }
  };

  if (!isOpen || !reservation) return null;

  // Guardar cambios en el CRM
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(reservation.code, {
        status,
        paymentStatus,
        paymentMethod,
        paymentRef,
        deliveryStatus,
        deliveryDate,
        notes
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Enviar mensaje vía WhatsApp Web (Desktop / Web App)
  const handleSendWhatsAppWeb = () => {
    const cleanPhone = formatWhatsAppPhone(targetPhone || reservation.phone);
    const encoded = encodeURIComponent(customMessage);
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    window.open(url, '_blank');
  };

  // Enviar vía WhatsApp general (App de escritorio o teléfono)
  const handleSendWhatsAppDirect = () => {
    const cleanPhone = formatWhatsAppPhone(targetPhone || reservation.phone);
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Copiar mensaje al portapapeles
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Cálculos del desglose de materiales
  const kitTotal = (reservation.kitQuantity || 0) * 7.0;
  const aficheTotal = (reservation.aficheQuantity || 0) * 3.0;
  const guiaTotal = (reservation.guiaQuantity || 0) * 4.0;
  const hojaTotal = (reservation.hojaQuantity || 0) * 1.0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden flex flex-col my-4 max-h-[92vh]">
        {/* =================================================================== */}
        {/* CABECERA DE LA MODAL */}
        {/* =================================================================== */}
        <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-200 shadow-2xs">
              {reservation.institutionType === 'Colegio' ? (
                <School className="w-5 h-5 text-amber-800" />
              ) : (
                <Church className="w-5 h-5 text-amber-800" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-stone-900 tracking-tight">
                  Editar Gestión CRM
                </h3>
                <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  {reservation.code}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                    paymentStatus === 'Pagado'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : paymentStatus === 'Verificando'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
              <p className="text-xs text-stone-600 font-medium truncate max-w-md">
                {reservation.institutionName} · <span className="text-stone-900 font-bold">{reservation.contactName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/60 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =================================================================== */}
        {/* BARRA DE PESTAÑAS (TABS) */}
        {/* =================================================================== */}
        <div className="bg-stone-100/80 px-4 py-2 border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('gestion')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'gestion'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>1. Gestión CRM & Estados</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materiales')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'materiales'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-blue-700" />
            <span>2. Detalle de Reserva</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {reservation.totalQuantity} pzs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>3. Plantillas WhatsApp</span>
            <span className="bg-emerald-200 text-emerald-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              Web
            </span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* CUERPO DEL FORMULARIO / CONTENIDO DE PESTAÑAS */}
        {/* =================================================================== */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs space-y-4">
          {/* ================================================================= */}
          {/* PESTAÑA 1: GESTIÓN CRM Y ESTADOS */}
          {/* ================================================================= */}
          {activeTab === 'gestion' && (
            <div className="space-y-4 animate-fade-in">
              {/* Tarjeta de Resumen Rápido */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-700">
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Kits Pedidos</span>
                  <span className="font-black text-stone-900 text-sm">{reservation.kitQuantity}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Total Piezas</span>
                  <span className="font-black text-stone-900 text-sm">{reservation.totalQuantity} pzs</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Monto Total</span>
                  <span className="font-black text-amber-900 text-sm">{Number(reservation.totalEUR).toFixed(2)} €</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Teléfono Contacto</span>
                  <span className="font-mono text-stone-900 text-xs font-bold">{reservation.phone}</span>
                </div>
              </div>

              {/* Estados Principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Estado de la Reserva</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white font-medium shadow-2xs"
                  >
                    <option value="Nueva Reserva">Nueva Reserva</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-stone-500" />
                    <span>Estado del Pago</span>
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white font-bold shadow-2xs"
                  >
                    <option value="Pendiente">Pendiente (Sin pagar aún)</option>
                    <option value="Verificando">Verificando comprobante</option>
                    <option value="Pagado">Pagado (Acreditado al 100%)</option>
                  </select>
                </div>
              </div>

              {/* Método y Referencia de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-900 block">
                    Método de Pago Reportado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pago Móvil BNC, Transferencia, Efectivo Divisas"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-900 block">
                    Número de Referencia Bancaria
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ref # 10482931"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 font-mono shadow-2xs"
                  />
                </div>
              </div>

              {/* Entrega y Despacho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-stone-500" />
                    <span>Estado de Entrega del Material</span>
                  </label>
                  <select
                    value={deliveryStatus}
                    onChange={(e) => setDeliveryStatus(e.target.value as DeliveryStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white font-medium shadow-2xs"
                  >
                    <option value="Por Imprimir / En Caracas">Por Imprimir / En Caracas</option>
                    <option value="Enviado">Enviado a Maracaibo</option>
                    <option value="Entregado">Entregado al Solicitante</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    <span>Fecha Estimada / Efectiva de Entrega</span>
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white shadow-2xs"
                  />
                </div>
              </div>

              {/* Notas Internas */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-900 block">
                  Notas y Observaciones Internas (Seguimiento del Equipo)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej. Pagó en efectivo en la curia, solicitó que retire el Párroco, acordado para el miércoles, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 2: DETALLE EXACTO DE QUÉ RESERVÓ LA PERSONA */}
          {/* ================================================================= */}
          {activeTab === 'materiales' && (
            <div className="space-y-4 animate-fade-in">
              {/* Encabezado informativo */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                <h4 className="font-bold text-stone-900 text-sm mb-1 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-700" />
                  <span>Desglose Detallado de Materiales Reservados</span>
                </h4>
                <p className="text-stone-600 text-xs">
                  Especificación de ítems didácticos solicitados para la Campaña Abrazo en Familia 2026.
                </p>
              </div>

              {/* Tabla de Materiales */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-extrabold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Material Didáctico</th>
                      <th className="py-2.5 px-3 text-center">Tipo</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {/* Kit Completo */}
                    <tr className={reservation.kitQuantity > 0 ? 'bg-amber-50/40' : 'opacity-60'}>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">Kit Impreso Completo 2026</div>
                        <div className="text-[10px] text-stone-500">
                          Incluye 1 Afiche grande, 1 Guía Metodológica y 1 Hoja del Niño
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          Kit Oficial
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-stone-900 text-sm">
                        {reservation.kitQuantity || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-600">7,00 €</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono">
                        {kitTotal.toFixed(2)} €
                      </td>
                    </tr>

                    {/* Afiche Oficial */}
                    <tr className={reservation.aficheQuantity > 0 ? 'bg-blue-50/30' : 'opacity-60'}>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">Afiche Oficial de la Campaña 2026</div>
                        <div className="text-[10px] text-stone-500">Formato grande full color para carteleras parroquiales</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Individual
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-stone-900 text-sm">
                        {reservation.aficheQuantity || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-600">3,00 €</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono">
                        {aficheTotal.toFixed(2)} €
                      </td>
                    </tr>

                    {/* Guía Facilitador */}
                    <tr className={reservation.guiaQuantity > 0 ? 'bg-emerald-50/30' : 'opacity-60'}>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">Guía Metodológica del Facilitador</div>
                        <div className="text-[10px] text-stone-500">Manual temático con sesiones, dinámicas y oraciones</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Individual
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-stone-900 text-sm">
                        {reservation.guiaQuantity || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-600">4,00 €</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono">
                        {guiaTotal.toFixed(2)} €
                      </td>
                    </tr>

                    {/* Hoja Niño */}
                    <tr className={reservation.hojaQuantity > 0 ? 'bg-rose-50/30' : 'opacity-60'}>
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">Hoja de Trabajo y Dinámicas del Niño</div>
                        <div className="text-[10px] text-stone-500">Ilustraciones para colorear y dinámicas familiares</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Individual
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-stone-900 text-sm">
                        {reservation.hojaQuantity || 0}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-600">1,00 €</td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono">
                        {hojaTotal.toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>

                  {/* Pie de Totales */}
                  <tfoot className="bg-stone-100/90 font-black border-t border-stone-200 text-stone-900">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-right text-xs uppercase tracking-wider">
                        Totales Consolidados:
                      </td>
                      <td className="py-3 px-3 text-center text-sm font-black text-amber-900">
                        {reservation.totalQuantity} pzs
                      </td>
                      <td></td>
                      <td className="py-3 px-3 text-right text-base font-black text-amber-900 font-mono">
                        {Number(reservation.totalEUR).toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Ficha de Información del Solicitante */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                <h5 className="font-extrabold text-stone-900 uppercase text-[10px] tracking-wider">
                  Datos de la Entidad y Solicitante
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Persona de Contacto</span>
                      <span className="font-bold text-stone-900">{reservation.contactName}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    {reservation.institutionType === 'Colegio' ? (
                      <School className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    ) : (
                      <Church className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">
                        {reservation.institutionType === 'Colegio' ? 'Colegio / Plantel' : 'Parroquia / Comunidad'}
                      </span>
                      <span className="font-bold text-stone-900">{reservation.institutionName}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Teléfono Registrado</span>
                      <a
                        href={`tel:${reservation.phone}`}
                        className="font-mono font-bold text-amber-800 hover:underline"
                      >
                        {reservation.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Correo Electrónico</span>
                      <a
                        href={`mailto:${reservation.email}`}
                        className="font-mono text-stone-700 hover:underline truncate max-w-xs block"
                      >
                        {reservation.email || 'No proporcionado'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 3: PLANTILLAS PREDETERMINADAS DE WHATSAPP Y ENVÍO WEB */}
          {/* ================================================================= */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-fade-in">
              {/* Header de la pestaña WhatsApp */}
              <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3 sm:p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-black text-emerald-950 text-sm flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    <span>Plantillas Predeterminadas de WhatsApp Pastoral</span>
                  </h4>
                  <p className="text-emerald-800 text-xs">
                    Selecciona una plantilla según la fase de la reserva y haz clic en "Enviar vía WhatsApp Web".
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-900">Destino:</span>
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="58414..."
                    className="px-2.5 py-1 rounded-xl bg-white border border-emerald-300 font-mono text-xs font-bold text-emerald-950 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 w-32"
                  />
                </div>
              </div>

              {/* Selector de Plantillas (Chips / Tarjetas de selección rápida) */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-stone-500 tracking-wider block">
                  Selecciona la Plantilla a Enviar:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {templates.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tpl.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{tpl.icon}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${tpl.tagColor}`}>
                            {tpl.tag}
                          </span>
                        </div>
                        <div className="font-bold text-stone-900 text-xs line-clamp-1">
                          {tpl.title}
                        </div>
                        <div className="text-[10px] text-stone-500 font-medium">
                          {tpl.category}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Área de Visualización y Edición del Mensaje */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>Mensaje listo para WhatsApp</span>
                    <span className="text-stone-400 font-normal text-[10px]">(Puedes editarlo antes de enviar)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar texto'}</span>
                  </button>
                </div>

                <div className="relative rounded-2xl border border-stone-300 overflow-hidden shadow-2xs bg-stone-50/50">
                  <textarea
                    rows={8}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 font-sans text-xs text-stone-900 focus:outline-hidden focus:bg-white resize-y"
                    placeholder="Escribe el mensaje..."
                  />
                  <div className="px-3 py-1.5 bg-stone-100 border-t border-stone-200 text-[10px] text-stone-500 flex items-center justify-between">
                    <span>{customMessage.length} caracteres</span>
                    <span>Variables cargadas con los datos de {reservation.contactName}</span>
                  </div>
                </div>
              </div>

              {/* Botones de Envío por WhatsApp */}
              <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {/* Botón Principal: WhatsApp Web */}
                  <button
                    type="button"
                    onClick={handleSendWhatsAppWeb}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs inline-flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar vía WhatsApp Web</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </button>

                  {/* Botón Secundario: App Móvil */}
                  <button
                    type="button"
                    onClick={handleSendWhatsAppDirect}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                    title="Abre directamente en la aplicación de WhatsApp o en móviles"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Abrir en Móvil (wa.me)</span>
                  </button>
                </div>

                <span className="text-[10px] text-stone-500 italic">
                  Abre el chat con el mensaje prellenado en una nueva pestaña.
                </span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* PIE DE ACCIONES DEL FORMULARIO */}
          {/* ================================================================= */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-stone-500 font-medium">
              Última actualización sincronizada con Google Sheets
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saving ? 'Guardando en Sheets...' : 'Guardar Cambios en CRM'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
