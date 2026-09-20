import React from 'react';
import { ShoppingCart, Euro, Package, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { CrmKPIs } from '../../types/reservation';

interface CrmKpiCardsProps {
  kpis: CrmKPIs;
}

export const CrmKpiCards: React.FC<CrmKpiCardsProps> = ({ kpis }) => {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* KPI 1: Total Reservas con Barra de Progreso de Pagadas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3">
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
              <span>{kpis.reservasPendientesPago} pendientes</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 2: Monto Total (€) con Barra de Progreso vs Monto Pagado */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between text-stone-600">
          <span className="text-xs font-bold uppercase tracking-wider">Monto Total (€)</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <Euro className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {kpis.totalMontoEUR.toFixed(2)} €
            </span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
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
            <div className="flex items-center justify-between text-[11px] text-stone-600 mt-1 font-medium">
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
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between text-stone-600">
          <span className="text-xs font-bold uppercase tracking-wider">Total Piezas</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
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
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between text-stone-600">
          <span className="text-xs font-bold uppercase tracking-wider">Pagos Pendientes</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
              {kpis.reservasPendientesPago}
            </span>
            {kpis.reservasVerificando > 0 && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                {kpis.reservasVerificando} por conciliar
              </span>
            )}
          </div>
          <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-600">
            <span>Por cobrar:</span>
            <span className="font-bold text-amber-900">{kpis.montoPendientePagoEUR.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* KPI 5: Logística y Entregas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between text-stone-600">
          <span className="text-xs font-bold uppercase tracking-wider">Por Entregar</span>
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {kpis.entregasPendientes}
            </span>
            <span className="text-xs font-extrabold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
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
            <div className="flex items-center justify-between text-[11px] text-stone-600 mt-1 font-medium">
              <span>{kpis.entregasCompletadas} en destino</span>
              <span>{kpis.entregasPendientes} en Caracas/ruta</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

