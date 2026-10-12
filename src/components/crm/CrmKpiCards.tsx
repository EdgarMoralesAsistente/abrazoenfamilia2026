import React from 'react';
import {
  ShoppingCart,
  Euro,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Coins,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Layers,
  Download,
  FileText,
  Landmark,
  Wallet
} from 'lucide-react';
import { CrmKPIs } from '../../types/reservation';

interface CrmKpiCardsProps {
  kpis: CrmKPIs;
  onOpenDollarWallet?: () => void;
  onOpenExpenses?: () => void;
  onDownloadFinancialReport?: () => void;
}

export const CrmKpiCards: React.FC<CrmKpiCardsProps> = ({
  kpis,
  onOpenDollarWallet,
  onOpenExpenses,
  onDownloadFinancialReport
}) => {
  // Porcentaje de reservaciones pagadas
  const pctReservasPagadas =
    kpis.totalReservas > 0
      ? Math.round((kpis.reservasPagadas / kpis.totalReservas) * 100)
      : 0;

  // Porcentaje del monto recaudado
  const pctMontoRecaudadoNum =
    kpis.totalMontoEUR > 0
      ? (kpis.totalMontoRecaudadoEUR / kpis.totalMontoEUR) * 100
      : 0;
  const pctMontoRecaudado = pctMontoRecaudadoNum.toFixed(1);

  // Porcentaje de logística/entregas
  const pctEntregas =
    kpis.totalReservas > 0
      ? Math.round((kpis.entregasCompletadas / kpis.totalReservas) * 100)
      : 0;

  const wallet = kpis.walletSummary || {
    totalUsdPurchased: 0,
    totalVesSpent: 0,
    averageExchangeRate: 0,
    lastExchangeRate: 44.5,
    purchaseCount: 0,
    totalVesCollectedEstimated: 0,
    availableVesBalance: 0,
    walletBreakdown: [],
    totalExpensesVES: 0,
    totalExpensesUSD: 0
  };

  const expensesSummary = kpis.expensesSummary || {
    totalExpensesVES: wallet.totalExpensesVES || 0,
    totalExpensesUSD: wallet.totalExpensesUSD || 0,
    expenseCount: 0
  };

  const totalExpensesVES = expensesSummary.totalExpensesVES || wallet.totalExpensesVES || 0;
  const totalExpensesUSD = expensesSummary.totalExpensesUSD || wallet.totalExpensesUSD || 0;

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* FILA 1: MÉTRICAS OPERATIVAS & CAMPAÑA (5 TARJETAS) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 min-w-0">
        {/* KPI 1: Total Reservas con Barra de Progreso de Pagadas */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
          <div className="flex items-center justify-between text-stone-600">
            <span className="text-xs font-bold uppercase tracking-wider">Total Reservas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {kpis.totalReservas}
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                {pctReservasPagadas}% pagadas
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="mt-2.5">
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pctReservasPagadas, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-600 mt-1 font-medium">
                <span>{kpis.reservasPagadas} pagadas</span>
                <span>{kpis.reservasPendientesPago} pend.</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Monto Total (€) con Barra de Progreso vs Monto Pagado */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
          <div className="flex items-center justify-between text-stone-600">
            <span className="text-xs font-bold uppercase tracking-wider">Monto Total (€)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Euro className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {kpis.totalMontoEUR.toFixed(2)} €
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 whitespace-nowrap">
                {pctMontoRecaudado}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="mt-2.5">
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pctMontoRecaudadoNum, 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-600 mt-1 font-medium">
                <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {kpis.totalMontoRecaudadoEUR.toFixed(2)} €
                </span>
                <span>Por cobrar: {kpis.montoPendientePagoEUR.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Piezas */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
          <div className="flex items-center justify-between text-stone-600">
            <span className="text-xs font-bold uppercase tracking-wider">Total Piezas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>

          <div>
            <span className="text-2xl sm:text-3xl font-black text-stone-900 block tracking-tight">
              {kpis.totalPiezas}
            </span>
            <div className="mt-2 pt-1.5 border-t border-stone-100 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-stone-600">
              <span><strong>{kpis.totalKits}</strong> Kits</span>
              <span><strong>{kpis.totalAfiches}</strong> Afiches</span>
              <span><strong>{kpis.totalGuias}</strong> Guías</span>
              <span><strong>{kpis.totalHojas}</strong> Hojas</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pagos Pendientes */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
          <div className="flex items-center justify-between text-stone-600">
            <span className="text-xs font-bold uppercase tracking-wider">Pagos Pendientes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {kpis.reservasPendientesPago}
              </span>
              {kpis.reservasVerificando > 0 && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 whitespace-nowrap">
                  {kpis.reservasVerificando} por conciliar
                </span>
              )}
            </div>
            <div className="mt-2 pt-1.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-600">
              <span>Por cobrar:</span>
              <span className="font-bold text-amber-900">{kpis.montoPendientePagoEUR.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Logística y Entregas */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
          <div className="flex items-center justify-between text-stone-600">
            <span className="text-xs font-bold uppercase tracking-wider">Por Entregar</span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {kpis.entregasPendientes}
              </span>
              <span className="text-xs font-extrabold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {pctEntregas}% entregadas
              </span>
            </div>

            <div className="mt-2.5">
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-stone-700 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pctEntregas, 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-stone-600 mt-1 font-medium">
                <span>{kpis.entregasCompletadas} en destino</span>
                <span>{kpis.entregasPendientes} en Caracas/ruta</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILA 2: DISPONIBILIDAD FINANCIERA & TESORERÍA (4 TARJETAS)     */}
      {/* 1. Entradas | 2. Salidas | 3. Disp. Bolívares | 4. Disp. Dólares*/}
      {/* ============================================================== */}
      <div className="bg-stone-50/80 border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-700" />
              Tesorería: Entradas, Salidas & Disponibilidad
            </span>
            <span className="text-[10px] font-bold text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-full">
              Flujo de Caja Consolidado
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {onDownloadFinancialReport && (
              <button
                type="button"
                onClick={onDownloadFinancialReport}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-900 hover:bg-black text-white text-[11px] font-bold shadow-xs transition-all"
                title="Descargar Reporte de Finanzas: Entradas, Salidas y Saldo en PDF"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Descargar Reporte PDF</span>
              </button>
            )}

            <div className="text-[11px] text-stone-600 hidden md:flex items-center gap-1.5">
              <span>Tasa referencial:</span>
              <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                {wallet.lastExchangeRate > 0 ? wallet.lastExchangeRate.toFixed(2) : '44.50'} Bs/$
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* ------------------------------------------------------------ */}
          {/* TARJETA 1 (AL PRINCIPIO): ENTRADAS (RESERVAS PAGADAS)         */}
          {/* ------------------------------------------------------------ */}
          <div className="bg-gradient-to-br from-white via-white to-emerald-50/40 border border-emerald-300 rounded-xl p-3.5 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                      Entradas
                    </span>
                    <span className="text-[10px] font-semibold text-stone-500">
                      Reservaciones Pagadas
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">
                  Ingresos
                </span>
              </div>

              {/* Monto Principal de Entradas */}
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono tracking-tight tabular-nums block">
                  +Bs. {wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                  ≈ {kpis.totalMontoRecaudadoEUR.toFixed(2)} € recaudados
                </span>
              </div>

              {/* Detalle de reservas pagadas */}
              <div className="mt-2.5 pt-2 border-t border-emerald-100/80 space-y-1 text-xs">
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>Cobros conciliados:</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    {kpis.reservasPagadas} de {kpis.totalReservas} reservas
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>Por cobrar aún:</span>
                  <span className="font-semibold text-amber-800 font-mono">
                    {kpis.montoPendientePagoEUR.toFixed(2)} € ({kpis.reservasPendientesPago} pend.)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-emerald-100/70 text-[10px] text-stone-500 italic">
              Consolidación de entradas de dinero por reservaciones pagadas.
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* TARJETA 2: SALIDAS (GASTOS OPERATIVOS)                        */}
          {/* ------------------------------------------------------------ */}
          <div className="bg-gradient-to-br from-white via-white to-rose-50/40 border border-rose-300 rounded-xl p-3.5 shadow-2xs hover:border-rose-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-rose-950 block">
                      Salidas
                    </span>
                    <span className="text-[10px] font-semibold text-stone-500">
                      Gastos & Pagos Operativos
                    </span>
                  </div>
                </div>
                {onOpenExpenses && (
                  <button
                    type="button"
                    onClick={onOpenExpenses}
                    className="text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded-lg border border-rose-300 transition-colors"
                    title="Registrar o ver salidas"
                  >
                    + Registrar
                  </button>
                )}
              </div>

              {/* Monto Principal de Salidas */}
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono tracking-tight tabular-nums block">
                  -Bs. {totalExpensesVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {totalExpensesUSD > 0 && (
                  <span className="text-xs font-bold text-rose-800 block mt-0.5">
                    + ${totalExpensesUSD.toFixed(2)} USD en divisa
                  </span>
                )}
              </div>

              {/* Detalle de egresos */}
              <div className="mt-2.5 pt-2 border-t border-rose-100/80 space-y-1 text-xs">
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>Comprobantes de egreso:</span>
                  <span className="font-bold text-rose-900 font-mono">
                    {expensesSummary.expenseCount} egresos
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>Conceptos principales:</span>
                  <span className="text-stone-700 truncate max-w-[120px]">
                    Imprenta, fletes, viáticos
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-rose-100/70 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 italic">
                Sumatoria de todas las salidas.
              </span>
              {onOpenExpenses && (
                <button
                  type="button"
                  onClick={onOpenExpenses}
                  className="font-bold text-rose-700 hover:text-rose-900 underline underline-offset-2"
                >
                  Ver historial
                </button>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* TARJETA 3: DISPONIBILIDAD EN BOLÍVARES (DESPUÉS DE SALIDAS)   */}
          {/* ------------------------------------------------------------ */}
          <div className="bg-gradient-to-br from-white via-white to-amber-50/30 border border-amber-300 rounded-xl p-3.5 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-950 block">
                      Disponibilidad Bs.
                    </span>
                    <span className="text-[10px] font-semibold text-stone-500">
                      Saldo Neto en Cuentas / Caja
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                  Saldo Neto
                </span>
              </div>

              {/* Monto Principal en Bolívares */}
              <div className="my-2">
                <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight tabular-nums block ${wallet.availableVesBalance < 0 ? 'text-rose-700' : 'text-stone-900'}`}>
                  Bs. {wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Desglose de la Fórmula del Usuario */}
              <div className="mt-2.5 pt-2 border-t border-amber-100/80 space-y-1 text-xs">
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>(+) Entradas de cobros:</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    +Bs. {wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>(-) Salidas operativas:</span>
                  <span className="font-bold text-rose-700 font-mono">
                    -Bs. {totalExpensesVES.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-stone-600 font-medium text-[11px]">
                  <span>(-) Canjeado a USD:</span>
                  <span className="font-bold text-amber-900 font-mono">
                    -Bs. {wallet.totalVesSpent.toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-amber-100/70 text-[10px] text-stone-500 italic">
              Entradas menos salidas y bolívares usados en compra de dólares.
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* TARJETA 4: DISPONIBILIDAD EN DÓLARES CON DISCRIMINACIÓN      */}
          {/* ------------------------------------------------------------ */}
          <div className="bg-gradient-to-br from-white via-white to-emerald-50/50 border border-emerald-400 rounded-xl p-3.5 shadow-2xs hover:border-emerald-500 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-950 block">
                      Disponibilidad USD
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700">
                      Cartera USD Protegida
                    </span>
                  </div>
                </div>
                {onOpenDollarWallet && (
                  <button
                    type="button"
                    onClick={onOpenDollarWallet}
                    className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg border border-emerald-300 transition-colors"
                    title="Registrar o ver compras de dólares"
                  >
                    + Comprar
                  </button>
                )}
              </div>

              {/* Monto Principal Más Importante en Dólares */}
              <div className="my-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight tabular-nums block">
                  ${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>

              {/* DISCRIMINACIÓN DE CARTERA (DÓNDE ESTÁN ESOS DÓLARES) */}
              <div className="mt-2.5 pt-2 border-t border-emerald-100/90 space-y-1.5 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                  Discriminación por Cartera:
                </span>

                {wallet.walletBreakdown && wallet.walletBreakdown.length > 0 ? (
                  <div className="space-y-1">
                    {wallet.walletBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] bg-white/80 px-2 py-1 rounded-md border border-emerald-100"
                      >
                        <span className="text-stone-700 font-medium truncate max-w-[130px] flex items-center gap-1" title={item.wallet}>
                          <Landmark className="w-3 h-3 text-emerald-700 shrink-0" />
                          {item.wallet}
                        </span>
                        <span className="font-bold text-emerald-900 font-mono tabular-nums shrink-0">
                          ${item.amountUSD.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-500 bg-white/70 px-2 py-1 rounded-md border border-stone-200 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Landmark className="w-3 h-3 text-emerald-700" />
                      Bóveda / Efectivo Pastoral:
                    </span>
                    <span className="font-bold font-mono text-emerald-800">
                      ${wallet.totalUsdPurchased.toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-emerald-100/70 flex items-center justify-between text-[10px]">
              <span className="text-stone-500 italic">
                {wallet.purchaseCount} {wallet.purchaseCount === 1 ? 'compra' : 'compras'} registradas.
              </span>
              {onOpenDollarWallet && (
                <button
                  type="button"
                  onClick={onOpenDollarWallet}
                  className="font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-0.5"
                >
                  Historial
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
