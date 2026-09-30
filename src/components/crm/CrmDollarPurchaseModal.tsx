import React, { useState } from 'react';
import {
  X,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  CreditCard,
  Wallet,
  AlertCircle,
  PlusCircle,
  History,
  RefreshCw,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { DollarPurchase, DollarWalletSummary } from '../../types/reservation';
import {
  recordNewDollarPurchase,
  updateStoredDollarPurchase,
  removeDollarPurchase,
  syncDollarPurchasesWithSheets
} from '../../utils/dollarWalletStorage';
import { setupRequiredSheets } from '../../lib/googleSheets';

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
  const [editingPurchase, setEditingPurchase] = useState<DollarPurchase | null>(null);

  // Form State
  const [usdAmount, setUsdAmount] = useState<string>('');
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numUsd = parseFloat(usdAmount) || 0;
  const numRate = parseFloat(exchangeRate) || 0;
  const calculatedVes = numUsd * numRate;

  // Iniciar edición de una compra
  const handleStartEdit = (purchase: DollarPurchase) => {
    setEditingPurchase(purchase);
    setUsdAmount(purchase.usdAmount.toString());
    setExchangeRate(purchase.exchangeRate.toString());
    setDate(purchase.date || new Date().toISOString().slice(0, 10));
    setOriginAccount(
      [
        'Pago Móvil / Banco Mercantil',
        'Banesco Banco Universal',
        'Banco de Venezuela',
        'Banco Provincial',
        'Banco Nacional de Crédito (BNC)',
        'Caja Efectivo Bolívares'
      ].includes(purchase.originAccount)
        ? purchase.originAccount
        : 'Otro'
    );
    if (
      ![
        'Pago Móvil / Banco Mercantil',
        'Banesco Banco Universal',
        'Banco de Venezuela',
        'Banco Provincial',
        'Banco Nacional de Crédito (BNC)',
        'Caja Efectivo Bolívares'
      ].includes(purchase.originAccount)
    ) {
      setCustomOrigin(purchase.originAccount);
    }
    setDestinationWallet(
      [
        'Bóveda / Efectivo Divisas Pastoral',
        'Custodia USD Bancamiga',
        'Custodia USD Bancaribe',
        'Custodia USD Mercantil',
        'Zelle Reserva Arquidiócesis'
      ].includes(purchase.destinationWallet)
        ? purchase.destinationWallet
        : 'Otro'
    );
    if (
      ![
        'Bóveda / Efectivo Divisas Pastoral',
        'Custodia USD Bancamiga',
        'Custodia USD Bancaribe',
        'Custodia USD Mercantil',
        'Zelle Reserva Arquidiócesis'
      ].includes(purchase.destinationWallet)
    ) {
      setCustomDestination(purchase.destinationWallet);
    }
    setReference(purchase.reference || '');
    setNotes(purchase.notes || '');
    setActiveTab('create');
  };

  const handleCancelEdit = () => {
    setEditingPurchase(null);
    setUsdAmount('');
    setReference('');
    setNotes('');
  };

  // Guardar (Crear o Actualizar)
  const handleSubmitPurchase = async (e: React.FormEvent) => {
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

      if (editingPurchase) {
        // MODO EDICIÓN
        const updatedPurchase: DollarPurchase = {
          ...editingPurchase,
          date,
          usdAmount: numUsd,
          exchangeRate: numRate,
          vesAmount: calculatedVes,
          originAccount: finalOrigin,
          destinationWallet: finalDestination,
          reference: reference.trim() || editingPurchase.reference,
          operator: operatorName,
          notes: notes.trim()
        };

        const res = await updateStoredDollarPurchase(updatedPurchase);
        const updatedList = purchases.map((p) => (p.id === updatedPurchase.id ? updatedPurchase : p));
        onPurchasesChange(updatedList);

        if (onSuccessToast) {
          onSuccessToast(res.message || 'Compra de dólares actualizada y sincronizada en Google Sheets.');
        }

        handleCancelEdit();
        setActiveTab('history');
      } else {
        // MODO CREACIÓN
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
          const updated = [res.purchase, ...purchases.filter((p) => p.id !== res.purchase.id)];
          onPurchasesChange(updated);

          if (onSuccessToast) {
            onSuccessToast(res.message || 'Compra de dólares registrada y sincronizada en Google Sheets.');
          }

          setUsdAmount('');
          setReference('');
          setNotes('');
          setActiveTab('history');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la operación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar compra
  const handleDeletePurchase = (id: string, usd: number) => {
    if (confirm(`¿Estás seguro de anular la compra de $${usd.toFixed(2)} USD? Se revertirá en Google Sheets.`)) {
      const updated = removeDollarPurchase(id, operatorName);
      onPurchasesChange(updated);
      if (onSuccessToast) {
        onSuccessToast(`Compra ${id} eliminada de la Cartera y de Google Sheets.`);
      }
    }
  };

  // Sincronización en vivo con Google Sheets
  const handleSyncWithSheets = async () => {
    setIsSyncing(true);
    try {
      const syncResult = await syncDollarPurchasesWithSheets();
      if (syncResult.success) {
        onPurchasesChange(syncResult.data);
        if (onSuccessToast) {
          onSuccessToast(`¡${syncResult.data.length} compras sincronizadas directamente desde Google Sheets!`);
        }
      } else {
        if (onSuccessToast) {
          onSuccessToast('Datos locales cargados. Verifica conexión con Google Sheets.');
        }
      }
    } catch (err: any) {
      setErrorMsg(`Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Crear la hoja Cartera de Dólares si aún no existe en Google Sheets
  const handleCreateSheetInGoogle = async () => {
    setIsSyncing(true);
    try {
      const res = await setupRequiredSheets(operatorName);
      if (res.success) {
        if (onSuccessToast) {
          onSuccessToast('¡Orden de verificación y creación de la hoja enviada a Google Sheets!');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSyncing(false);
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
                Sincronización bidireccional directa con la hoja <strong>"Cartera de Dólares"</strong> en Google Sheets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSyncWithSheets}
              disabled={isSyncing}
              className="p-2 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-stone-200/80 bg-white shadow-2xs"
              title="Sincronizar compras desde Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Resumen Superior de Indicadores de Cartera */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3.5 bg-stone-100/70 border-b border-stone-200 shrink-0">
          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Cartera en Dólares</div>
            <div className="text-xl font-black text-emerald-700 font-mono tabular-nums tracking-tight">
              ${summary.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Total USD en resguardo</div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Bolívares Canjeados</div>
            <div className="text-lg font-black text-amber-800 font-mono tabular-nums tracking-tight">
              {summary.totalVesSpent.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Total Bs. convertidos</div>
          </div>

          <div className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-xs">
            <div className="text-[11px] font-semibold text-stone-500">Tasa Ponderada</div>
            <div className="text-lg font-black text-stone-900 font-mono tabular-nums tracking-tight">
              {summary.averageExchangeRate > 0 ? `${summary.averageExchangeRate.toFixed(2)} Bs/$` : 'N/A'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">Promedio de adquisición</div>
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
        <div className="flex items-center justify-between border-b border-stone-200 px-6 shrink-0 bg-white">
          <div className="flex">
            <button
              onClick={() => {
                if (editingPurchase) handleCancelEdit();
                setActiveTab('create');
              }}
              className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {editingPurchase ? (
                <>
                  <Edit2 className="w-4 h-4 text-amber-700" />
                  <span>Editando Compra ({editingPurchase.id})</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Registrar Compra de Dólares</span>
                </>
              )}
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
              <span>Historial ({purchases.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateSheetInGoogle}
            className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
            title="Crear pestaña 'Cartera de Dólares' en tu hoja de Google Sheets"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>Crear Hoja en Google Sheets</span>
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
            <form onSubmit={handleSubmitPurchase} className="space-y-5">
              {editingPurchase && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <span className="font-semibold">
                    Modificando la compra <strong className="font-mono">{editingPurchase.id}</strong>. Al guardar se
                    actualizará en Google Sheets.
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-stone-600 hover:text-stone-900 font-bold underline flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cancelar edición
                  </button>
                </div>
              )}

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
                        min="0.01"
                        step="any"
                        required
                        value={usdAmount}
                        onChange={(e) => setUsdAmount(e.target.value)}
                        placeholder="Ej. 150.00"
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
                        step="any"
                        required
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder="Ej. 44.80"
                        className="w-full px-3 py-2 text-base font-bold font-mono text-stone-900 bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <span className="absolute right-3 top-2.5 text-stone-400 text-xs font-bold">Bs/$</span>
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
                  placeholder="Ej. Cobertura cambiaria de fondos recibidos por Pago Móvil..."
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
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || numUsd <= 0 || numRate <= 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting
                    ? 'Sincronizando con Google Sheets...'
                    : editingPurchase
                    ? `Guardar Cambios ($${numUsd.toFixed(2)} USD)`
                    : `Confirmar y Comprar $${numUsd.toFixed(2)} USD`}
                </button>
              </div>
            </form>
          ) : (
            /* Pestaña: Historial de Compras */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">
                  Transacciones en Cartera de Dólares
                </span>
                <span className="text-xs text-stone-500">
                  {purchases.length} operaciones · Total:{' '}
                  <strong className="text-emerald-700 font-mono">
                    ${summary.totalUsdPurchased.toFixed(2)} USD
                  </strong>
                </span>
              </div>

              {purchases.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <Wallet className="w-12 h-12 text-stone-300 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-stone-700">No hay compras de dólares registradas todavía</p>
                    <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
                      Registra tu primera compra para blindar los bolívares recaudados contra la devaluación.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Registrar Primera Compra</span>
                  </button>
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
                          <th className="py-2.5 px-3 text-right">Acciones</th>
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
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleStartEdit(p)}
                                  className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                                  title="Editar esta compra"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePurchase(p.id, p.usdAmount)}
                                  className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Anular/eliminar esta compra de la Cartera y Google Sheets"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">
              Toda compra registrada, editada o eliminada se sincroniza con Google Sheets y con los reportes PDF.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 rounded-lg transition-colors shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
