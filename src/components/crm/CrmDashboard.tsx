import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  Download,
  FileText,
  MessageCircle,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronDown,
  LogOut,
  UserCheck
} from 'lucide-react';
import {
  CrmReservation,
  CrmKPIs,
  ReservationStatus,
  PaymentStatus,
  DeliveryStatus
} from '../../types/reservation';
import { CrmUser } from '../../types/auth';
import {
  fetchCrmReservations,
  updateCrmReservation,
  createCrmReservation,
  deleteCrmReservation
} from '../../lib/googleSheets';
import { formatPhoneForWhatsApp } from '../../utils/phoneUtils';
import { CrmKpiCards } from './CrmKpiCards';
import { CrmCharts } from './CrmCharts';
import { CrmEditModal } from './CrmEditModal';
import { CrmCreateModal } from './CrmCreateModal';
import { CrmExecutivePdfReport } from './CrmExecutivePdfReport';

interface CrmDashboardProps {
  onBackToPublicSite: () => void;
  currentUser?: CrmUser;
  onLogout?: () => void;
}

export const CrmDashboard: React.FC<CrmDashboardProps> = ({
  onBackToPublicSite,
  currentUser,
  onLogout
}) => {
  const [reservations, setReservations] = useState<CrmReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Parroquia' | 'Colegio'>('Todos');
  const [paymentFilter, setPaymentFilter] = useState<string>('Todos');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('Todos');

  // Modales
  const [editingReservation, setEditingReservation] = useState<CrmReservation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Carga y sincronización de datos con Google Sheets
  const loadData = async (showLoading = true, notifyIfNew = false) => {
    if (showLoading) setLoading(true);
    setSyncStatus('syncing');
    try {
      const res = await fetchCrmReservations();
      setReservations((prev) => {
        if (notifyIfNew && prev.length > 0 && res.data.length > prev.length) {
          const diff = res.data.length - prev.length;
          showToast(`🔔 ¡${diff} nueva(s) reserva(s) recibida(s) en Google Sheets!`, 'info');
        }
        return res.data;
      });
      setSyncStatus(res.success ? 'saved' : 'error');
      setSyncMessage(res.message || (res.success ? 'Auto-sincronizado' : 'Modo local'));
    } catch {
      setSyncStatus('error');
      setSyncMessage('Error al sincronizar con Google Sheets');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Carga inicial
    loadData(true, false);

    // 2. Auto-actualización periódica en segundo plano cada 20 segundos
    const intervalId = setInterval(() => {
      loadData(false, true);
    }, 20000);

    // 3. Actualización automática inmediata cuando el usuario vuelve a enfocar la ventana/pestaña
    const handleFocus = () => {
      loadData(false, true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Cálculo de KPIs
  const kpis: CrmKPIs = useMemo(() => {
    let totalMonto = 0;
    let totalMontoRecaudado = 0;
    let totalPiezas = 0;
    let reservasPagadas = 0;
    let pendientesPago = 0;
    let reservasVerificando = 0;
    let montoPendientePago = 0;
    let entregasPendientes = 0;
    let entregasCompletadas = 0;
    let totalKits = 0;
    let totalAfiches = 0;
    let totalGuias = 0;
    let totalHojas = 0;

    let totalParroquias = 0;
    let totalColegios = 0;
    let montoParroquiasEUR = 0;
    let montoColegiosEUR = 0;
    let piezasParroquias = 0;
    let piezasColegios = 0;

    reservations.forEach((r) => {
      const eur = Number(r.totalEUR || 0);
      totalMonto += eur;

      if (r.paymentStatus === 'Pagado') {
        reservasPagadas += 1;
        totalMontoRecaudado += eur;
      } else if (r.paymentStatus === 'Verificando') {
        reservasVerificando += 1;
        pendientesPago += 1;
        montoPendientePago += eur;
      } else {
        pendientesPago += 1;
        montoPendientePago += eur;
      }

      if (r.deliveryStatus === 'Entregado') {
        entregasCompletadas += 1;
      } else {
        entregasPendientes += 1;
      }

      const kits = Number(r.kitQuantity || 0);
      const afiches = Number(r.aficheQuantity || 0);
      const guias = Number(r.guiaQuantity || 0);
      const hojas = Number(r.hojaQuantity || 0);
      const rPiezas = Number(r.totalQuantity || (kits + afiches + guias + hojas));

      totalKits += kits;
      totalAfiches += afiches;
      totalGuias += guias;
      totalHojas += hojas;
      totalPiezas += rPiezas;

      if (r.institutionType === 'Parroquia') {
        totalParroquias += 1;
        montoParroquiasEUR += eur;
        piezasParroquias += rPiezas;
      } else {
        totalColegios += 1;
        montoColegiosEUR += eur;
        piezasColegios += rPiezas;
      }
    });

    return {
      totalReservas: reservations.length,
      totalMontoEUR: totalMonto,
      totalMontoRecaudadoEUR: totalMontoRecaudado,
      totalPiezas,
      reservasPagadas,
      reservasPendientesPago: pendientesPago,
      reservasVerificando,
      montoPendientePagoEUR: montoPendientePago,
      entregasPendientes,
      entregasCompletadas,
      totalKits,
      totalAfiches,
      totalGuias,
      totalHojas,
      totalParroquias,
      totalColegios,
      montoParroquiasEUR,
      montoColegiosEUR,
      piezasParroquias,
      piezasColegios
    };
  }, [reservations]);

  // Filtrado de reservas
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Filtro de búsqueda
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        r.code.toLowerCase().includes(query) ||
        r.contactName.toLowerCase().includes(query) ||
        r.institutionName.toLowerCase().includes(query) ||
        r.phone.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query);

      // Filtro de tipo
      const matchesType = typeFilter === 'Todos' || r.institutionType === typeFilter;

      // Filtro de estado de pago
      const matchesPayment = paymentFilter === 'Todos' || r.paymentStatus === paymentFilter;

      // Filtro de estado de entrega
      const matchesDelivery = deliveryFilter === 'Todos' || r.deliveryStatus === deliveryFilter;

      return matchesSearch && matchesType && matchesPayment && matchesDelivery;
    });
  }, [reservations, searchTerm, typeFilter, paymentFilter, deliveryFilter]);

  // Actualización rápida de estado en línea
  const handleInlineStatusChange = async (
    code: string,
    field: 'status' | 'paymentStatus' | 'deliveryStatus',
    value: string
  ) => {
    setReservations((prev) =>
      prev.map((item) => (item.code === code ? { ...item, [field]: value } : item))
    );

    showToast(`Actualizando ${code}...`, 'info');
    await updateCrmReservation(code, { [field]: value } as any);
    showToast(`Reserva ${code} guardada en Google Sheets`, 'success');
  };

  // Guardar edición completa
  const handleSaveEdit = async (code: string, updates: Partial<CrmReservation>) => {
    setReservations((prev) =>
      prev.map((item) => (item.code === code ? { ...item, ...updates } : item))
    );
    showToast(`Guardando cambios de ${code}...`, 'info');
    await updateCrmReservation(code, updates);
    showToast(`Reserva ${code} actualizada exitosamente`, 'success');
  };

  // Crear nueva reserva
  const handleCreateReservation = async (newRes: CrmReservation) => {
    setReservations((prev) => [newRes, ...prev]);
    showToast(`Registrando reserva ${newRes.code}...`, 'info');
    await createCrmReservation(newRes);
    showToast(`Reserva ${newRes.code} añadida al CRM`, 'success');
  };

  // Confirmar y eliminar
  const handleDeleteConfirm = async () => {
    if (!deletingCode) return;
    const code = deletingCode;
    setDeletingCode(null);
    setReservations((prev) => prev.filter((item) => item.code !== code));
    showToast(`Eliminando reserva ${code}...`, 'info');
    await deleteCrmReservation(code);
    showToast(`Reserva ${code} eliminada de Google Sheets`, 'success');
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = [
      'Fecha y Hora',
      'Código Reserva',
      'Tipo',
      'Parroquia o Colegio',
      'Solicitante',
      'Teléfono (WhatsApp)',
      'Correo Electrónico',
      'Kits Completos',
      'Afiches',
      'Guías Facilitador',
      'Hojas del Niño',
      'Total Piezas',
      'Monto Total (EUR)',
      'Estado de Reserva',
      'Estado del Pago',
      'Método de Pago',
      'Referencia de Pago',
      'Estado de Entrega',
      'Fecha de Entrega',
      'Notas y Observaciones'
    ];

    const rows = filteredReservations.map((r) => [
      `"${r.timestamp}"`,
      `"${r.code}"`,
      `"${r.institutionType}"`,
      `"${r.institutionName}"`,
      `"${r.contactName}"`,
      `"${r.phone}"`,
      `"${r.email}"`,
      r.kitQuantity,
      r.aficheQuantity,
      r.guiaQuantity,
      r.hojaQuantity,
      r.totalQuantity,
      r.totalEUR,
      `"${r.status}"`,
      `"${r.paymentStatus}"`,
      `"${r.paymentMethod}"`,
      `"${r.paymentRef}"`,
      `"${r.deliveryStatus}"`,
      `"${r.deliveryDate}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reservas_Abrazo_en_Familia_2026_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV exportado exitosamente', 'success');
  };

  // Abrir chat directo de WhatsApp con mensaje personalizado
  const handleOpenWhatsApp = (res: CrmReservation) => {
    const formattedPhone = formatPhoneForWhatsApp(res.phone);

    const message = encodeURIComponent(
      `¡Paz y Bien, ${res.contactName}! Te escribimos desde el *Secretariado de Pastoral Familiar de la Arquidiócesis de Maracaibo* respecto a tu reserva *${res.code}* de la Campaña Abrazo en Familia 2026 para *${res.institutionName}*.\n\n` +
      `Estado del pago: *${res.paymentStatus}*\n` +
      `Total: *${res.totalEUR.toFixed(2)} €* (${res.totalQuantity} piezas solicitadas).\n\n` +
      `¿Te podemos apoyar con alguna consulta o la recepción de tu comprobante? ¡Dios bendiga a tu comunidad!`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16 font-sans w-full max-w-full overflow-x-clip">
      {/* Barra superior de navegación del CRM */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200/80 shadow-xs">
        {/* Fila Principal de Navegación */}
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Lado Izquierdo: Volver + Logo & Badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBackToPublicSite}
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 text-xs font-bold text-stone-700 inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors shrink-0"
              title="Volver al portal público de Abrazo en Familia"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Volver a la Web</span>
              <span className="sm:hidden">Web</span>
            </button>

            <div className="h-4 w-px bg-stone-200 hidden sm:block shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-black text-stone-900 tracking-tight text-sm sm:text-base md:text-lg whitespace-nowrap truncate">
                CRM Pastoral
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-200/80 whitespace-nowrap shrink-0">
                <span className="hidden sm:inline">Gestión </span>2026
              </span>
            </div>
          </div>

          {/* Lado Derecho - Escritorio (sm+) */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {/* Indicador de Sincronización en Tiempo Real */}
            <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs shadow-2xs">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  syncStatus === 'syncing'
                    ? 'bg-amber-500 animate-spin'
                    : syncStatus === 'saved'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-[11px] text-stone-600 font-medium whitespace-nowrap">
                {syncStatus === 'syncing' ? 'Sincronizando...' : 'En Vivo · Auto-sincronizado (20s)'}
              </span>
            </div>

            {/* Botón Recargar */}
            <button
              onClick={() => loadData(false)}
              disabled={syncStatus === 'syncing'}
              className="h-9 w-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors shadow-2xs shrink-0"
              title="Recargar datos desde Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>

            {/* Botón Exportar CSV */}
            <button
              onClick={handleExportCSV}
              className="h-9 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 inline-flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            {/* Botón Descargar Reporte PDF (1 Página) */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="h-9 px-3.5 rounded-xl border border-amber-200/80 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
              title="Descargar Reporte Ejecutivo en PDF (1 página con KPI y Gráficos)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-800" />
              <span>Reporte PDF (1 Pág)</span>
            </button>

            {/* Botón Nueva Reserva */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-[0.98] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </button>

            {/* Usuario Autenticado */}
            {currentUser && (
              <div className="hidden xl:flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-stone-100 border border-stone-200 text-xs shrink-0">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-bold text-stone-800 truncate max-w-[130px] text-[11px]" title={currentUser.name}>
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-semibold text-stone-700 bg-stone-200/70 px-1.5 py-0.5 rounded">
                  {currentUser.role}
                </span>
              </div>
            )}

            {/* Botón Salir */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="h-9 w-9 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-stone-600 flex items-center justify-center transition-colors shadow-2xs shrink-0"
                title="Cerrar Sesión del CRM"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lado Derecho - Móvil (< sm) con botones alineados prolijos */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {/* Botón Recargar */}
            <button
              onClick={() => loadData(false)}
              disabled={syncStatus === 'syncing'}
              className="h-9 w-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-600 flex items-center justify-center transition-colors shadow-2xs shrink-0"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </button>

            {/* Botón Salir en Móvil */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="h-9 w-9 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-stone-600 flex items-center justify-center transition-colors shadow-2xs shrink-0"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Barra de Acciones Móvil (Sub-fila prolija para pantallas pequeñas sin desbordamiento) */}
        <div className="sm:hidden px-3.5 py-2 bg-stone-50/90 border-t border-stone-200/70 flex items-center justify-between gap-2">
          {/* Estado de sincronización en vivo */}
          <div className="flex items-center gap-1.5 text-[11px] text-stone-600 font-medium shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncStatus === 'syncing'
                  ? 'bg-amber-500 animate-spin'
                  : syncStatus === 'saved'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="truncate">
              {syncStatus === 'syncing' ? 'Sincronizando...' : 'En vivo (20s)'}
            </span>
          </div>

          {/* Acciones principales en móvil con altura y estilo uniforme */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="h-8.5 px-3 rounded-lg border border-amber-200/90 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-xs font-bold text-amber-900 inline-flex items-center gap-1.5 shadow-2xs transition-all shrink-0"
              title="Descargar Reporte PDF"
            >
              <FileText className="w-3.5 h-3.5 text-amber-800" />
              <span>Reporte PDF</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-8.5 px-3.5 rounded-lg bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Reserva</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 space-y-6 min-w-0">
        {/* Notificación Toast */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-700 text-xs animate-fade-in">
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-rose-400' : 'bg-amber-400'
              }`}
            />
            <span className="font-medium">{toast.message}</span>
          </div>
        )}

        {/* 1. Módulo de Tarjetas KPI */}
        <CrmKpiCards kpis={kpis} />

        {/* 2. Módulo de Gráficos Recharts */}
        <CrmCharts reservations={reservations} />

        {/* 3. Módulo de Tabla CRM con Filtros Rápidos */}
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Barra de Filtros */}
          <div className="p-3 sm:p-4 border-b border-stone-200/80 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
            {/* Buscador Global */}
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por código, solicitante, parroquia, teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-white text-xs focus:outline-hidden focus:border-amber-700 shadow-2xs placeholder:text-stone-400"
              />
            </div>

            {/* Selectores de Filtro y Contador */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 max-w-full">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Filtro Tipo */}
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 font-medium focus:outline-hidden focus:border-amber-700 shadow-2xs max-w-[130px] sm:max-w-none truncate"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="Parroquia">Parroquias</option>
                  <option value="Colegio">Colegios</option>
                </select>

                {/* Filtro Pago */}
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 font-medium focus:outline-hidden focus:border-amber-700 shadow-2xs max-w-[135px] sm:max-w-none truncate"
                >
                  <option value="Todos">Todos los pagos</option>
                  <option value="Pendiente">Pago: Pendiente</option>
                  <option value="Pagado">Pago: Pagado</option>
                  <option value="Verificando">Pago: Verificando</option>
                </select>

                {/* Filtro Entrega */}
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 font-medium focus:outline-hidden focus:border-amber-700 shadow-2xs max-w-[150px] sm:max-w-none truncate"
                >
                  <option value="Todos">Todas las entregas</option>
                  <option value="Por Imprimir / En Caracas">Por Imprimir / En Caracas</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-stone-600 font-medium whitespace-nowrap">
                  <span className="font-bold text-stone-900">{filteredReservations.length}</span> de {reservations.length}
                </div>
                <span className="sm:hidden text-[10px] text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-md font-semibold whitespace-nowrap">
                  ⟷ Desliza tabla
                </span>
              </div>
            </div>
          </div>

          {/* Tabla de Reservas */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-stone-700 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-700" />
                <p className="text-xs font-medium">Cargando registros desde Google Sheets...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="py-20 text-center text-stone-700 space-y-2">
                <p className="text-sm font-bold text-stone-700">No se encontraron reservas con los filtros aplicados</p>
                <p className="text-xs">Intenta cambiar el término de búsqueda o limpia los filtros.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100/70 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Código / Fecha</th>
                    <th className="py-3 px-4">Institución / Tipo</th>
                    <th className="py-3 px-4">Solicitante</th>
                    <th className="py-3 px-4">Piezas</th>
                    <th className="py-3 px-4">Monto (€)</th>
                    <th className="py-3 px-4">Estado Reserva</th>
                    <th className="py-3 px-4">Estado Pago</th>
                    <th className="py-3 px-4">Estado Entrega</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70">
                  {filteredReservations.map((res) => {
                    const isPaid = res.paymentStatus === 'Pagado';
                    const isVerifying = res.paymentStatus === 'Verificando';

                    return (
                      <tr key={res.code} className="hover:bg-amber-50/30 transition-colors">
                        {/* Código y Fecha */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200/60 block w-fit mb-0.5">
                            {res.code}
                          </span>
                          <span className="text-[10px] text-stone-700 block">
                            {res.timestamp}
                          </span>
                        </td>

                        {/* Institución */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                res.institutionType === 'Colegio'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {res.institutionType}
                            </span>
                          </div>
                          <span className="font-bold text-stone-900 line-clamp-1" title={res.institutionName}>
                            {res.institutionName}
                          </span>
                        </td>

                        {/* Solicitante y Contacto */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-stone-900 block">
                            {res.contactName}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-stone-700 text-[11px]">
                              {res.phone}
                            </span>
                            {/* Botón directo de WhatsApp */}
                            <button
                              onClick={() => handleOpenWhatsApp(res)}
                              className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                              title="Escribir al WhatsApp con mensaje de confirmación"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Piezas */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-extrabold text-stone-900 block">
                            {res.totalQuantity} piezas
                          </span>
                          <span className="text-[10px] text-stone-700 block">
                            {res.kitQuantity} kits · {res.aficheQuantity} af · {res.guiaQuantity} g · {res.hojaQuantity} h
                          </span>
                        </td>

                        {/* Monto (€) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-black text-stone-900 text-sm block">
                            {Number(res.totalEUR).toFixed(2)} €
                          </span>
                          <span className="text-[10px] font-bold text-stone-600 block truncate max-w-[120px]">
                            {res.paymentMethod || 'Pago Móvil'}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {res.paymentDate && (
                              <span className="text-[10px] text-stone-700 font-mono">
                                {res.paymentDate}
                              </span>
                            )}
                            {res.paymentReceipt && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200" title="Comprobante de pago adjunto">
                                📷 Recibo
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Selector rápido: Estado Reserva */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="relative inline-block">
                            <select
                              value={res.status}
                              onChange={(e) => handleInlineStatusChange(res.code, 'status', e.target.value)}
                              aria-label="Estado de la Reserva"
                              className="text-[11px] font-bold py-1 pl-2 pr-5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-hidden focus:border-amber-700 cursor-pointer appearance-none"
                            >
                              <option value="Nueva Reserva">Nueva Reserva</option>
                              <option value="En Proceso">En Proceso</option>
                              <option value="Confirmada">Confirmada</option>
                              <option value="Cancelada">Cancelada</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-stone-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>

                        {/* Selector rápido: Estado Pago */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="relative inline-block">
                            <select
                              value={res.paymentStatus}
                              onChange={(e) => handleInlineStatusChange(res.code, 'paymentStatus', e.target.value)}
                              aria-label="Estado del Pago"
                              className={`text-[11px] font-bold py-1 pl-2 pr-5 rounded-lg border cursor-pointer appearance-none ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isVerifying
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Verificando">Verificando</option>
                              <option value="Pagado">Pagado</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-stone-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>

                        {/* Selector rápido: Estado Entrega */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="relative inline-block">
                            <select
                              value={res.deliveryStatus}
                              onChange={(e) => handleInlineStatusChange(res.code, 'deliveryStatus', e.target.value)}
                              aria-label="Estado de Entrega"
                              className="text-[11px] font-medium py-1 pl-2 pr-5 rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-hidden focus:border-amber-700 cursor-pointer appearance-none"
                            >
                              <option value="Por Imprimir / En Caracas">Por Imprimir / En Caracas</option>
                              <option value="Enviado">Enviado</option>
                              <option value="Entregado">Entregado</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-stone-700 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingReservation(res)}
                              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                              title="Editar detalles de gestión"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingCode(res.code)}
                              className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Eliminar reserva"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Edición Completa */}
      <CrmEditModal
        isOpen={!!editingReservation}
        reservation={editingReservation}
        onClose={() => setEditingReservation(null)}
        onSave={handleSaveEdit}
      />

      {/* Modal de Creación */}
      <CrmCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateReservation}
      />

      {/* Modal de Reporte Ejecutivo en PDF (1 Página) */}
      <CrmExecutivePdfReport
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        reservations={reservations}
        kpis={kpis}
        currentUser={currentUser}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      {deletingCode && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">¿Eliminar esta reserva?</h3>
              <p className="text-xs text-stone-700 mt-1">
                La reserva <strong className="font-mono text-stone-900">{deletingCode}</strong> se eliminará de la base de datos de Google Sheets.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingCode(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
