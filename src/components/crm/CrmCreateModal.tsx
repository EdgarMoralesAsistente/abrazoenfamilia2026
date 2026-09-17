import React, { useState } from 'react';
import { X, Plus, RefreshCw } from 'lucide-react';
import { CrmReservation, ReservationType } from '../../types/reservation';
import { MARACAIBO_PARISHES, MARACAIBO_SCHOOLS } from '../../data/parishes';

interface CrmCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (reservation: CrmReservation) => Promise<void>;
}

export const CrmCreateModal: React.FC<CrmCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [institutionType, setInstitutionType] = useState<ReservationType>('Parroquia');
  const [institutionName, setInstitutionName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [kitQuantity, setKitQuantity] = useState<number>(1);
  const [aficheQuantity, setAficheQuantity] = useState<number>(0);
  const [guiaQuantity, setGuiaQuantity] = useState<number>(0);
  const [hojaQuantity, setHojaQuantity] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'Pendiente' | 'Pagado' | 'Verificando'>('Pendiente');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Precios oficiales de la campaña
  const KIT_PRICE = 7;
  const AFICHE_PRICE = 3;
  const GUIA_PRICE = 4;
  const HOJA_PRICE = 2;

  const totalQuantity = (Number(kitQuantity) || 0) + (Number(aficheQuantity) || 0) + (Number(guiaQuantity) || 0) + (Number(hojaQuantity) || 0);
  const totalEUR =
    (Number(kitQuantity) || 0) * KIT_PRICE +
    (Number(aficheQuantity) || 0) * AFICHE_PRICE +
    (Number(guiaQuantity) || 0) * GUIA_PRICE +
    (Number(hojaQuantity) || 0) * HOJA_PRICE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName || !contactName || !phone) {
      alert('Por favor complete la institución, nombre y teléfono.');
      return;
    }

    if (totalQuantity <= 0) {
      alert('Debe solicitar al menos un material.');
      return;
    }

    setSaving(true);
    try {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const code = `AEF26-${randomDigits}`;
      const now = new Date();
      const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newRecord: CrmReservation = {
        id: code,
        timestamp,
        code,
        institutionType,
        institutionName,
        contactName,
        phone,
        email,
        kitQuantity: Number(kitQuantity) || 0,
        aficheQuantity: Number(aficheQuantity) || 0,
        guiaQuantity: Number(guiaQuantity) || 0,
        hojaQuantity: Number(hojaQuantity) || 0,
        totalQuantity,
        totalEUR,
        status: 'Nueva Reserva',
        paymentStatus,
        paymentMethod,
        paymentRef,
        deliveryStatus: 'Por Imprimir / En Caracas',
        deliveryDate: '',
        notes
      };

      await onCreate(newRecord);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-xl overflow-hidden flex flex-col my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Nueva Reserva en CRM
            </h3>
            <p className="text-xs text-stone-700">
              Registrar solicitud interna directa en Google Sheets
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Tipo de Institución */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInstitutionType('Parroquia');
                setInstitutionName('');
              }}
              className={`py-2 px-3 rounded-xl font-bold text-center border transition-all ${
                institutionType === 'Parroquia'
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Parroquia Eclesial
            </button>
            <button
              type="button"
              onClick={() => {
                setInstitutionType('Colegio');
                setInstitutionName('');
              }}
              className={`py-2 px-3 rounded-xl font-bold text-center border transition-all ${
                institutionType === 'Colegio'
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Colegio / Escuela
            </button>
          </div>

          {/* Nombre de Parroquia o Colegio */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-900 block">
              {institutionType === 'Parroquia' ? 'Seleccionar Parroquia' : 'Seleccionar o escribir Colegio'}
            </label>
            {institutionType === 'Parroquia' ? (
              <select
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white"
              >
                <option value="">-- Seleccionar Parroquia (A-Z) --</option>
                {MARACAIBO_PARISHES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                list="school-options"
                placeholder="Nombre del colegio o instituto educativo"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
              />
            )}
            <datalist id="school-options">
              {MARACAIBO_SCHOOLS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Datos del Solicitante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">Solicitante</label>
              <input
                type="text"
                placeholder="Nombre y Apellido"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">Teléfono WhatsApp</label>
              <input
                type="tel"
                placeholder="0414..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">Correo Electrónico</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
              />
            </div>
          </div>

          {/* Selector de Materiales con Cálculo en Tiempo Real */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <span className="font-bold text-stone-900 block">
              Materiales a Reservar
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-stone-700 font-bold block uppercase">Kits (8 €)</label>
                <input
                  type="number"
                  min="0"
                  value={kitQuantity}
                  onChange={(e) => setKitQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-700 font-bold block uppercase">Afiches (1 €)</label>
                <input
                  type="number"
                  min="0"
                  value={aficheQuantity}
                  onChange={(e) => setAficheQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-700 font-bold block uppercase">Guías (3 €)</label>
                <input
                  type="number"
                  min="0"
                  value={guiaQuantity}
                  onChange={(e) => setGuiaQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-700 font-bold block uppercase">Hojas (2 €)</label>
                <input
                  type="number"
                  min="0"
                  value={hojaQuantity}
                  onChange={(e) => setHojaQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-center bg-white"
                />
              </div>
            </div>

            {/* Total Piezas y Monto Calculado en Tiempo Real */}
            <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-xs">
              <span className="text-stone-600 font-medium">
                Total piezas calculadas: <strong className="text-stone-900">{totalQuantity} unid.</strong>
              </span>
              <span className="text-stone-900 font-bold text-sm">
                Monto Total: <span className="text-amber-800 font-black">{totalEUR.toFixed(2)} €</span>
              </span>
            </div>
          </div>

          {/* Estado de Pago Inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">Estado del Pago</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white font-medium"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
                <option value="Verificando">Verificando</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">Método de Pago</label>
              <input
                type="text"
                placeholder="Ej. Transferencia, Pago Móvil"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">Referencia</label>
              <input
                type="text"
                placeholder="Referencia bancaria"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 font-mono"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-900 block">Notas y Observaciones</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre entrega o acuerdos con el párroco/director..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
            />
          </div>

          {/* Botones */}
          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{saving ? 'Registrando...' : 'Crear Reserva'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
