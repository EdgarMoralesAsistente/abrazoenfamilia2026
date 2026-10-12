import React, { useState } from 'react';
import {
  X,
  TrendingDown,
  PlusCircle,
  History,
  FileSpreadsheet,
  FileText,
  Calendar,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
  Filter,
  DollarSign,
  Coins,
  ShieldCheck,
  Download
} from 'lucide-react';
import { CrmExpense } from '../../types/reservation';
import {
  recordNewExpense,
  updateStoredExpense,
  removeStoredExpense
} from '../../utils/expensesStorage';
import { CrmUser } from '../../types/auth';

interface CrmExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: CrmExpense[];
  onExpensesUpdated: (updated: CrmExpense[]) => void;
  onDownloadFinancialReport?: () => void;
  currentUser?: CrmUser;
  defaultRate?: number;
}

const CATEGORIES = [
  'Imprenta y Producción',
  'Logística y Envíos',
  'Materiales y Papelería',
  'Refrigerios y Encuentros',
  'Honorarios y Servicios',
  'Aporte Parroquial / Pastoral',
  'Comunicaciones y Diseño',
  'Otro'
];

const PAYMENT_METHODS = [
  'Pago Móvil / Banco Mercantil',
  'Banesco Banco Universal',
  'Banco de Venezuela',
  'Banco Provincial',
  'Caja Efectivo Bolívares',
  'Bóveda / Efectivo USD Divisas',
  'Zelle Arquidiócesis',
  'Custodia USD Bancamiga',
  'Transferencia Bancaria',
  'Otro'
];

export const CrmExpensesModal: React.FC<CrmExpensesModalProps> = ({
  isOpen,
  onClose,
  expenses,
  onExpensesUpdated,
  onDownloadFinancialReport,
  currentUser,
  defaultRate = 44.5
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [editingExpense, setEditingExpense] = useState<CrmExpense | null>(null);

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('Imprenta y Producción');
  const [customCategory, setCustomCategory] = useState('');
  const [currency, setCurrency] = useState<'VES' | 'USD'>('VES');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pago Móvil / Banco Mercantil');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  if (!isOpen) return null;

  // Totales
  let totalVES = 0;
  let totalUSD = 0;
  expenses.forEach((e) => {
    totalVES += Number(e.amountVES || 0);
    if (e.amountUSD) totalUSD += Number(e.amountUSD);
  });

  const handleEdit = (exp: CrmExpense) => {
    setEditingExpense(exp);
    setDate(exp.date || exp.timestamp.slice(0, 10));
    setConcept(exp.concept);
    setCategory(CATEGORIES.includes(exp.category) ? exp.category : 'Otro');
    if (!CATEGORIES.includes(exp.category)) setCustomCategory(exp.category);
    setCurrency(exp.currency || (exp.amountUSD && exp.amountUSD > 0 ? 'USD' : 'VES'));
    setAmountInput(exp.currency === 'USD' ? String(exp.amountUSD || '') : String(exp.amountVES || ''));
    setPaymentMethod(PAYMENT_METHODS.includes(exp.paymentMethod) ? exp.paymentMethod : 'Otro');
    if (!PAYMENT_METHODS.includes(exp.paymentMethod)) setCustomPaymentMethod(exp.paymentMethod);
    setBeneficiary(exp.beneficiary || '');
    setReference(exp.reference || '');
    setNotes(exp.notes || '');
    setActiveTab('create');
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setConcept('');
    setAmountInput('');
    setBeneficiary('');
    setReference('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amountInput) || 0;
    if (numAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'Por favor ingresa un monto válido mayor a 0.' });
      return;
    }

    if (!concept.trim()) {
      setStatusMessage({ type: 'error', text: 'Por favor describe el concepto del egreso.' });
      return;
    }

    const finalCategory = category === 'Otro' && customCategory.trim() ? customCategory.trim() : category;
    const finalMethod = paymentMethod === 'Otro' && customPaymentMethod.trim() ? customPaymentMethod.trim() : paymentMethod;
    const operator = currentUser?.name || 'Equipo Pastoral Familiar';

    let amountVES = 0;
    let amountUSD: number | undefined = undefined;

    if (currency === 'USD') {
      amountUSD = numAmount;
      amountVES = numAmount * defaultRate;
    } else {
      amountVES = numAmount;
      amountUSD = defaultRate > 0 ? Number((numAmount / defaultRate).toFixed(2)) : undefined;
    }

    if (editingExpense) {
      const updatedExpense: CrmExpense = {
        ...editingExpense,
        date,
        concept: concept.trim(),
        category: finalCategory,
        amountVES,
        amountUSD,
        currency,
        paymentMethod: finalMethod,
        beneficiary: beneficiary.trim(),
        reference: reference.trim(),
        operator,
        notes: notes.trim()
      };

      const res = await updateStoredExpense(updatedExpense);
      if (res.success) {
        const nextList = expenses.map((e) => (e.id === editingExpense.id ? updatedExpense : e));
        onExpensesUpdated(nextList);
        setStatusMessage({ type: 'success', text: `¡Salida ${updatedExpense.id} actualizada correctamente!` });
        handleCancelEdit();
      }
    } else {
      const res = await recordNewExpense({
        date,
        concept: concept.trim(),
        category: finalCategory,
        amountVES,
        amountUSD,
        currency,
        paymentMethod: finalMethod,
        beneficiary: beneficiary.trim(),
        reference: reference.trim(),
        operator,
        notes: notes.trim()
      });

      if (res.success) {
        const nextList = [res.expense, ...expenses];
        onExpensesUpdated(nextList);
        setStatusMessage({ type: 'success', text: res.message || 'Salida registrada con éxito.' });
        setConcept('');
        setAmountInput('');
        setBeneficiary('');
        setReference('');
        setNotes('');
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar o anular este egreso? Se actualizarán los saldos inmediatamente.')) {
      const updated = removeStoredExpense(id, currentUser?.name);
      onExpensesUpdated(updated);
      setStatusMessage({ type: 'success', text: 'Egreso eliminado correctamente.' });
    }
  };

  // Filtrado de historial
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.beneficiary && e.beneficiary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'TODAS' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-900 via-rose-800 to-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-rose-200 border border-white/10 shadow-xs">
              <TrendingDown className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Control de Salidas & Gastos de Tesorería
                </h2>
                <span className="text-[10px] font-bold bg-rose-500/30 text-rose-100 border border-rose-400/30 px-2 py-0.5 rounded-full">
                  Campaña 2026
                </span>
              </div>
              <p className="text-xs text-rose-200/80">
                Registro de pagos a imprenta, fletes, viáticos, refrigerios y sincronización en Google Sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadFinancialReport && (
              <button
                type="button"
                onClick={onDownloadFinancialReport}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-all shadow-xs"
                title="Descargar Reporte PDF de Entradas, Salidas y Saldo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Reporte Finanzas PDF</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen Superior de Salidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-4 bg-stone-50 border-b border-stone-200 shrink-0">
          <div className="p-3 rounded-2xl bg-white border border-rose-200 shadow-2xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Salidas en Bolívares
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono tabular-nums block mt-0.5">
              -Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-stone-500">Deducido del saldo neto en cuentas bancarias</span>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-rose-200 shadow-2xs">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Salidas en Dólares
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 font-mono tabular-nums block mt-0.5">
              ${totalUSD.toFixed(2)} USD
            </span>
            <span className="text-[10px] text-stone-500">Pagos realizados en efectivo divisa / Zelle</span>
          </div>

          <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Comprobantes Registrados
              </span>
              <span className="text-xl sm:text-2xl font-black text-stone-900 block mt-0.5">
                {expenses.length} egresos
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">Sincronizados con Google Sheets</span>
            </div>
            {onDownloadFinancialReport && (
              <button
                type="button"
                onClick={onDownloadFinancialReport}
                className="sm:hidden px-2.5 py-1.5 rounded-xl bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-stone-200 bg-stone-100/70 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'create'
                ? 'bg-white text-rose-900 border-stone-200 shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{editingExpense ? 'Modificar Salida' : 'Registrar Nueva Salida'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-1.5 border-t border-x ${
              activeTab === 'history'
                ? 'bg-white text-rose-900 border-stone-200 shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial de Egresos ({expenses.length})</span>
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {statusMessage && (
            <div
              className={`mb-4 p-3 rounded-2xl flex items-center justify-between text-xs font-medium border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Concepto */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Concepto / Descripción del Egreso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Pago a imprenta por 500 afiches, Encomienda a Caracas, Refrigerios para facilitadores..."
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 font-medium"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Categoría del Gasto *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 bg-white font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {category === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especificar otra categoría..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs"
                    />
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Fecha del Egreso *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 font-medium"
                  />
                </div>

                {/* Moneda y Monto */}
                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        Moneda del Gasto
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 bg-stone-200/70 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setCurrency('VES')}
                          className={`py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                            currency === 'VES'
                              ? 'bg-rose-700 text-white shadow-xs'
                              : 'text-stone-700 hover:text-stone-900'
                          }`}
                        >
                          Bolívares (Bs.)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrency('USD')}
                          className={`py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                            currency === 'USD'
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-stone-700 hover:text-stone-900'
                          }`}
                        >
                          Dólares ($ USD)
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-stone-800 mb-1">
                        Monto del Egreso ({currency === 'USD' ? '$ USD' : 'Bs. VES'}) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder={currency === 'USD' ? 'Ej: 150.00' : 'Ej: 6500.00'}
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-bold focus:outline-hidden focus:border-rose-600 bg-white"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">
                          {currency === 'USD' ? '$' : 'Bs'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cálculo referencial */}
                  {parseFloat(amountInput) > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-between text-xs text-stone-600 font-medium">
                      <span>Equivalente estimado (tasa {defaultRate.toFixed(2)} Bs/$):</span>
                      <span className="font-bold font-mono text-stone-900">
                        {currency === 'USD'
                          ? `Bs. ${(parseFloat(amountInput) * defaultRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `$${(parseFloat(amountInput) / defaultRate).toFixed(2)} USD`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Método / Cuenta de Pago */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Método / Cuenta de Origen *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 bg-white font-medium"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {paymentMethod === 'Otro' && (
                    <input
                      type="text"
                      placeholder="Especificar cuenta o método..."
                      value={customPaymentMethod}
                      onChange={(e) => setCustomPaymentMethod(e.target.value)}
                      className="mt-2 w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs"
                    />
                  )}
                </div>

                {/* Beneficiario / Proveedor */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Beneficiario / Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Imprenta Servigráfica, MRW, Conductor transporte..."
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 font-medium"
                  />
                </div>

                {/* Referencia */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nro. de Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 984512, Factura 0014, Recibo Caja #12"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 font-mono"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Notas y Observaciones
                  </label>
                  <input
                    type="text"
                    placeholder="Observaciones adicionales para la conciliación..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600 font-medium"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                {editingExpense ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 text-xs font-bold hover:bg-stone-50"
                  >
                    Cancelar Edición
                  </button>
                ) : (
                  <div className="text-[11px] text-stone-500 italic">
                    El egreso se restará automáticamente de la disponibilidad en Bolívares.
                  </div>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingExpense ? 'Guardar Cambios' : 'Confirmar y Registrar Salida'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Buscador y filtro */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por concepto, categoría, proveedor o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-rose-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white font-medium focus:outline-hidden"
                  >
                    <option value="TODAS">Todas las categorías</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {onDownloadFinancialReport && (
                    <button
                      type="button"
                      onClick={onDownloadFinancialReport}
                      className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de Historial */}
              {filteredExpenses.length === 0 ? (
                <div className="p-8 text-center text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <TrendingDown className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  <p className="text-xs font-semibold">No se encontraron egresos con los criterios especificados.</p>
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-600 uppercase text-[10px] font-extrabold border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-3">Fecha / ID</th>
                        <th className="py-2.5 px-3">Concepto & Categoría</th>
                        <th className="py-2.5 px-3">Beneficiario & Método</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono">
                            <span className="block font-bold text-stone-900">{exp.date}</span>
                            <span className="text-[10px] text-stone-400">{exp.id}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="block font-bold text-stone-900">{exp.concept}</span>
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-stone-600">
                            <span className="block font-semibold text-stone-800">
                              {exp.beneficiary || 'No especificado'}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              {exp.paymentMethod} {exp.reference ? `· Ref: ${exp.reference}` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            {exp.currency === 'USD' || (exp.amountUSD && exp.amountUSD > 0) ? (
                              <div>
                                <span className="text-emerald-800 text-xs block">
                                  ${(exp.amountUSD || 0).toFixed(2)} USD
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  ≈ Bs. {exp.amountVES.toLocaleString('es-VE')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-700 text-xs block">
                                -Bs. {exp.amountVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(exp)}
                                className="p-1 rounded-lg hover:bg-stone-200 text-stone-600"
                                title="Editar egreso"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(exp.id)}
                                className="p-1 rounded-lg hover:bg-rose-100 text-rose-600"
                                title="Eliminar egreso"
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
