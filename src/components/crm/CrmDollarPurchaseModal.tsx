import React, { useState } from 'react';
import {
  X,
  DollarSign,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Calendar,
  Building2,
  CreditCard,
  Wallet,
  AlertCircle,
  PlusCircle,
  History,
  FileSpreadsheet
} from 'lucide-react';
import { DollarPurchase, DollarWalletSummary } from '../../types/reservation';
import { recordNewDollarPurchase, removeDollarPurchase } from '../../utils/dollarWalletStorage';

interface CrmDollarPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchases: DollarPurchase[];
  onPurchasesChange: (updated: DollarPurchase[]) => void;
  summary: DollarWalletSummary;
  operatorName?: string;
  onSuccessToast?: (msg: string) => void;
}

export const CrmDollarPurchaseModal: React.FC<CrmDollarPurchaseModalProps> = ({
  isOpen,
  onClose,
  purchases,
  onPurchasesChange,
  summary,
  operatorName = 'Secretariado Pastoral Familiar',
  onSuccessToast
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // Form State
  const [usdAmount, setUsdAmount] = useState<string>('200');
  const [exchangeRate, setExchangeRate] = useState<string>(
    summary.lastExchangeRate > 0 ? summary.lastExchangeRate.toString() : '44.50'
  );
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [originAccount, setOriginAccount] = useState<string>('Pago Móvil / Banco Mercantil');
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [destinationWallet, setDestinationWallet] = useState<string>('Bóveda / Efectivo Divisas Pastoral');
  const [customDestination, setCustomDestination] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numUsd = parseFloat(usdAmount) || 0;
  const numRate = parseFloat(exchangeRate) || 0;
  const calculatedVes = numUsd * numRate;

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numUsd <= 0) {
      setErrorMsg('Por favor introduce un monto válido en dólares mayor a 0.');
      return;
    }

    if (numRate <= 0) {
      setErrorMsg('Por favor introduce una tasa de cambio válida (Bs. por cada USD).');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalOrigin = originAccount === 'Otro' ? customOrigin.trim() || 'Cuenta Bancaria' : originAccount;
      const finalDestination =
        destinationWallet === 'Otro' ? customDestination.trim() || 'Cartera Pastoral' : destinationWallet;

      const res = await recordNewDollarPurchase({
        date,
        usdAmount: numUsd,
        exchangeRate: numRate,
        vesAmount: calculatedVes,
        originAccount: finalOrigin,
        destinationWallet: finalDestination,
        reference: reference.trim() || `COMP-${Date.now().toString().slice(-6)}`,
        operator: operatorName,
        notes: notes.trim()
      });

      if (res.success) {
        // Actualizar lista local en el estado padre
        const updated = [res.purchase, ...purchases.filter((p) => p.id !== res.purchase.id)];
        onPurchasesChange(updated);

        if (onSuccessToast) {
          onSuccessToast(res.message || 'Compra de dólares resguardada exitosamente en la Cartera.');
        }

        // Resetear campos
        setUsdAmount('100');
        setReference('');
        setNotes('');
        setActiveTab('history');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la compra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = (id: string, usd: number) => {
    if (confirm(`¿Estás seguro de anular la compra de $${usd.toFixed(2)} USD? Se revertirán los fondos.`)) {
      const updated = removeDollarPurchase(id);
      onPurchasesChange(updated);
      if (onSuccessToast) {
        onSuccessToast('Compra de dólares revertida y actualizada.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-3xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="px-6 py-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-stone-900 tracking-tight">
                  Cartera de Dólares & Cobertura Cambiaria
                </h3>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Anti-Devaluación
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Convierte los Bolívares recaudados a Dólares ($ USD) para proteger el poder adquisitivo de la pastoral
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Superior de Indicadores de Cartera */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3.5 bg-stone-100/70 border-b border-stone-200 shrink-0">
          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Cartera en Dólares</div>
            <div className="text-xl font-black text-emerald-700 font-mono tabular-nums tracking-tight">
              ${summary.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Total USD protegidos</div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Bolívares Canjeados</div>
            <div className="text-lg font-black text-amber-800 font-mono tabular-nums tracking-tight">
              {summary.totalVesSpent.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Invertidos en divisas</div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Tasa Ponderada</div>
            <div className="text-lg font-black text-stone-900 font-mono tabular-nums tracking-tight">
              {summary.averageExchangeRate.toFixed(2)} Bs/$
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Promedio de compra</div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Operaciones</div>
            <div className="text-lg font-black text-stone-900 font-mono tabular-nums tracking-tight">
              {summary.purchaseCount}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Compras registradas</div>
          </div>
        </div>

        {/* Selector de pestañas */}
        <div className="flex border-b border-stone-200 px-6 shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Compra de Dólares
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Compras ({purchases.length})
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto grow space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleCreatePurchase} className="space-y-5">
              {/* Bloque central: Conversión Dinámica */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4.5 space-y-4">
                <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Monto a Comprar y Tasa de Cambio
                  </span>
                  <span className="text-[11px] font-normal text-emerald-800">
                    Cálculo automático de egreso en Bolívares
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Dólares */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Dólares a Comprar ($ USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={usdAmount}
                        onChange={(e) => setUsdAmount(e.target.value)}
                        placeholder="Ej. 250"
                        className="w-full pl-8 pr-3 py-2 text-base font-bold font-mono text-stone-900 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Tasa de cambio */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tasa de Compra (Bs/USD) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder="Ej. 44.80"
                        className="w-full px-3 py-2 text-base font-bold font-mono text-stone-900 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <span className="absolute right-3 top-2.5 text-stone-400 text-xs">Bs/$</span>
                    </div>
                  </div>

                  {/* Total Bolívares calculados */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Total a Restar en Bolívares
                    </label>
                    <div className="px-3 py-2 bg-white/90 border border-emerald-300 rounded-xl flex items-center justify-between">
                      <span className="text-base font-black text-amber-900 font-mono tabular-nums">
                        {calculatedVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-amber-800">Bs.</span>
                    </div>
                  </div>
                </div>

                {/* Explicación de flujo de fondos */}
                <div className="bg-white/80 rounded-xl p-3 border border-emerald-100 flex items-center gap-3 text-xs text-stone-600">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    Bs
                  </div>
                  <div className="grow">
                    <span className="font-semibold text-stone-800">Operación contable:</span> Se debitarán{' '}
                    <strong className="text-amber-800 font-mono">
                      {calculatedVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
                    </strong>{' '}
                    y se acreditarán{' '}
                    <strong className="text-emerald-700 font-mono">${numUsd.toFixed(2)} USD</strong> en la Cartera de Divisas.
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                    $
                  </div>
                </div>
              </div>

              {/* Origen y Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cuenta Origen en Bolívares */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                    Cuenta / Origen de los Bolívares *
                  </label>
                  <select
                    value={originAccount}
                    onChange={(e) => setOriginAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Pago Móvil / Banco Mercantil">Pago Móvil / Banco Mercantil</option>
                    <option value="Banesco Banco Universal">Banesco Banco Universal</option>
                    <option value="Banco de Venezuela">Banco de Venezuela (BDV)</option>
                    <option value="Banco Provincial">BBVA Banco Provincial</option>
                    <option value="Banco Nacional de Crédito (BNC)">Banco Nacional de Crédito (BNC)</option>
                    <option value="Caja Efectivo Bolívares">Caja Efectivo Bolívares</option>
                    <option value="Otro">Otra cuenta / entidad...</option>
                  </select>
                  {originAccount === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el banco o cuenta origen..."
                      value={customOrigin}
                      onChange={(e) => setCustomOrigin(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-xl"
                    />
                  )}
                </div>

                {/* Destino / Custodia de los Dólares */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-stone-500" />
                    Destino / Custodia de los USD *
                  </label>
                  <select
                    value={destinationWallet}
                    onChange={(e) => setDestinationWallet(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="Bóveda / Efectivo Divisas Pastoral">Bóveda / Efectivo Divisas Pastoral</option>
                    <option value="Custodia USD Bancamiga">Cuenta Especial USD Bancamiga</option>
                    <option value="Custodia USD Bancaribe">Cuenta Moneda Extranjera Bancaribe</option>
                    <option value="Custodia USD Mercantil">Cuenta Especial USD Mercantil</option>
                    <option value="Zelle Reserva Arquidiócesis">Zelle Reserva Arquidiocesana</option>
                    <option value="Otro">Otro destino / custodia...</option>
                  </select>
                  {destinationWallet === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especifica el destino de los dólares..."
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 text-xs text-stone-900 bg-white border border-stone-300 rounded-xl"
                    />
                  )}
                </div>
              </div>

              {/* Referencia, Fecha y Operador */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-stone-400" />
                    Nro. Referencia / Recibo
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej. OP-78291"
                    className="w-full px-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    Fecha de Operación
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Operador / Responsable
                  </label>
                  <input
                    type="text"
                    disabled
                    value={operatorName}
                    className="w-full px-3 py-2 text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded-xl cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notas u Observaciones
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Resguardo de pagos recibidos de Parroquia San Onofre y Colegio Gonzaga..."
                  className="w-full px-3 py-2 text-xs text-stone-900 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              {/* Botón de acción */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || numUsd <= 0 || numRate <= 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Guardando operación...' : `Confirmar y Comprar $${numUsd.toFixed(2)} USD`}
                </button>
              </div>
            </form>
          ) : (
            /* Pestaña: Historial de Compras */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  Transacciones de Cobertura Cambiaria Registradas
                </span>
                <span className="text-xs text-stone-500">
                  {purchases.length} operaciones · Total:${' '}
                  <strong className="text-emerald-700 font-mono">
                    ${summary.totalUsdPurchased.toFixed(2)} USD
                  </strong>
                </span>
              </div>

              {purchases.length === 0 ? (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-200">
                  <Wallet className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-stone-600">Aún no hay compras de dólares registradas</p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Haz clic en "Registrar Compra de Dólares" para resguardar la recaudación en divisas.
                  </p>
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200">
                        <tr>
                          <th className="py-2.5 px-3">Fecha / Código</th>
                          <th className="py-2.5 px-3">Dólares ($ USD)</th>
                          <th className="py-2.5 px-3">Tasa (Bs/$)</th>
                          <th className="py-2.5 px-3">Bolívares Egresados</th>
                          <th className="py-2.5 px-3">Origen ➔ Custodia</th>
                          <th className="py-2.5 px-3">Referencia</th>
                          <th className="py-2.5 px-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {purchases.map((p) => (
                          <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-stone-900">{p.date || p.timestamp}</div>
                              <div className="text-[10px] text-stone-400 font-mono">{p.id}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-emerald-700 font-mono text-sm tabular-nums">
                                ${Number(p.usdAmount).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-stone-700">
                              {Number(p.exchangeRate).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-amber-900 font-mono tabular-nums">
                                {Number(p.vesAmount).toLocaleString('es-VE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}{' '}
                                Bs.
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-stone-800 font-medium truncate max-w-[140px]">{p.originAccount}</div>
                              <div className="text-[10px] text-stone-500 truncate max-w-[140px]">{p.destinationWallet}</div>
                            </td>
                            <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">
                              {p.reference || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleDeletePurchase(p.id, p.usdAmount)}
                                className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Anular esta compra"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie modal */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Los dólares registrados se computan en tiempo real en los KPIs y en el PDF oficial.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
