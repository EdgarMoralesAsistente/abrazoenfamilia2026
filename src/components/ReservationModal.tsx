import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  Phone,
  ExternalLink,
  Package,
  Layers,
  ClipboardCheck,
  Church,
  GraduationCap
} from 'lucide-react';
import { CAMPAIGN_ITEMS, MARACAIBO_PARISHES } from '../data/parishes';
import { CartItemSelection, StoredReservation } from '../types';
import { syncReservationToSheets, getSheetsWebhookUrl } from '../utils/sheetsSync';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
  exchangeRate?: number;
  onReservationCreated: (reservation: StoredReservation) => void;
  googleSheetsWebhookUrl?: string;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
  onReservationCreated,
  googleSheetsWebhookUrl
}) => {
  // Cantidad de Kits completos
  const [kitQuantity, setKitQuantity] = useState(1);

  // Cantidad de cada producto individual del kit
  const [individualQuantities, setIndividualQuantities] = useState<Record<string, number>>({
    'afiche-oficial-2026': 0,
    'guia-facilitador-2026': 0,
    'hoja-nino-2026': 0
  });

  // Datos esenciales de contacto
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [institutionType, setInstitutionType] = useState<'parroquia' | 'colegio'>('parroquia');
  const [parish, setParish] = useState(MARACAIBO_PARISHES[0]);
  const [customParish, setCustomParish] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<StoredReservation | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar si se eligió un ítem específico desde la landing page
  useEffect(() => {
    if (isOpen) {
      if (preselectedItemId) {
        if (preselectedItemId === 'kit-completo-2026') {
          setKitQuantity((prev) => (prev === 0 ? 1 : prev));
        } else {
          setIndividualQuantities((prev) => ({
            ...prev,
            [preselectedItemId]: Math.max(1, (prev[preselectedItemId] || 0) + 1)
          }));
        }
      }
    }
  }, [preselectedItemId, isOpen]);

  const kitItem = CAMPAIGN_ITEMS.find((i) => i.id === 'kit-completo-2026')!;
  const individualItems = CAMPAIGN_ITEMS.filter((i) => !i.isKit);

  // Totales en Euros (€)
  const totalEUR =
    kitQuantity * kitItem.unitPriceEUR +
    individualItems.reduce(
      (sum, item) => sum + (individualQuantities[item.id] || 0) * item.unitPriceEUR,
      0
    );

  const totalItemsCount =
    kitQuantity +
    Object.values(individualQuantities).reduce<number>((a, b) => a + Number(b), 0);

  const handleClose = () => {
    setConfirmedReservation(null);
    setErrorMsg('');
    onClose();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (totalItemsCount <= 0) {
      setErrorMsg('Por favor selecciona al menos 1 kit o producto individual.');
      return;
    }
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setErrorMsg('Por favor completa tu nombre, teléfono y correo electrónico.');
      return;
    }
    if (institutionType === 'colegio' && !schoolName.trim()) {
      setErrorMsg('Por favor indica el nombre del colegio o institución educativa.');
      return;
    }
    if (institutionType === 'parroquia' && parish === 'Otra Parroquia' && !customParish.trim()) {
      setErrorMsg('Por favor escribe el nombre de la parroquia que no está en el listado.');
      return;
    }

    setIsSubmitting(true);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reservationCode = `AEF26-${randomSuffix}`;

    const items: CartItemSelection[] = [];
    if (kitQuantity > 0) {
      items.push({ itemId: kitItem.id, quantity: kitQuantity });
    }
    Object.entries(individualQuantities).forEach(([id, qty]) => {
      const numQty = Number(qty);
      if (numQty > 0) {
        items.push({ itemId: id, quantity: numQty });
      }
    });

    const finalEntity =
      institutionType === 'colegio'
        ? schoolName.trim()
        : parish === 'Otra Parroquia' && customParish.trim()
        ? customParish.trim()
        : parish;

    const newRes: StoredReservation = {
      id: `res-${Date.now()}`,
      code: reservationCode,
      createdAt: new Date().toISOString(),
      fullName: fullName.trim(),
      idNumber: 'Pendiente en pago',
      phone: phone.trim(),
      email: email.trim(),
      institutionType,
      parish: finalEntity,
      schoolName: institutionType === 'colegio' ? schoolName.trim() : undefined,
      role: institutionType === 'colegio' ? 'Colegio / Institución Educativa' : 'Comunidad Parroquial',
      deliveryMethod: 'retiro_sede',
      items,
      totalEUR: Number(totalEUR.toFixed(2)),
      status: 'pendiente_pago',
      syncedToGoogleSheets: false,
      emailSent: true
    };

    // Sincronizar con Google Sheets CRM y Backend
    try {
      await syncReservationToSheets(newRes);
    } catch (e) {
      console.warn('Error sincronizando reserva con Google Sheets:', e);
    }

    // Persistir localmente
    try {
      const stored = JSON.parse(localStorage.getItem('aef_reservations_mcbo') || '[]');
      localStorage.setItem('aef_reservations_mcbo', JSON.stringify([newRes, ...stored]));
    } catch {}

    onReservationCreated(newRes);
    setConfirmedReservation(newRes);
    setIsSubmitting(false);
  };

  // Genera el texto diagramado con formato tipo Factura o Recibo de Reserva para WhatsApp
  const generateReservationWhatsAppText = (res: StoredReservation): string => {
    const dateObj = new Date(res.createdAt);
    const dateFormatted = !isNaN(dateObj.getTime())
      ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
      : new Date().toLocaleDateString('es-VE');

    const entityHeader = res.institutionType === 'colegio' ? 'COLEGIO' : 'PARROQUIA';
    const entityTitle = res.institutionType === 'colegio' ? 'Colegio' : 'Parroquia / Comunidad';

    // Líneas separadoras con un máximo de 13 caracteres para evitar saltos de renglón en móviles
    const LINE_BAR = '━━━━━━━━━━━━━'; // 13 caracteres de ━
    const LINE_EQ  = '============='; // 13 caracteres de =

    let totalQuantity = 0;
    const itemLines = res.items.map((it) => {
      totalQuantity += it.quantity;
      const mat = CAMPAIGN_ITEMS.find((c) => c.id === it.itemId);
      const name = mat?.name || it.itemId;
      const unit = mat ? mat.unitPriceEUR : 0;
      const subtotal = it.quantity * unit;
      return `▪ *${it.quantity}x* ${name}\n   _${it.quantity} un. × ${unit.toFixed(2)} € = *${subtotal.toFixed(2)} €*_`;
    });

    return [
      `🧾 *RECIBO DE RESERVA / FACTURA PROFORMA*`,
      `*PASTORAL FAMILIAR · ARQUIDIÓCESIS DE MARACAIBO*`,
      `_Campaña Arquidiocesana Abrazo en Familia 2026_`,
      LINE_BAR,
      `📄 *COMPROBANTE N°:* \`${res.code}\``,
      `📅 *FECHA DE EMISIÓN:* ${dateFormatted}`,
      `📌 *ESTADO:* RESERVACIÓN REGISTRADA`,
      LINE_BAR,
      `👤 *DATOS DEL CLIENTE / ${entityHeader}:*`,
      `• *Solicitante:* ${res.fullName}`,
      `• *Teléfono:* ${res.phone}`,
      `• *Correo:* ${res.email}`,
      `• *${entityTitle}:* ${res.parish}`,
      LINE_BAR,
      `📋 *DETALLE DEL RECIBO:*`,
      LINE_EQ,
      itemLines.join('\n'),
      LINE_EQ,
      `📦 *CANTIDAD TOTAL:* ${totalQuantity} unidades`,
      LINE_BAR,
      `💰 *TOTAL GENERAL:* *${res.totalEUR.toFixed(2)} €*`,
      LINE_BAR,
      `📌 _Comprobante oficial emitido por el portal web para el lote de Maracaibo._`
    ].join('\n');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-lg overflow-hidden my-4 flex flex-col">
        {/* Cabecera Minimalista */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              {confirmedReservation ? 'Comprobante de Reservación' : 'Reservar Material Impreso'}
            </h3>
            <p className="text-xs text-stone-700">
              Campaña Abrazo en Familia 2026 · Solicitud a Caracas
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[82vh]">
          {!confirmedReservation ? (
            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* SECCIÓN 1: SELECCIÓN DE MATERIALES (KIT + PRODUCTOS POR SEPARADO) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-700" />
                    <span>1. Kit Completo o Productos por Separado</span>
                  </label>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Moneda: Euro (€)
                  </span>
                </div>

                {/* TARJETA 1: Kit Impreso Completo */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900 text-sm">
                          Kit Impreso Completo 2026
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-700 text-white">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-xs text-stone-700 mt-0.5">
                        Incluye los 3 materiales: 1 Afiche + 1 Guía + 1 Hoja del Niño
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-base font-extrabold text-stone-900 block">
                        {kitItem.unitPriceEUR.toFixed(2)} €
                      </span>
                      <span className="text-[11px] text-stone-600">
                        Kit Completo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
                    <span className="text-xs font-semibold text-stone-700">
                      Cantidad de Kits completos:
                    </span>
                    <div className="flex items-center border border-amber-300 rounded-lg bg-white shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setKitQuantity(Math.max(0, kitQuantity - 1))}
                        className="p-1.5 text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-stone-900">
                        {kitQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setKitQuantity(kitQuantity + 1)}
                        className="p-1.5 text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* TARJETA 2: Productos individuales por separado */}
                <div className="border border-stone-200 rounded-xl p-3.5 bg-stone-50/70 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-stone-700" />
                    <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                      Productos individuales del Kit (por separado o adicionales)
                    </span>
                  </div>

                  <div className="divide-y divide-stone-200/70">
                    {individualItems.map((item) => (
                      <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-stone-900 text-xs block truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-bold text-stone-800">
                            {item.unitPriceEUR.toFixed(2)} € <span className="text-stone-500 font-normal">c/u</span>
                          </span>
                        </div>

                        <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setIndividualQuantities((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] || 0) - 1)
                              }))
                            }
                            className="p-1 text-stone-600 hover:bg-stone-100 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center font-bold text-xs text-stone-900">
                            {individualQuantities[item.id] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setIndividualQuantities((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1
                              }))
                            }
                            className="p-1 text-stone-600 hover:bg-stone-100 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DATOS DE CONTACTO ESENCIALES */}
              <div className="space-y-3 pt-1">
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block">
                  2. Datos de Contacto y Parroquia
                </label>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carmen Rodríguez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-hidden focus:border-amber-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      WhatsApp / Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0414-1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-hidden focus:border-amber-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="tu-correo@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-hidden focus:border-amber-700"
                    />
                  </div>
                </div>

                {/* CASILLA PARA ELEGIR SI ES PARROQUIA O COLEGIO */}
                <div className="pt-1 space-y-2.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    ¿La reserva es para una Parroquia o un Colegio? *
                  </label>

                  {/* Casilla de Selección con Botones Tipo Radio */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <label
                      className={`cursor-pointer flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                        institutionType === 'parroquia'
                          ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-700 shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="institutionType"
                        value="parroquia"
                        checked={institutionType === 'parroquia'}
                        onChange={() => setInstitutionType('parroquia')}
                        className="text-amber-700 focus:ring-amber-700 accent-amber-700"
                      />
                      <Church className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span className="text-xs">Parroquia</span>
                    </label>

                    <label
                      className={`cursor-pointer flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                        institutionType === 'colegio'
                          ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold ring-1 ring-amber-700 shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="institutionType"
                        value="colegio"
                        checked={institutionType === 'colegio'}
                        onChange={() => setInstitutionType('colegio')}
                        className="text-amber-700 focus:ring-amber-700 accent-amber-700"
                      />
                      <GraduationCap className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span className="text-xs">Colegio</span>
                    </label>
                  </div>

                  {/* CAMPO CONDICIONAL: SI ES PARROQUIA SE VE EL DESPLEGABLE CON LISTADO DE PARROQUIAS */}
                  {institutionType === 'parroquia' ? (
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Parroquia de Maracaibo *
                      </label>
                      <select
                        value={parish}
                        onChange={(e) => {
                          setParish(e.target.value);
                          if (e.target.value !== 'Otra Parroquia') {
                            setCustomParish('');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-hidden focus:border-amber-700 bg-white"
                      >
                        {MARACAIBO_PARISHES.map((p, idx) => (
                          <option key={idx} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>

                      {parish === 'Otra Parroquia' && (
                        <div className="mt-2.5 space-y-1">
                          <label className="block text-xs font-semibold text-amber-900">
                            Escribe el nombre de la parroquia *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Parroquia San Cayetano, Capilla..."
                            value={customParish}
                            onChange={(e) => setCustomParish(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-amber-50/50 text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* CAMPO CONDICIONAL: SI ES COLEGIO SE VE EL CAMPO PARA COLOCAR EL NOMBRE DEL COLEGIO (Y NO EL DESPLEGABLE) */
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Nombre del Colegio o Institución Educativa *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Colegio San Vicente de Paúl, Colegio Claret, U.E. Gonzaga..."
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-hidden focus:border-amber-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">
                  {errorMsg}
                </p>
              )}

              {/* SECCIÓN 3: TOTAL Y BOTÓN DE ENVIAR (EN UNA SOLA MONEDA: EURO €) */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-stone-700 uppercase font-semibold block">
                    Total a Pagar ({totalItemsCount} materiales)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-stone-900">
                      {totalEUR.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || totalItemsCount === 0}
                  className="px-5 py-3 rounded-xl font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-all text-sm shadow-md"
                >
                  {isSubmitting ? 'Enviando...' : 'Completar Reserva'}
                </button>
              </div>
            </form>
          ) : (
            /* VISTA DE COMPROBANTE DE RESERVACIÓN Y ENVÍO POR WHATSAPP */
            <div className="space-y-4">
              <div className="text-center py-1">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1.5 font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-base font-extrabold text-stone-900">
                  ¡Reserva Generada Exitosamente!
                </h4>
                <p className="text-xs text-stone-600">
                  Tu reservación de material para la Campaña Abrazo en Familia 2026 ha sido registrada exitosamente.
                </p>
              </div>

              {/* TARJETA DE COMPROBANTE DE RESERVACIÓN */}
              <div className="border border-stone-300 rounded-xl bg-stone-50/60 overflow-hidden shadow-xs">
                {/* Cabecera del Comprobante */}
                <div className="bg-stone-900 text-white p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Comprobante de Reservación
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-stone-800 px-2 py-0.5 rounded">
                    {confirmedReservation.code}
                  </span>
                </div>

                <div className="p-3.5 space-y-3 text-xs">
                  {/* Datos del Solicitante y Fecha */}
                  <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-stone-200">
                    <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">
                        Solicitante
                      </span>
                      <span className="font-bold text-stone-900 block truncate">
                        {confirmedReservation.fullName}
                      </span>
                      <span className="text-stone-600 text-[11px] block truncate">
                        {confirmedReservation.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-stone-500 font-bold block">
                        {confirmedReservation.institutionType === 'colegio' ? 'Colegio' : 'Parroquia / Comunidad'}
                      </span>
                      <span className="font-semibold text-stone-900 block line-clamp-2">
                        {confirmedReservation.parish}
                      </span>
                    </div>
                  </div>

                  {/* Detalle de Materiales Reservados */}
                  <div>
                    <span className="text-[10px] uppercase text-stone-500 font-bold block mb-1.5">
                      Materiales Reservados
                    </span>
                    <div className="space-y-1.5">
                      {confirmedReservation.items.map((it) => {
                        const mat = CAMPAIGN_ITEMS.find((c) => c.id === it.itemId);
                        const unitPrice = mat ? mat.unitPriceEUR : 0;
                        const subtotal = it.quantity * unitPrice;
                        return (
                          <div
                            key={it.itemId}
                            className="flex items-center justify-between py-1 border-b border-stone-200/60 last:border-0"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-medium text-stone-900 block truncate">
                                <span className="font-bold text-amber-800">{it.quantity}x</span> {mat?.name || it.itemId}
                              </span>
                              <span className="text-[10px] text-stone-500">
                                {it.quantity} un. × {unitPrice.toFixed(2)} €
                              </span>
                            </div>
                            <span className="font-bold text-stone-900 flex-shrink-0">
                              {subtotal.toFixed(2)} €
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total de la Reserva */}
                  <div className="pt-2 border-t border-stone-300 flex items-center justify-between bg-white -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                    <span className="font-bold text-stone-800 text-xs uppercase">
                      Total de la Reserva:
                    </span>
                    <span className="text-lg font-black text-amber-900">
                      {confirmedReservation.totalEUR.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón WhatsApp de Envío de la Reserva */}
              <div className="pt-1 space-y-2">
                <a
                  href={`https://wa.me/584146864290?text=${encodeURIComponent(
                    generateReservationWhatsAppText(confirmedReservation)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    syncReservationToSheets(confirmedReservation);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold bg-emerald-700 hover:bg-emerald-800 text-white text-sm shadow-md transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Enviar reserva por WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded-xl font-medium text-stone-600 hover:bg-stone-100 text-xs transition-colors"
                >
                  Cerrar ventana
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

