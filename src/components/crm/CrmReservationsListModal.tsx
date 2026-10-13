import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Building2,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Layers,
  Printer
} from 'lucide-react';
import { CrmReservation } from '../../types/reservation';
import { CrmUser } from '../../types/auth';
import {
  generateClassifiedReservationsPdf,
  downloadClassifiedReservationsPdf,
  exportClassifiedReservationsCSV
} from '../../utils/generateClassifiedReservationsPdf';
import { formatDateDMY } from '../../utils/generateUnifiedCrmReportPdf';

interface CrmReservationsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: CrmReservation[];
  currentUser?: CrmUser | null;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const CrmReservationsListModal: React.FC<CrmReservationsListModalProps> = ({
  isOpen,
  onClose,
  reservations,
  currentUser,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'parroquias' | 'colegios'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Pagado' | 'Pendiente' | 'Verificando'>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Clasificación de datos
  const parroquias = useMemo(
    () => reservations.filter((r) => r.institutionType === 'Parroquia'),
    [reservations]
  );

  const colegios = useMemo(
    () => reservations.filter((r) => r.institutionType !== 'Parroquia'),
    [reservations]
  );

  // Métricas rápidas
  const stats = useMemo(() => {
    const calc = (list: CrmReservation[]) => {
      const total = list.length;
      const pagadas = list.filter((r) => r.paymentStatus === 'Pagado');
      const pendientes = list.filter((r) => r.paymentStatus === 'Pendiente');
      const verificando = list.filter((r) => r.paymentStatus === 'Verificando');
      const montoTotal = list.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
      const montoPagado = pagadas.reduce((acc, r) => acc + (Number(r.totalEUR) || 0), 0);
      const piezas = list.reduce((acc, r) => acc + (Number(r.totalQuantity) || 0), 0);
      return { total, pagadas: pagadas.length, pendientes: pendientes.length, verificando: verificando.length, montoTotal, montoPagado, piezas };
    };

    return {
      parroquias: calc(parroquias),
      colegios: calc(colegios),
      general: calc(reservations)
    };
  }, [parroquias, colegios, reservations]);

  // Lista filtrada para la vista previa
  const displayedReservations = useMemo(() => {
    let list = reservations;
    if (activeTab === 'parroquias') list = parroquias;
    if (activeTab === 'colegios') list = colegios;

    const filtered = list.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.institutionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.phone.includes(searchTerm);

      const matchPayment = paymentFilter === 'all' || r.paymentStatus === paymentFilter;

      return matchSearch && matchPayment;
    });

    const paymentStatusWeight: Record<string, number> = {
      'Pagado': 1,
      'Verificando': 2,
      'Pendiente': 3
    };

    return [...filtered].sort((a, b) => {
      // 1. Primer nivel: Parroquia primero, luego Colegios si estamos viendo "Todas"
      if (activeTab === 'all') {
        const typeA = a.institutionType === 'Parroquia' ? 1 : 2;
        const typeB = b.institutionType === 'Parroquia' ? 1 : 2;
        if (typeA !== typeB) return typeA - typeB;
      }

      // 2. Segundo nivel: Estado del pago (Pagado -> Verificando -> Pendiente)
      const statusWeightA = paymentStatusWeight[a.paymentStatus] || 99;
      const statusWeightB = paymentStatusWeight[b.paymentStatus] || 99;
      if (statusWeightA !== statusWeightB) return statusWeightA - statusWeightB;

      // 3. Tercer nivel: Alfabéticamente por nombre de la Parroquia o Colegio
      const nameA = (a.institutionName || '').trim();
      const nameB = (b.institutionName || '').trim();
      const nameComp = nameA.localeCompare(nameB, 'es', { sensitivity: 'base', numeric: true });
      if (nameComp !== 0) return nameComp;

      return (a.code || '').localeCompare(b.code || '');
    });
  }, [reservations, parroquias, colegios, activeTab, searchTerm, paymentFilter]);

  if (!isOpen) return null;

  // Manejador de descarga de PDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    if (onShowToast) onShowToast('Generando PDF clasificado por Parroquia y Colegios...', 'info');

    try {
      const pdf = await generateClassifiedReservationsPdf(reservations, currentUser);
      const success = downloadClassifiedReservationsPdf(pdf);
      if (success) {
        if (onShowToast) onShowToast('¡Lista en PDF descargada con éxito!', 'success');
      } else {
        if (onShowToast) onShowToast('Error al descargar el archivo PDF', 'error');
      }
    } catch (err) {
      console.error('Error generando PDF clasificado:', err);
      if (onShowToast) onShowToast('Ocurrió un error al compilar el PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Manejador de descarga de CSV
  const handleDownloadCsv = () => {
    const success = exportClassifiedReservationsCSV(reservations);
    if (success) {
      if (onShowToast) onShowToast('¡Archivo CSV / Excel clasificado descargado!', 'success');
    } else {
      if (onShowToast) onShowToast('Error al exportar CSV', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                Lista Completa de Reservaciones
              </h2>
              <p className="text-xs text-blue-200 font-medium truncate">
                Clasificación Oficial: Parroquias y Colegios · Estado del Pago
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Descargar CSV */}
            <button
              onClick={handleDownloadCsv}
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
              title="Descargar datos en formato Excel / CSV estructurado"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Descargar Excel/CSV</span>
            </button>

            {/* Botón Descargar PDF Destacado */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Descargar documento oficial en formato PDF"
            >
              <FileText className="w-4 h-4 text-stone-950" />
              <span>{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</span>
            </button>

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tarjetas Resumen de Métricas */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {/* Card Parroquias */}
          <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                Parroquias ({stats.parroquias.total})
              </span>
              <span className="font-mono text-blue-700">€{stats.parroquias.montoTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-600">
              <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {stats.parroquias.pagadas} pagadas
              </span>
              <span>·</span>
              <span className="text-amber-700 font-bold inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> {stats.parroquias.pendientes} pendientes
              </span>
            </div>
          </div>

          {/* Card Colegios */}
          <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                Colegios ({stats.colegios.total})
              </span>
              <span className="font-mono text-amber-700">€{stats.colegios.montoTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-600">
              <span className="text-emerald-700 font-bold inline-flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {stats.colegios.pagadas} pagadas
              </span>
              <span>·</span>
              <span className="text-amber-700 font-bold inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> {stats.colegios.pendientes} pendientes
              </span>
            </div>
          </div>

          {/* Card Total Consolidado */}
          <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-stone-900 mb-1">
              <span>Total General ({stats.general.total})</span>
              <span className="font-mono font-black text-stone-900">€{stats.general.montoTotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-600">
              <span className="text-stone-700 font-semibold">{stats.general.piezas.toLocaleString()} piezas</span>
              <span>·</span>
              <span className="text-emerald-700 font-bold">€{stats.general.montoPagado.toFixed(2)} recaudado</span>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="p-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Pestañas de Clasificación */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todas ({reservations.length})
            </button>
            <button
              onClick={() => setActiveTab('parroquias')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                activeTab === 'parroquias'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3 h-3" />
              Parroquias ({parroquias.length})
            </button>
            <button
              onClick={() => setActiveTab('colegios')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 ${
                activeTab === 'colegios'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              Colegios ({colegios.length})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            {/* Buscador */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar parroquia, colegio, contacto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filtro Estado del Pago */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="py-1.5 px-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-700 focus:outline-none"
            >
              <option value="all">Estado: Todos</option>
              <option value="Pagado">Pagados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Verificando">Verificando</option>
            </select>
          </div>
        </div>

        {/* Tabla con scroll de vista previa */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-stone-50 sticky top-0 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Clasificación</th>
                <th className="py-2.5 px-3">Institución</th>
                <th className="py-2.5 px-3">Solicitante</th>
                <th className="py-2.5 px-3 text-right">Piezas</th>
                <th className="py-2.5 px-3 text-right">Monto Total</th>
                <th className="py-2.5 px-3">Estado del Pago</th>
                <th className="py-2.5 px-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayedReservations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500 italic">
                    No se encontraron reservaciones con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                displayedReservations.map((r) => {
                  const isParroquia = r.institutionType === 'Parroquia';
                  return (
                    <tr key={r.code} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-stone-900">{r.code}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isParroquia
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isParroquia ? <Building2 className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                          {r.institutionType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-stone-800 max-w-[200px] truncate" title={r.institutionName}>
                        {r.institutionName}
                      </td>
                      <td className="py-2 px-3 text-stone-600 max-w-[150px] truncate" title={`${r.contactName} (${r.phone})`}>
                        <div>{r.contactName}</div>
                        {r.phone && <div className="text-[10px] text-stone-400 font-mono">{r.phone}</div>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-stone-700">
                        {r.totalQuantity} <span className="text-[10px] text-stone-400">({r.kitQuantity}k)</span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-stone-900">
                        €{Number(r.totalEUR || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.paymentStatus === 'Pagado'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : r.paymentStatus === 'Verificando'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {r.paymentStatus === 'Pagado' ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : (
                            <Clock className="w-2.5 h-2.5" />
                          )}
                          {r.paymentStatus || 'Pendiente'}
                        </span>
                        {r.paymentRef && (
                          <div className="text-[9px] text-stone-400 font-mono truncate max-w-[90px]" title={r.paymentRef}>
                            Ref: {r.paymentRef}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-stone-500 font-mono text-[11px]">
                        {formatDateDMY(r.paymentDate || r.timestamp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie del Modal */}
        <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-500 font-medium">
            Mostrando <span className="font-bold text-stone-800">{displayedReservations.length}</span> de{' '}
            <span className="font-bold text-stone-800">{reservations.length}</span> reservaciones totales
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="h-8.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-8.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Compilando PDF...' : 'Descargar Lista en PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
