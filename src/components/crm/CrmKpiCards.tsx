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
  Layers
} from 'lucide-react';
import { CrmKPIs } from '../../types/reservation';

interface CrmKpiCardsProps {
  kpis: CrmKPIs;
  onOpenDollarWallet?: () => void;
}

export const CrmKpiCards: React.FC<CrmKpiCardsProps> = ({ kpis, onOpenDollarWallet }) => {
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
    lastExchangeRate: 44.50,
    purchaseCount: 0,
    totalVesCollectedEstimated: 0,
    availableVesBalance: 0
  };

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

            {/* Barra de progreso: Total hechas vs Pagadas */}
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

            {/* Barra de progreso: Monto Total vs Monto Pagado */}
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
      {/* FILA 2: DISPONIBILIDAD FINANCIERA (BOLÍVARES & DÓLARES) */}
      {/* ============================================================== */}
      <div className="bg-stone-50/80 border border-stone-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-700" />
              Disponibilidad Financiera & Tesorería
            </span>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full">
              Fila de Liquidez Inmediata
            </span>
          </div>

          <div className="text-[11px] text-stone-600 flex items-center gap-2">
            <span>Tasa de referencia / última compra:</span>
            <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
              {wallet.lastExchangeRate > 0 ? wallet.lastExchangeRate.toFixed(2) : '44.50'} Bs/$
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* TARJETA 1 DE LA SEGUNDA FILA: DISPONIBILIDAD EN BOLÍVARES */}
          <div className="bg-gradient-to-br from-white via-white to-amber-50/30 border border-amber-200/80 rounded-xl p-4 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0">
                    <Coins className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 block">
                      Disponibilidad en Bolívares
                    </span>
                    <span className="text-[10px] font-semibold text-stone-600">
                      Cuentas bancarias / Pago Móvil / Efectivo Bs.
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                  Saldo Neto Disponible
                </span>
              </div>

              {/* Monto Principal en Bolívares */}
              <div className="my-2">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 font-mono tracking-tight tabular-nums block">
                  Bs. {wallet.availableVesBalance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Desglose de la Fórmula del Usuario */}
              <div className="mt-3 pt-2.5 border-t border-amber-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-emerald-700 font-bold">(+)</span>
                    Total reservas cobradas:
                  </span>
                  <span className="font-bold text-emerald-800 font-mono tabular-nums">
                    +Bs. {wallet.totalVesCollectedEstimated.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="text-amber-800 font-bold">(-)</span>
                    Usado para comprar dólares:
                  </span>
                  <span className="font-bold text-amber-900 font-mono tabular-nums">
                    -Bs. {wallet.totalVesSpent.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
              <span className="text-stone-500 italic">
                Reservas cobradas menos Bs. usados para resguardar divisas.
              </span>
              <span className="font-semibold text-stone-700">
                {kpis.reservasPagadas} cobros conciliados
              </span>
            </div>
          </div>

          {/* TARJETA 2 DE LA SEGUNDA FILA: DISPONIBILIDAD EN DÓLARES (CARTERA USD) */}
          <div className="bg-gradient-to-br from-white via-white to-emerald-50/40 border border-emerald-300 rounded-xl p-4 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <DollarSign className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 block">
                      Disponibilidad en Dólares
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700">
                      Cartera USD · Resguardo Anti-Devaluación
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-700" />
                    Protección Cambiaria
                  </span>
                </div>
              </div>

              {/* Monto Principal en Dólares */}
              <div className="my-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-800 font-mono tracking-tight tabular-nums block">
                  ${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>

                {onOpenDollarWallet && (
                  <button
                    type="button"
                    onClick={onOpenDollarWallet}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                    title="Registrar o editar compra de dólares para proteger fondos"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>+ Registrar Compra</span>
                  </button>
                )}
              </div>

              {/* Desglose de Métricas de la Cartera */}
              <div className="mt-3 pt-2.5 border-t border-emerald-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span>Sumatoria de compras registradas:</span>
                  <span className="font-bold text-stone-900 font-mono tabular-nums">
                    {wallet.purchaseCount} {wallet.purchaseCount === 1 ? 'operación' : 'operaciones'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-stone-600 font-medium">
                  <span>Tasa promedio ponderada:</span>
                  <span className="font-bold text-emerald-800 font-mono tabular-nums">
                    {wallet.averageExchangeRate > 0 ? wallet.averageExchangeRate.toFixed(2) : '0.00'} Bs/$
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-emerald-100/70 flex items-center justify-between text-[11px] text-stone-600">
              <span className="text-stone-500 italic">
                Sumatoria acumulada de compras de divisas registradas.
              </span>
              <button
                type="button"
                onClick={onOpenDollarWallet}
                className="font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-0.5"
              >
                Ver historial / hoja
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
