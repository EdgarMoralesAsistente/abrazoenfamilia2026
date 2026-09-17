import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { CrmReservation, ReservationStatus, PaymentStatus, DeliveryStatus } from '../../types/reservation';

interface CrmEditModalProps {
  isOpen: boolean;
  reservation: CrmReservation | null;
  onClose: () => void;
  onSave: (code: string, updates: Partial<CrmReservation>) => Promise<void>;
}

export const CrmEditModal: React.FC<CrmEditModalProps> = ({
  isOpen,
  reservation,
  onClose,
  onSave
}) => {
  const [status, setStatus] = useState<ReservationStatus>('Nueva Reserva');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pendiente');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('Por Imprimir / En Caracas');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (reservation) {
      setStatus(reservation.status || 'Nueva Reserva');
      setPaymentStatus(reservation.paymentStatus || 'Pendiente');
      setPaymentMethod(reservation.paymentMethod || '');
      setPaymentRef(reservation.paymentRef || '');
      setDeliveryStatus(reservation.deliveryStatus || 'Por Imprimir / En Caracas');
      setDeliveryDate(reservation.deliveryDate || '');
      setNotes(reservation.notes || '');
    }
  }, [reservation]);

  if (!isOpen || !reservation) return null;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-xl overflow-hidden flex flex-col my-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Editar Gestión CRM
              </h3>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                {reservation.code}
              </span>
            </div>
            <p className="text-xs text-stone-700">
              {reservation.institutionName} · Solicitante: {reservation.contactName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Resumen del Pedido (Solo lectura) */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-700">
            <div>
              <span className="text-[10px] text-stone-700 font-bold block uppercase">Kits</span>
              <span className="font-bold text-stone-900 text-sm">{reservation.kitQuantity}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-700 font-bold block uppercase">Total Piezas</span>
              <span className="font-bold text-stone-900 text-sm">{reservation.totalQuantity}</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-700 font-bold block uppercase">Total EUR</span>
              <span className="font-bold text-amber-900 text-sm">{Number(reservation.totalEUR).toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-[10px] text-stone-700 font-bold block uppercase">Teléfono</span>
              <span className="font-mono text-stone-900 text-xs">{reservation.phone}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estado de la Reserva */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">
                Estado de la Reserva
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white"
              >
                <option value="Nueva Reserva">Nueva Reserva</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Confirmada">Confirmada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            {/* Estado del Pago */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">
                Estado del Pago
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white font-medium"
              >
                <option value="Pendiente">Pendiente (Sin pagar)</option>
                <option value="Verificando">Verificando comprobante</option>
                <option value="Pagado">Pagado (Verificado)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Método de Pago */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">
                Método de Pago
              </label>
              <input
                type="text"
                placeholder="Ej. Transferencia Banesco, Pago Móvil, Efectivo"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
              />
            </div>

            {/* Referencia de Pago */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">
                Referencia de Pago
              </label>
              <input
                type="text"
                placeholder="Ej. Ref #12345678"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estado de Entrega */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">
                Estado de Entrega
              </label>
              <select
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value as DeliveryStatus)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white"
              >
                <option value="Por Imprimir / En Caracas">Por Imprimir / En Caracas</option>
                <option value="Enviado">Enviado a Maracaibo</option>
                <option value="Entregado">Entregado al Solicitante</option>
              </select>
            </div>

            {/* Fecha de Entrega Estimada / Real */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-900 block">
                Fecha de Entrega
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 bg-white"
              />
            </div>
          </div>

          {/* Notas y Observaciones */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-900 block">
              Notas y Observaciones Internas
            </label>
            <textarea
              rows={3}
              placeholder="Añadir notas sobre retiro, persona autorizada, abonos parciales, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700"
            />
          </div>

          {/* Botones de acción */}
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
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Guardando en Sheets...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
