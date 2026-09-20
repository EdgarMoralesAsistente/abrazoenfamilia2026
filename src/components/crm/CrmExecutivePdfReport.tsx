import React, { useRef, useState, useEffect } from 'react';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  Euro,
  Package,
  ShoppingCart,
  Truck,
  Clock,
  Church,
  School,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Printer,
  ExternalLink,
  Check
} from 'lucide-react';
import { CrmReservation, CrmKPIs } from '../../types/reservation';
import { CrmUser } from '../../types/auth';
import {
  generateCrmExecutivePdf,
  downloadExecutivePdfBlob,
  getPastoralLogoDataUrl
} from '../../utils/generateCrmExecutivePdf';

interface CrmExecutivePdfReportProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: CrmReservation[];
  kpis: CrmKPIs;
  currentUser?: CrmUser;
}

export const CrmExecutivePdfReport: React.FC<CrmExecutivePdfReportProps> = ({
  isOpen,
  onClose,
  reservations,
  kpis,
  currentUser
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-cargar el logo en memoria inmediatamente al inicializar el componente
  useEffect(() => {
    getPastoralLogoDataUrl().catch(() => {});
  }, []);

  if (!isOpen) return null;

  // Fecha y hora formateada en español
  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = now.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Cálculos analíticos para el reporte de 1 página
  const pctReservasPagadas =
    kpis.totalReservas > 0
      ? Math.round((kpis.reservasPagadas / kpis.totalReservas) * 100)
      : 0;

  const pctMontoRecaudadoNum =
    kpis.totalMontoEUR > 0
      ? (kpis.totalMontoRecaudadoEUR / kpis.totalMontoEUR) * 100
      : 0;
  const pctMontoRecaudado = pctMontoRecaudadoNum.toFixed(1);

  const pctEntregas =
    kpis.totalReservas > 0
      ? Math.round((kpis.entregasCompletadas / kpis.totalReservas) * 100)
      : 0;

  const totalInst = kpis.totalParroquias + kpis.totalColegios;
  const pctParroquias = totalInst > 0 ? Math.round((kpis.totalParroquias / totalInst) * 100) : 0;
  const pctColegios = totalInst > 0 ? Math.round((kpis.totalColegios / totalInst) * 100) : 0;

  // Pagos y Logística
  const pedidosPagadosSinEntregar = reservations.filter(
    (r) => r.paymentStatus === 'Pagado' && r.deliveryStatus !== 'Entregado'
  ).length;

  // Materiales para Caracas
  const materialsList = [
    { label: 'Kits Completos', count: kpis.totalKits, color: '#92400e', bg: 'bg-amber-800' },
    { label: 'Afiches Oficiales', count: kpis.totalAfiches, color: '#d97706', bg: 'bg-amber-600' },
    { label: 'Guías Facilitador', count: kpis.totalGuias, color: '#0284c7', bg: 'bg-sky-600' },
    { label: 'Hojas del Niño', count: kpis.totalHojas, color: '#16a34a', bg: 'bg-emerald-600' }
  ];
  const maxMaterialCount = Math.max(...materialsList.map((m) => m.count), 1);

  // Top 3 Instituciones con mayor volumen
  const instMap: Record<string, { name: string; type: string; piezas: number; monto: number }> = {};
  reservations.forEach((r) => {
    const key = r.institutionName.trim();
    if (key) {
      if (!instMap[key]) {
        instMap[key] = { name: key, type: r.institutionType, piezas: 0, monto: 0 };
      }
      instMap[key].piezas += Number(r.totalQuantity || 0);
      instMap[key].monto += Number(r.totalEUR || 0);
    }
  });
  const topInstitutions = Object.values(instMap)
    .sort((a, b) => b.piezas - a.piezas)
    .slice(0, 3);

  // Función para generar y descargar el archivo .pdf de 1 sola página de forma 100% confiable
  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Generar documento PDF con jsPDF vectorial de 1 página exacta con el logo oficial
      const pdf = await generateCrmExecutivePdf(kpis, reservations, currentUser);

      // 2. Nombre descriptivo con fecha
      const fileDate = now.toISOString().slice(0, 10);
      const filename = `Reporte_Ejecutivo_CRM_Pastoral_Familiar_${fileDate}.pdf`;

      // 3. Descarga mediante Blob URL resiliente
      const ok = downloadExecutivePdfBlob(pdf, filename);
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4500);
      } else {
        setErrorMessage('La descarga fue bloqueada por el navegador. Haz clic en "Abrir PDF".');
      }
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      setErrorMessage(err?.message || 'Error al compilar el documento PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Función alternativa para abrir el PDF en una pestaña nueva o imprimir directamente
  const handleOpenOrPrintPdf = async () => {
    try {
      const pdf = await generateCrmExecutivePdf(kpis, reservations, currentUser);
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error al abrir PDF:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Contenedor Modal */}
      <div className="relative bg-stone-100 rounded-3xl shadow-2xl border border-stone-300 w-full max-w-4xl overflow-hidden my-4 flex flex-col max-h-[96vh]">
        {/* Barra superior de control del Modal */}
        <div className="bg-white px-5 py-3.5 border-b border-stone-200 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 leading-none">
                Reporte Ejecutivo en PDF (1 Página)
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Diagramación lista para impresión y toma de decisiones (excluye listado de filas)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notificación de éxito */}
            {downloadSuccess && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                ¡PDF Descargado!
              </span>
            )}

            {/* Notificación de error */}
            {errorMessage && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage}
              </span>
            )}

            {/* Botón Abrir / Ver en Pestaña */}
            <button
              type="button"
              onClick={handleOpenOrPrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs border border-stone-300 shadow-2xs transition-all cursor-pointer"
              title="Abrir PDF en pestaña nueva o imprimir"
            >
              <ExternalLink className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Abrir PDF</span>
            </button>

            {/* Botón Principal: Descargar .PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold text-xs shadow-md transition-all disabled:opacity-60 cursor-pointer"
              title="Descargar archivo PDF de 1 página"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-200" />
                  <span>¡Descargado!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Área de Visualización y Captura (A4 exacto) */}
        <div className="overflow-y-auto p-4 sm:p-6 flex justify-center bg-stone-200/70">
          {/* 
            HOJA A4 EXACTA:
            Medida estándar A4: 794px ancho x 1123px alto (proporción 1:1.414).
            Fondo blanco, diseño ultra limpio y tipografía de alta legibilidad.
          */}
          <div
            ref={reportRef}
            id="crm-executive-report-a4"
            className="bg-white text-stone-900 shadow-xl rounded-none relative overflow-hidden flex flex-col justify-between"
            style={{
              width: '794px',
              height: '1123px',
              minWidth: '794px',
              minHeight: '1123px',
              maxWidth: '794px',
              maxHeight: '1123px',
              padding: '24px 28px'
            }}
          >
            {/* ============================================================== */}
            {/* ENCABEZADO OFICIAL DE LA ARQUIDIÓCESIS */}
            {/* ============================================================== */}
            <header className="pb-3 border-b border-stone-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 flex items-center justify-center">
                  <img
                    src="https://res.cloudinary.com/djvpapwvq/image/upload/v1789603448/Logo_del_Secretariado_de_Pastoral_Familiar_Sin_fondo_nffmht.png"
                    alt="Logo Pastoral Familiar Maracaibo"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 block">
                    Arquidiócesis de Maracaibo · Secretariado de Pastoral Familiar
                  </span>
                  <h1 className="text-lg font-black text-stone-950 tracking-tight leading-tight">
                    Campaña Abrazo en Familia 2026
                  </h1>
                  <p className="text-xs font-bold text-stone-600">
                    Reporte Ejecutivo de Gestión, Producción & Cobranzas CRM
                  </p>
                </div>
              </div>

              <div className="text-right text-[10px] text-stone-600 space-y-0.5">
                <div className="inline-flex items-center gap-1 font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  <Calendar className="w-3 h-3 text-amber-700" />
                  <span>{formattedDate} · {formattedTime}</span>
                </div>
                <div className="text-[10px] text-stone-500">
                  Emitido por: <strong>{currentUser ? currentUser.name : 'Secretariado Arquidiocesano'}</strong>
                </div>
                <div className="text-[9px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Sincronizado con Google Sheets</span>
                </div>
              </div>
            </header>

            {/* ============================================================== */}
            {/* FILA 1: TARJETAS DE KPIS CON BARRAS DE PROGRESO */}
            {/* ============================================================== */}
            <section className="my-2.5">
              <div className="grid grid-cols-5 gap-2">
                {/* KPI 1: Total Reservas con Barra Hechas vs Pagadas */}
                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-stone-500 text-[9px] font-bold uppercase tracking-wider">
                    <span>Total Reservas</span>
                    <ShoppingCart className="w-3 h-3 text-amber-800" />
                  </div>
                  <div className="my-1">
                    <span className="text-xl font-black text-stone-900 block leading-none">
                      {kpis.totalReservas}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800 block mt-0.5">
                      {pctReservasPagadas}% pagadas
                    </span>
                  </div>
                  <div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(pctReservasPagadas, 100)}%` }}
                      />
                    </div>
                    <span className="text-[8.5px] text-stone-500 block mt-0.5 truncate font-medium">
                      {kpis.reservasPagadas} pag. · {kpis.reservasPendientesPago} pend.
                    </span>
                  </div>
                </div>

                {/* KPI 2: Monto Total (€) con Barra Total vs Pagado */}
                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-stone-500 text-[9px] font-bold uppercase tracking-wider">
                    <span>Monto Total (€)</span>
                    <Euro className="w-3 h-3 text-emerald-700" />
                  </div>
                  <div className="my-1">
                    <span className="text-xl font-black text-stone-900 block leading-none">
                      {kpis.totalMontoEUR.toFixed(2)} €
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800 block mt-0.5">
                      {pctMontoRecaudado}% recaudado
                    </span>
                  </div>
                  <div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(pctMontoRecaudadoNum, 100)}%` }}
                      />
                    </div>
                    <span className="text-[8.5px] text-stone-500 block mt-0.5 truncate font-medium">
                      {kpis.totalMontoRecaudadoEUR.toFixed(2)} € cobrado
                    </span>
                  </div>
                </div>

                {/* KPI 3: Total Piezas Impresas */}
                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-stone-500 text-[9px] font-bold uppercase tracking-wider">
                    <span>Total Piezas</span>
                    <Package className="w-3 h-3 text-sky-700" />
                  </div>
                  <div className="my-1">
                    <span className="text-xl font-black text-stone-900 block leading-none">
                      {kpis.totalPiezas}
                    </span>
                    <span className="text-[9px] font-bold text-amber-900 block mt-0.5">
                      {kpis.totalKits} kits completos
                    </span>
                  </div>
                  <div className="text-[8.5px] text-stone-500 font-medium truncate">
                    {kpis.totalAfiches} af · {kpis.totalGuias} guías · {kpis.totalHojas} h
                  </div>
                </div>

                {/* KPI 4: Pagos Pendientes */}
                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-stone-500 text-[9px] font-bold uppercase tracking-wider">
                    <span>Por Cobrar</span>
                    <Clock className="w-3 h-3 text-amber-700" />
                  </div>
                  <div className="my-1">
                    <span className="text-xl font-black text-amber-900 block leading-none">
                      {kpis.montoPendientePagoEUR.toFixed(2)} €
                    </span>
                    <span className="text-[9px] font-bold text-stone-600 block mt-0.5">
                      {kpis.reservasPendientesPago} solicitudes
                    </span>
                  </div>
                  <div className="text-[8.5px] text-stone-500 font-medium">
                    {kpis.reservasVerificando > 0
                      ? `${kpis.reservasVerificando} por conciliar`
                      : 'Al día en verificación'}
                  </div>
                </div>

                {/* KPI 5: Logística y Entregas */}
                <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-stone-500 text-[9px] font-bold uppercase tracking-wider">
                    <span>Despacho</span>
                    <Truck className="w-3 h-3 text-stone-700" />
                  </div>
                  <div className="my-1">
                    <span className="text-xl font-black text-stone-900 block leading-none">
                      {pctEntregas}%
                    </span>
                    <span className="text-[9px] font-bold text-emerald-800 block mt-0.5">
                      {kpis.entregasCompletadas} entregadas
                    </span>
                  </div>
                  <div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-stone-700 h-1.5 rounded-full"
                        style={{ width: `${Math.min(pctEntregas, 100)}%` }}
                      />
                    </div>
                    <span className="text-[8.5px] text-stone-500 block mt-0.5 truncate font-medium">
                      {kpis.entregasPendientes} en Caracas/ruta
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* FILA 2: PRODUCCIÓN NACIONAL (CARACAS) & COMPARATIVA PARROQUIAS/COLEGIOS */}
            {/* ============================================================== */}
            <section className="grid grid-cols-12 gap-3 my-1.5">
              {/* Gráfico 1: Materiales Solicitados para Caracas con etiquetas de cantidad */}
              <div className="col-span-7 p-3 rounded-2xl border border-stone-200 bg-white">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-stone-100">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-800" />
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-tight">
                      Materiales Solicitados para Caracas (Imprenta)
                    </h3>
                  </div>
                  <span className="text-[10px] font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Total: {kpis.totalPiezas} piezas
                  </span>
                </div>

                {/* Barras Horizontales con cantidades explícitas */}
                <div className="space-y-2.5 pt-1">
                  {materialsList.map((m) => {
                    const pct = Math.round((m.count / maxMaterialCount) * 100);
                    return (
                      <div key={m.label} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-stone-800">{m.label}</span>
                          <span className="font-black text-stone-950 text-xs">
                            {m.count} <span className="text-[9px] text-stone-500 font-normal">unidades</span>
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden flex">
                          <div
                            className={`${m.bg} h-3 rounded-full transition-all flex items-center justify-end pr-1.5`}
                            style={{ width: `${Math.max(pct, 12)}%` }}
                          >
                            <span className="text-[8px] text-white font-extrabold leading-none">
                              {m.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2.5 pt-2 border-t border-stone-100 grid grid-cols-4 gap-1 text-center">
                  <div className="p-1 rounded-lg bg-amber-50/70 border border-amber-100">
                    <span className="text-[8px] text-stone-500 uppercase font-bold block">Kits</span>
                    <strong className="text-[10px] text-amber-950">{kpis.totalKits}</strong>
                  </div>
                  <div className="p-1 rounded-lg bg-stone-50 border border-stone-100">
                    <span className="text-[8px] text-stone-500 uppercase font-bold block">Afiches</span>
                    <strong className="text-[10px] text-stone-900">{kpis.totalAfiches}</strong>
                  </div>
                  <div className="p-1 rounded-lg bg-sky-50/70 border border-sky-100">
                    <span className="text-[8px] text-stone-500 uppercase font-bold block">Guías</span>
                    <strong className="text-[10px] text-sky-950">{kpis.totalGuias}</strong>
                  </div>
                  <div className="p-1 rounded-lg bg-emerald-50/70 border border-emerald-100">
                    <span className="text-[8px] text-stone-500 uppercase font-bold block">Hojas</span>
                    <strong className="text-[10px] text-emerald-950">{kpis.totalHojas}</strong>
                  </div>
                </div>
              </div>

              {/* Gráfico 2: Comparativa Parroquias vs Colegios */}
              <div className="col-span-5 p-3 rounded-2xl border border-stone-200 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-stone-100">
                    <Church className="w-3.5 h-3.5 text-amber-800" />
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-tight">
                      Comparativa: Parroquias vs Colegios
                    </h3>
                  </div>

                  {/* Tarjetas Comparativas lado a lado */}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {/* Parroquias */}
                    <div className="p-2 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-950">
                        <Church className="w-3 h-3 text-amber-800" />
                        <span>Parroquias ({pctParroquias}%)</span>
                      </div>
                      <div className="text-[10px] text-stone-700 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Reservas:</span>
                          <strong className="text-stone-950">{kpis.totalParroquias}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Piezas:</span>
                          <strong className="text-stone-950">{kpis.piezasParroquias}</strong>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-amber-200/50">
                          <span>Aporte:</span>
                          <strong className="text-amber-950 font-black">{kpis.montoParroquiasEUR.toFixed(2)} €</strong>
                        </div>
                      </div>
                    </div>

                    {/* Colegios */}
                    <div className="p-2 rounded-xl border border-sky-200 bg-sky-50/50 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-black text-sky-950">
                        <School className="w-3 h-3 text-sky-800" />
                        <span>Colegios ({pctColegios}%)</span>
                      </div>
                      <div className="text-[10px] text-stone-700 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Reservas:</span>
                          <strong className="text-stone-950">{kpis.totalColegios}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Piezas:</span>
                          <strong className="text-stone-950">{kpis.piezasColegios}</strong>
                        </div>
                        <div className="flex justify-between pt-0.5 border-t border-sky-200/50">
                          <span>Aporte:</span>
                          <strong className="text-sky-950 font-black">{kpis.montoColegiosEUR.toFixed(2)} €</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barras de distribución porcentual */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-stone-600">
                      <span>Distribución de Demanda</span>
                      <span>{pctParroquias}% Parroquias · {pctColegios}% Colegios</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden flex">
                      <div className="bg-amber-800 h-2.5" style={{ width: `${pctParroquias}%` }} />
                      <div className="bg-sky-600 h-2.5" style={{ width: `${pctColegios}%` }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[9px] text-stone-500 text-center">
                  Total de {totalInst} instituciones registradas en la Arquidiócesis
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* FILA 3: ESTADO FINANCIERO, LOGÍSTICA & ACCIONES ESTRATÉGICAS */}
            {/* ============================================================== */}
            <section className="grid grid-cols-3 gap-3 my-1.5">
              {/* Bloque A: Estado de Pagos y Cobranzas */}
              <div className="p-3 rounded-2xl border border-stone-200 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-stone-100">
                    <Euro className="w-3.5 h-3.5 text-emerald-700" />
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-tight">
                      Estado de Pagos
                    </h3>
                  </div>

                  <div className="space-y-2 text-[10px]">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60">
                      <span className="font-bold text-emerald-950">Pagados:</span>
                      <strong className="text-emerald-950">{kpis.reservasPagadas} res. ({kpis.totalMontoRecaudadoEUR.toFixed(2)} €)</strong>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50 border border-amber-200/60">
                      <span className="font-bold text-amber-950">Pendientes:</span>
                      <strong className="text-amber-950">{kpis.reservasPendientesPago} res. ({kpis.montoPendientePagoEUR.toFixed(2)} €)</strong>
                    </div>

                    {kpis.reservasVerificando > 0 && (
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-blue-50 border border-blue-200/60">
                        <span className="font-bold text-blue-950">Por Conciliar:</span>
                        <strong className="text-blue-950">{kpis.reservasVerificando} reservas</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[10px] flex justify-between font-bold">
                  <span className="text-stone-600">Total en Caja:</span>
                  <span className="text-emerald-800 font-black">{kpis.totalMontoRecaudadoEUR.toFixed(2)} €</span>
                </div>
              </div>

              {/* Bloque B: Cadena de Entrega y Logística */}
              <div className="p-3 rounded-2xl border border-stone-200 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-stone-100">
                    <Truck className="w-3.5 h-3.5 text-stone-800" />
                    <h3 className="text-xs font-black text-stone-900 uppercase tracking-tight">
                      Cadena de Despacho
                    </h3>
                  </div>

                  <div className="space-y-2 text-[10px]">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-stone-50 border border-stone-200/80">
                      <span className="font-bold text-stone-700">Por Imprimir / Caracas:</span>
                      <strong className="text-stone-900">{kpis.entregasPendientes} pedidos</strong>
                    </div>

                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60">
                      <span className="font-bold text-emerald-950">Entregados en Destino:</span>
                      <strong className="text-emerald-900">{kpis.entregasCompletadas} pedidos</strong>
                    </div>

                    <div className="p-1.5 rounded-lg bg-stone-100 text-[9px] text-stone-600 leading-snug">
                      Ruta activa: Imprenta Caracas ➔ Sede Maracaibo ➔ Parroquia/Colegio.
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 text-[10px] flex justify-between font-bold">
                  <span className="text-stone-600">Efectividad de entrega:</span>
                  <span className="text-stone-900 font-black">{pctEntregas}%</span>
                </div>
              </div>

              {/* Bloque C: Alertas y Toma de Decisiones Estratégicas */}
              <div className="p-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-amber-200/60">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-800" />
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-tight">
                      Alertas para Decisiones
                    </h3>
                  </div>

                  <div className="space-y-1.5 text-[9.5px]">
                    {/* Alerta Despacho */}
                    <div className="p-1.5 rounded-lg bg-white border border-emerald-200 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0 mt-0.5" />
                      <span className="text-stone-800 leading-tight">
                        <strong>{pedidosPagadosSinEntregar} pedidos</strong> pagados al 100% listos para despacho.
                      </span>
                    </div>

                    {/* Alerta Cobro */}
                    <div className="p-1.5 rounded-lg bg-white border border-amber-200 flex items-start gap-1.5">
                      <Clock className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-stone-800 leading-tight">
                        <strong>{kpis.reservasPendientesPago} cobros</strong> pendientes por recaudar ({kpis.montoPendientePagoEUR.toFixed(2)} €).
                      </span>
                    </div>

                    {/* Mayor Demanda */}
                    {topInstitutions.length > 0 && (
                      <div className="p-1.5 rounded-lg bg-white border border-stone-200 flex items-start gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-amber-800 shrink-0 mt-0.5" />
                        <span className="text-stone-800 leading-tight truncate">
                          Top demanda: <strong>{topInstitutions[0].name}</strong> ({topInstitutions[0].piezas} pzs).
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/60 text-[9px] text-amber-900 font-bold text-center">
                  Revisión recomendada para el Comité Pastoral
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* PIE DE PÁGINA INSTITUCIONAL DEL REPORTE */}
            {/* ============================================================== */}
            <footer className="pt-3 border-t border-stone-300 flex items-center justify-between text-[9px] text-stone-500 shrink-0">
              <div className="space-y-0.5">
                <span className="font-bold text-stone-800 block">
                  Secretariado Arquidiocesano de Pastoral Familiar · Arquidiócesis de Maracaibo
                </span>
                <span>
                  Documento ejecutivo oficial generado desde el CRM Pastoral para la toma de decisiones estratégicas.
                </span>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-stone-900 block">Página 1 de 1</span>
                <span className="text-stone-400 font-mono">ID: AEF-2026-REP</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};
