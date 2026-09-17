import React from 'react';
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
  Legend
} from 'recharts';
import { CrmReservation } from '../../types/reservation';

interface CrmChartsProps {
  reservations: CrmReservation[];
}

const PAYMENT_COLORS: Record<string, string> = {
  Pagado: '#059669', // Emerald 600
  Pendiente: '#d97706', // Amber 600
  Verificando: '#2563eb' // Blue 600
};

export const CrmCharts: React.FC<CrmChartsProps> = ({ reservations }) => {
  // Datos para Gráfico de Materiales
  let totalKits = 0;
  let totalAfiches = 0;
  let totalGuias = 0;
  let totalHojas = 0;

  reservations.forEach((r) => {
    totalKits += Number(r.kitQuantity || 0);
    totalAfiches += Number(r.aficheQuantity || 0);
    totalGuias += Number(r.guiaQuantity || 0);
    totalHojas += Number(r.hojaQuantity || 0);
  });

  const materialsData = [
    { name: 'Kits Completos', cantidad: totalKits, color: '#92400e' },
    { name: 'Afiches Oficiales', cantidad: totalAfiches, color: '#d97706' },
    { name: 'Guías Facilitador', cantidad: totalGuias, color: '#0284c7' },
    { name: 'Hojas del Niño', cantidad: totalHojas, color: '#16a34a' }
  ];

  // Datos para Gráfico de Estado de Pago
  const paymentCounts: Record<string, number> = {
    Pagado: 0,
    Pendiente: 0,
    Verificando: 0
  };

  reservations.forEach((r) => {
    const status = r.paymentStatus || 'Pendiente';
    if (paymentCounts[status] !== undefined) {
      paymentCounts[status] += 1;
    } else {
      paymentCounts['Pendiente'] += 1;
    }
  });

  const paymentData = Object.keys(paymentCounts).map((key) => ({
    name: key,
    value: paymentCounts[key],
    color: PAYMENT_COLORS[key] || '#78716c'
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Gráfico 1: Desglose de Materiales Solicitados */}
      <div className="lg:col-span-7 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-stone-900">
            Materiales Solicitados para Caracas
          </h4>
          <p className="text-xs text-stone-700">
            Desglose de piezas totales a imprimir y despachar
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={materialsData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#57534e' }}
                interval={0}
                angle={-10}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 11, fill: '#57534e' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e7e5e4',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                formatter={(val: any) => [`${val} unidades`, 'Cantidad']}
              />
              <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                {materialsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Distribución por Estado de Pago */}
      <div className="lg:col-span-5 bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col">
        <div className="mb-2">
          <h4 className="text-sm font-bold text-stone-900">
            Estado de Pagos
          </h4>
          <p className="text-xs text-stone-700">
            Proporción de reservas pagadas vs. pendientes
          </p>
        </div>

        <div className="h-60 w-full flex-1 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
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
                formatter={(val: any) => [`${val} reservas`, 'Total']}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-stone-700 font-medium">
                    {value} ({paymentCounts[value] || 0})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
