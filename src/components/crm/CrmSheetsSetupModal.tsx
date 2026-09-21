import React, { useState } from 'react';
import {
  Layers,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles,
  Table,
  CreditCard,
  Truck,
  Users,
  ShieldCheck,
  X,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { setupRequiredSheets } from '../../lib/googleSheets';

interface CrmSheetsSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  operatorName?: string;
  onSuccess?: (msg: string) => void;
}

export const CrmSheetsSetupModal: React.FC<CrmSheetsSetupModalProps> = ({
  isOpen,
  onClose,
  operatorName = 'Administrador Pastoral',
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    createdSheets?: string[];
    existingSheets?: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'action' | 'guide'>('action');

  if (!isOpen) return null;

  const sheetsToCreate = [
    {
      name: 'Reservas CRM',
      desc: 'Base central de pedidos y cotizaciones registradas por parroquias y colegios.',
      icon: Table,
      color: 'bg-amber-100 text-amber-900 border-amber-200',
      badge: 'Principal'
    },
    {
      name: 'Pagos Reportados',
      desc: 'Registro dedicado para pagos móviles, divisas en efectivo, Zelle, referencias bancarias, fechas y comprobantes.',
      icon: CreditCard,
      color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      badge: 'Finanzas'
    },
    {
      name: 'Inventario y Despachos',
      desc: 'Control logístico de materiales: kits, guías de facilitador, afiches oficiales y hojas para niños por retirar o entregar.',
      icon: Truck,
      color: 'bg-blue-100 text-blue-900 border-blue-200',
      badge: 'Logística'
    },
    {
      name: 'Usuarios CRM',
      desc: 'Cuentas autorizadas del Secretariado y Equipo Arquidiocesano con roles de Administrador y Equipo Pastoral.',
      icon: Users,
      color: 'bg-stone-100 text-stone-900 border-stone-200',
      badge: 'Seguridad'
    },
    {
      name: 'Historial y Auditoría',
      desc: 'Trazabilidad y bitácora de cambios en tiempo real de cada reserva, cobro y despacho.',
      icon: ShieldCheck,
      color: 'bg-purple-100 text-purple-900 border-purple-200',
      badge: 'Auditoría'
    }
  ];

  const handleExecuteSetup = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await setupRequiredSheets(operatorName);
      setResult(res);
      if (res.success && onSuccess) {
        onSuccess(res.message);
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Error al conectar: ${err.message || 'Fallo desconocido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/Code.gs');
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="pt-5 px-6 pb-4 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
                Estructura Multi-Hojas en Google Sheets
              </h2>
              <p className="text-xs text-stone-600">
                Verificación y creación automática de pestañas organizacionales
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas internas de la ventana */}
        <div className="px-6 pt-3 flex gap-2 border-b border-stone-100 bg-stone-50/50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('action')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'action'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Ordenar Creación Directa</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>2. Guía Paso a Paso para Apps Script</span>
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
          {activeTab === 'action' ? (
            <>
              {/* Resumen explicativo */}
              <div className="bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-amber-900">
                    Hojas esenciales que el sistema comprobará y creará automáticamente:
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Al pulsar el botón a continuación, se enviará la señal <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">SETUP_SHEETS</code> a tu Google Sheet para inicializar con encabezados y colores corporativos todas las pestañas faltantes.
                  </p>
                </div>
              </div>

              {/* Lista de pestañas a asegurar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {sheetsToCreate.map((sheet, idx) => {
                  const Icon = sheet.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-stone-200 bg-stone-50/40 hover:bg-stone-50 transition-all flex items-start gap-2.5"
                    >
                      <div className="p-2 rounded-xl bg-white border border-stone-200 text-stone-800 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-stone-900 text-xs truncate">
                            {sheet.name}
                          </span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${sheet.color}`}>
                            {sheet.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                          {sheet.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Resultado de la orden */}
              {result && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 animate-fade-in ${
                    result.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-xs">{result.message}</p>
                    {result.createdSheets && result.createdSheets.length > 0 && (
                      <p className="text-[11px] mt-1 text-emerald-800">
                        ✨ Hojas recién creadas:{' '}
                        <strong>{result.createdSheets.join(', ')}</strong>
                      </p>
                    )}
                    {result.existingSheets && result.existingSheets.length > 0 && (
                      <p className="text-[11px] mt-0.5 text-emerald-700">
                        ✓ Hojas que ya existían y siguen activas:{' '}
                        <strong>{result.existingSheets.join(', ')}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Botón de acción */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteSetup}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando orden a Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Enviar Señal para Crear Hojas Faltantes en Google Sheets</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Guía Paso a Paso */}
              <div className="space-y-4">
                <div className="bg-stone-100/70 border border-stone-200 p-3.5 rounded-2xl">
                  <h4 className="font-bold text-stone-900 text-xs mb-1 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-stone-700" />
                    Pasos para actualizar el código en Google Apps Script (100% Funcional):
                  </h4>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Sigue estos 5 sencillos pasos para que tu hoja de cálculo reciba todas las nuevas funciones de múltiples pestañas y los nuevos campos de pago.
                  </p>
                </div>

                <ol className="space-y-3 pl-1">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">Abre tu archivo de Google Sheets</p>
                      <p className="text-[11px] text-stone-600">
                        Entra a la hoja donde tienes las reservas de Abrazo en Familia 2026.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">Ve al menú: Extensiones &gt; Apps Script</p>
                      <p className="text-[11px] text-stone-600">
                        Se abrirá el editor de código donde se encuentra el archivo <code>Código.gs</code> o <code>Code.gs</code>.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">Copia y pega el código actualizado</p>
                      <p className="text-[11px] text-stone-600 mb-2">
                        Reemplaza todo el contenido anterior con el nuevo código con soporte multi-hoja:
                      </p>
                      <button
                        onClick={handleCopyCode}
                        className="py-1.5 px-3 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] inline-flex items-center gap-1.5 shadow-2xs transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copied ? '¡Código Copiado al Portapapeles!' : 'Copiar Código de Code.gs'}</span>
                      </button>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">Guarda e Implementa una Nueva Versión</p>
                      <p className="text-[11px] text-stone-600">
                        Haz clic en el ícono de <strong>Guardar (Disquete)</strong>, luego pulsa en el botón azul superior <strong>Implementar &gt; Administrar implementaciones &gt; Editar (ícono de lápiz) &gt; Versión: Nueva versión &gt; Implementar</strong>.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      5
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">¡Listo! Ejecuta la creación automática</p>
                      <p className="text-[11px] text-stone-600">
                        Regresa a la pestaña 1 de esta ventana y pulsa en <strong>«Enviar Señal para Crear Hojas Faltantes»</strong>. Google Sheets creará de inmediato las pestañas con sus estilos.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-stone-500 font-medium">
            Pastoral Familiar Maracaibo · Abrazo en Familia 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 font-bold transition-all shadow-2xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
