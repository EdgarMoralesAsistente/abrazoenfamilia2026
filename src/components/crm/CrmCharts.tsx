import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
  CartesianGrid
} from 'recharts';
import {
  Church,
  School,
  Package,
  Euro,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { CrmReservation } from '../../types/reservation';

interface CrmChartsProps {
  reservations: CrmReservation[];
}

const PAYMENT_COLORS: Record<string, string> = {
  Pagado: '#059669', // Emerald 600
  Pendiente: '#d97706', // Amber 600
  Verificando: '#2563eb' // Blue 600
};

const DELIVERY_COLORS: Record<string, string> = {
  'Por Imprimir / En Caracas': '#d97706', // Amber 600
  Enviado: '#2563eb', // Blue 600
  Entregado: '#059669' // Emerald 600
};

export const CrmCharts: React.FC<CrmChartsProps> = ({ reservations }) => {
  // Selector de métrica para la comparativa Parroquias vs Colegios
  const [comparativeMetric, setComparativeMetric] = useState<'reservas' | 'piezas' | 'monto'>('reservas');

  // 1. Datos para Gráfico de Materiales Solicitados
  let totalKits = 0;
  let totalAfiches = 0;
  let totalGuias = 0;
  let totalHojas = 0;

  // 2. Comparativa Parroquias vs Colegios
  let parroquiasCount = 0;
  let colegiosCount = 0;
  let parroquiasPiezas = 0;
  let colegiosPiezas = 0;
  let parroquiasMonto = 0;
  let colegiosMonto = 0;
  let parroquiasKits = 0;
  let colegiosKits = 0;
  let parroquiasPagadas = 0;
  let colegiosPagadas = 0;

  // 3. Estado de Pago y Montos
  const paymentCounts: Record<string, { count: number; monto: number }> = {
    Pagado: { count: 0, monto: 0 },
    Pendiente: { count: 0, monto: 0 },
    Verificando: { count: 0, monto: 0 }
  };

  // 4. Estado de Entregas
  const deliveryCounts: Record<string, number> = {
    'Por Imprimir / En Caracas': 0,
    Enviado: 0,
    Entregado: 0
  };

  // 5. Ranking de Instituciones con Mayor Volumen
  const institutionVolumes: Record<string, { name: string; type: string; piezas: number; monto: number; kits: number }> = {};

  reservations.forEach((r) => {
    const kits = Number(r.kitQuantity || 0);
    const afiches = Number(r.aficheQuantity || 0);
    const guias = Number(r.guiaQuantity || 0);
    const hojas = Number(r.hojaQuantity || 0);
    const piezas = Number(r.totalQuantity || (kits + afiches + guias + hojas));
    const eur = Number(r.totalEUR || 0);

    totalKits += kits;
    totalAfiches += afiches;
    totalGuias += guias;
    totalHojas += hojas;

    // Institución
    const isParroquia = r.institutionType === 'Parroquia';
    if (isParroquia) {
      parroquiasCount += 1;
      parroquiasPiezas += piezas;
      parroquiasMonto += eur;
      parroquiasKits += kits;
      if (r.paymentStatus === 'Pagado') parroquiasPagadas += 1;
    } else {
      colegiosCount += 1;
      colegiosPiezas += piezas;
      colegiosMonto += eur;
      colegiosKits += kits;
      if (r.paymentStatus === 'Pagado') colegiosPagadas += 1;
    }

    // Pagos
    const pStatus = r.paymentStatus || 'Pendiente';
    if (paymentCounts[pStatus]) {
      paymentCounts[pStatus].count += 1;
      paymentCounts[pStatus].monto += eur;
    } else {
      paymentCounts['Pendiente'].count += 1;
      paymentCounts['Pendiente'].monto += eur;
    }

    // Entregas
    const dStatus = r.deliveryStatus || 'Por Imprimir / En Caracas';
    if (deliveryCounts[dStatus] !== undefined) {
      deliveryCounts[dStatus] += 1;
    } else {
      deliveryCounts['Por Imprimir / En Caracas'] += 1;
    }

    // Acumulador de ranking
    const instKey = r.institutionName.trim();
    if (instKey) {
      if (!institutionVolumes[instKey]) {
        institutionVolumes[instKey] = {
          name: instKey,
          type: r.institutionType,
          piezas: 0,
          monto: 0,
          kits: 0
        };
      }
      institutionVolumes[instKey].piezas += piezas;
      institutionVolumes[instKey].monto += eur;
      institutionVolumes[instKey].kits += kits;
    }
  });

  const totalPiezasMateriales = totalKits + totalAfiches + totalGuias + totalHojas;

  // Datos para gráfico de barras de Materiales con etiquetas en las barras
  const materialsData = [
    { name: 'Kits Completos', cantidad: totalKits, color: '#92400e' },
    { name: 'Afiches Oficiales', cantidad: totalAfiches, color: '#d97706' },
    { name: 'Guías Facilitador', cantidad: totalGuias, color: '#0284c7' },
    { name: 'Hojas del Niño', cantidad: totalHojas, color: '#16a34a' }
  ];

  // Datos para el gráfico comparativo Parroquias vs Colegios
  const comparativeData = [
    {
      categoria: 'Parroquias',
      reservas: parroquiasCount,
      piezas: parroquiasPiezas,
      monto: Number(parroquiasMonto.toFixed(2)),
      kits: parroquiasKits,
      fill: '#92400e'
    },
    {
      categoria: 'Colegios',
      reservas: colegiosCount,
      piezas: colegiosPiezas,
      monto: Number(colegiosMonto.toFixed(2)),
      kits: colegiosKits,
      fill: '#0284c7'
    }
  ];

  // Datos para Donut de Pagos
  const paymentData = Object.keys(paymentCounts).map((key) => ({
    name: key,
    value: paymentCounts[key].count,
    monto: paymentCounts[key].monto,
    color: PAYMENT_COLORS[key] || '#78716c'
  }));

  // Datos para Donut de Entregas
  const deliveryData = Object.keys(deliveryCounts).map((key) => ({
    name: key,
    value: deliveryCounts[key],
    color: DELIVERY_COLORS[key] || '#78716c'
  }));

  // Top 4 instituciones con mayor volumen de piezas
  const topInstitutions = Object.values(institutionVolumes)
    .sort((a, b) => b.piezas - a.piezas)
    .slice(0, 4);

  // Porcentajes Parroquias vs Colegios
  const totalInst = parroquiasCount + colegiosCount;
  const pctParroquias = totalInst > 0 ? Math.round((parroquiasCount / totalInst) * 100) : 0;
  const pctColegios = totalInst > 0 ? Math.round((colegiosCount / totalInst) * 100) : 0;

  // Alertas para Toma de Decisiones
  const pedidosPagadosSinEntregar = reservations.filter(
    (r) => r.paymentStatus === 'Pagado' && r.deliveryStatus !== 'Entregado'
  ).length;

  const pagosPorVerificar = paymentCounts['Verificando'].count;
  const montoPorVerificar = paymentCounts['Verificando'].monto;

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* FILA 1: MATERIALES SOLICITADOS (CON ETIQUETAS) + COMPARATIVA PARROQUIAS/COLEGIOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* GRÁFICO 1: Materiales Solicitados para Caracas con cantidad visible en las barras */}
        <div className="lg:col-span-7 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-800" />
                <span>Materiales Solicitados para Caracas</span>
              </h4>
              <p className="text-xs text-stone-600">
                Cantidades exactas requeridas para orden de imprenta y despacho ({totalPiezasMateriales} piezas totales)
              </p>
            </div>
            <span className="text-[11px] font-extrabold text-amber-900 bg-amber-50 border border-amber-200/70 px-2.5 py-1 rounded-full shrink-0 w-fit">
              {totalKits} Kits en producción
            </span>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={materialsData}
                margin={{ top: 22, right: 15, left: -10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#44403c', fontWeight: 600 }}
                  interval={0}
                  axisLine={{ stroke: '#e7e5e4' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.25))]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(245, 245, 244, 0.6)' }}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e7e5e4',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} unidades solicitadas`, 'Cantidad']}
                />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                  {/* Etiquetas visibles directamente sobre las barras */}
                  <LabelList
                    dataKey="cantidad"
                    position="top"
                    fill="#1c1917"
                    fontSize={12}
                    fontWeight={800}
                    offset={8}
                    formatter={(val: any) => `${val}`}
                  />
                  {materialsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Micro-resumen inferior de porcentajes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-stone-100 text-center">
            <div className="p-1.5 rounded-xl bg-amber-50/60 border border-amber-100">
              <span className="text-[10px] text-stone-500 block uppercase font-bold">Kits</span>
              <span className="text-xs font-black text-amber-900">{totalKits} un.</span>
            </div>
            <div className="p-1.5 rounded-xl bg-stone-50 border border-stone-200/60">
              <span className="text-[10px] text-stone-500 block uppercase font-bold">Afiches</span>
              <span className="text-xs font-black text-stone-800">{totalAfiches} un.</span>
            </div>
            <div className="p-1.5 rounded-xl bg-sky-50/60 border border-sky-100">
              <span className="text-[10px] text-stone-500 block uppercase font-bold">Guías</span>
              <span className="text-xs font-black text-sky-900">{totalGuias} un.</span>
            </div>
            <div className="p-1.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[10px] text-stone-500 block uppercase font-bold">Hojas Niño</span>
              <span className="text-xs font-black text-emerald-900">{totalHojas} un.</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: Comparativo Parroquias vs Colegios */}
        <div className="lg:col-span-5 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Church className="w-4 h-4 text-amber-800" />
                <span>Comparativa: Parroquias vs Colegios</span>
              </h4>
            </div>
            <p className="text-xs text-stone-600 mb-3">
              Proporción de demanda y participación por tipo de institución
            </p>

            {/* Selector de Métrica Comparativa */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setComparativeMetric('reservas')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  comparativeMetric === 'reservas'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Reservas
              </button>
              <button
                type="button"
                onClick={() => setComparativeMetric('piezas')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  comparativeMetric === 'piezas'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Piezas
              </button>
              <button
                type="button"
                onClick={() => setComparativeMetric('monto')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                  comparativeMetric === 'monto'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Monto (€)
              </button>
            </div>
          </div>

          {/* Gráfico de Barras Comparativas */}
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparativeData}
                margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                <XAxis
                  dataKey="categoria"
                  tick={{ fontSize: 11, fill: '#44403c', fontWeight: 700 }}
                  axisLine={{ stroke: '#e7e5e4' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  allowDecimals={comparativeMetric === 'monto'}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.3))]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e7e5e4',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [
                    comparativeMetric === 'monto' ? `${Number(val).toFixed(2)} €` : `${val} ${comparativeMetric}`,
                    'Total'
                  ]}
                />
                <Bar dataKey={comparativeMetric} radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey={comparativeMetric}
                    position="top"
                    fill="#1c1917"
                    fontSize={11}
                    fontWeight={800}
                    offset={6}
                    formatter={(val: any) =>
                      comparativeMetric === 'monto' ? `${Number(val).toFixed(0)}€` : `${val}`
                    }
                  />
                  {comparativeData.map((entry, index) => (
                    <Cell key={`cell-comp-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tarjetas comparativas lado a lado */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-100">
            {/* Parroquias */}
            <div className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/40">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs mb-1">
                <Church className="w-3.5 h-3.5" />
                <span>Parroquias ({pctParroquias}%)</span>
              </div>
              <div className="space-y-0.5 text-[11px] text-stone-700">
                <div className="flex justify-between">
                  <span>Reservas:</span>
                  <strong className="text-stone-900">{parroquiasCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Piezas:</span>
                  <strong className="text-stone-900">{parroquiasPiezas}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <strong className="text-amber-950 font-black">{parroquiasMonto.toFixed(2)} €</strong>
                </div>
              </div>
            </div>

            {/* Colegios */}
            <div className="p-2.5 rounded-xl border border-sky-200/80 bg-sky-50/40">
              <div className="flex items-center gap-1.5 text-sky-900 font-bold text-xs mb-1">
                <School className="w-3.5 h-3.5" />
                <span>Colegios ({pctColegios}%)</span>
              </div>
              <div className="space-y-0.5 text-[11px] text-stone-700">
                <div className="flex justify-between">
                  <span>Reservas:</span>
                  <strong className="text-stone-900">{colegiosCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Piezas:</span>
                  <strong className="text-stone-900">{colegiosPiezas}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <strong className="text-sky-950 font-black">{colegiosMonto.toFixed(2)} €</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILA 2: ESTADO DE PAGOS + ESTADO LOGÍSTICO + ALERTAS PARA TOMA DE DECISIONES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* GRÁFICO 3: Estado de Cobranzas y Pagos */}
        <div className="lg:col-span-4 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Euro className="w-4 h-4 text-emerald-700" />
              <span>Estado de Pagos y Cobranzas</span>
            </h4>
            <p className="text-xs text-stone-600">
              Distribución de reservas y dinero recaudado
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e7e5e4',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} reservas (${item.payload.monto.toFixed(2)} €)`,
                    name
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={(value: string) => (
                    <span className="text-[11px] text-stone-700 font-medium">
                      {value} ({paymentCounts[value]?.count || 0})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-600">Total en caja/cuenta:</span>
            <span className="font-extrabold text-emerald-800">
              {paymentCounts['Pagado'].monto.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* GRÁFICO 4: Cadena Logística y Despacho */}
        <div className="lg:col-span-4 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-700" />
              <span>Logística y Cadena de Entrega</span>
            </h4>
            <p className="text-xs text-stone-600">
              Avance del despacho Caracas ➔ Maracaibo ➔ Parroquia
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                >
                  {deliveryData.map((entry, index) => (
                    <Cell key={`cell-del-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e7e5e4',
                    fontSize: '12px'
                  }}
                  formatter={(val: any, name: any) => [`${val} pedidos`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={(value: string) => (
                    <span className="text-[11px] text-stone-700 font-medium">
                      {value === 'Por Imprimir / En Caracas' ? 'En Caracas' : value} ({deliveryCounts[value] || 0})
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-600">Entregados con éxito:</span>
            <span className="font-extrabold text-emerald-800">
              {deliveryCounts['Entregado']} reservas
            </span>
          </div>
        </div>

        {/* MÓDULO 5: Alertas Inteligentes para la Toma de Decisiones */}
        <div className="lg:col-span-4 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-700" />
                <span>Alertas para Toma de Decisiones</span>
              </h4>
            </div>
            <p className="text-xs text-stone-600 mb-3">
              Acciones operativas recomendadas para el Secretariado
            </p>

            <div className="space-y-2 text-xs">
              {/* Alerta 1: Listos para Despacho */}
              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold text-emerald-950 block">
                    {pedidosPagadosSinEntregar} pedidos listos para despacho
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Tienen pago 100% verificado y esperan por entrega o envío.
                  </span>
                </div>
              </div>

              {/* Alerta 2: Pagos en Verificación */}
              {pagosPorVerificar > 0 ? (
                <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold text-blue-950 block">
                      {pagosPorVerificar} pago(s) por conciliar ({montoPorVerificar.toFixed(2)} €)
                    </span>
                    <span className="text-[11px] text-blue-800">
                      Revisar comprobantes bancarios para confirmar entrega.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold text-stone-800 block">Sin pagos por conciliar</span>
                    <span className="text-[11px] text-stone-600">Todos los pagos reportados están al día.</span>
                  </div>
                </div>
              )}

              {/* Alerta 3: Top Demanda */}
              {topInstitutions.length > 0 && (
                <div className="p-2.5 rounded-xl border border-amber-200/80 bg-amber-50/50 flex items-start gap-2">
                  <Award className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <div className="leading-snug flex-1">
                    <span className="font-bold text-amber-950 block">
                      Mayor demanda: {topInstitutions[0].name}
                    </span>
                    <span className="text-[11px] text-amber-900 block">
                      {topInstitutions[0].piezas} piezas ({topInstitutions[0].kits} kits) · {topInstitutions[0].type}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Pastoral Familiar Arquidiócesis</span>
            <span className="font-bold text-stone-700">Campaña 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
