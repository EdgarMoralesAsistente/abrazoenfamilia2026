import React from 'react';
import { ShoppingCart, Euro, Package, Clock, Truck, CheckCircle2 } from 'lucide-react';
import { CrmKPIs } from '../../types/reservation';

interface CrmKpiCardsProps {
  kpis: CrmKPIs;
}

export const CrmKpiCards: React.FC<CrmKpiCardsProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* KPI 1: Total Reservas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-600 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Total Reservas</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-black text-stone-900 block tracking-tight">
            {kpis.totalReservas}
          </span>
          <span className="text-[11px] text-stone-700 font-medium">
            Solicitudes registradas
          </span>
        </div>
      </div>

      {/* KPI 2: Total Recaudado */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-600 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Monto Total (€)</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
            <Euro className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-800 block tracking-tight">
            {kpis.totalMontoEUR.toFixed(2)} €
          </span>
          <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
            <span className="text-emerald-800 font-bold inline-flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              {kpis.totalMontoRecaudadoEUR.toFixed(2)} € pagado
            </span>
          </div>
        </div>
      </div>

      {/* KPI 3: Total Piezas */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-600 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Total Piezas</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-black text-stone-900 block tracking-tight">
            {kpis.totalPiezas}
          </span>
          <span className="text-[11px] text-stone-700 font-medium truncate block">
            {kpis.totalKits} kits · {kpis.totalAfiches} af · {kpis.totalGuias} g · {kpis.totalHojas} h
          </span>
        </div>
      </div>

      {/* KPI 4: Pagos Pendientes */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-600 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Pagos Pendientes</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-black text-amber-800 block tracking-tight">
            {kpis.reservasPendientesPago}
          </span>
          <span className="text-[11px] text-stone-700 font-medium">
            Por cobrar: {kpis.montoPendientePagoEUR.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* KPI 5: Entregas Pendientes */}
      <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-stone-600 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Por Entregar</span>
          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-2xl sm:text-3xl font-black text-stone-900 block tracking-tight">
            {kpis.entregasPendientes}
          </span>
          <span className="text-[11px] text-stone-700 font-medium">
            En Caracas o por despachar
          </span>
        </div>
      </div>
    </div>
  );
};
