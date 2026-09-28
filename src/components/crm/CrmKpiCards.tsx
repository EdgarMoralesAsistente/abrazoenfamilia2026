import React from 'react';
import { ShoppingCart, Euro, Package, Clock, Truck, CheckCircle2, DollarSign, ArrowUpRight } from 'lucide-react';
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
    totalUsdPurchased: 550,
    totalVesSpent: 24460,
    averageExchangeRate: 44.47,
    lastExchangeRate: 44.80,
    purchaseCount: 2,
    totalVesCollectedEstimated: 35000,
    availableVesBalance: 10540
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 min-w-0">
      {/* KPI 1: Total Reservas con Barra de Progreso de Pagadas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
        <div className="flex items-center justify-between text-stone-600">
          <span className="text-xs font-bold uppercase tracking-wider">Total Reservas</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
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
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
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

      {/* KPI 3: CARTERA DE DÓLARES & COBERTURA CAMBIARIA (NUEVO REQUERIMIENTO) */}
      <div className="bg-gradient-to-b from-white to-emerald-50/30 border border-emerald-200/90 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
        <div className="flex items-center justify-between text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Cartera USD</span>
            <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded-sm uppercase">
              Anti-deval.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDollarWallet}
            className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-xs"
            title="Abrir Cartera de Dólares y Registrar Compra"
          >
            <DollarSign className="w-4 h-4" />
          </button>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight tabular-nums">
              ${wallet.totalUsdPurchased.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {onOpenDollarWallet && (
              <button
                type="button"
                onClick={onOpenDollarWallet}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 underline underline-offset-2"
              >
                + Comprar
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="mt-2 pt-1.5 border-t border-emerald-100/80 space-y-0.5 text-[11px] text-stone-600">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Restado en Bs:</span>
              <span className="font-bold text-amber-900 font-mono tabular-nums">
                -{wallet.totalVesSpent.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs.
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Tasa promedio:</span>
              <span className="font-semibold text-stone-800 font-mono tabular-nums">
                {wallet.averageExchangeRate.toFixed(2)} Bs/$
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4: Total Piezas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
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

      {/* KPI 5: Pagos Pendientes */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
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

      {/* KPI 6: Logística y Entregas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3 min-w-0">
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
  );
};
