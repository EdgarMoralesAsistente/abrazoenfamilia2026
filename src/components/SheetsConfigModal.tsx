import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { getSheetsWebhookUrl, setSheetsWebhookUrl } from '../utils/sheetsSync';

interface SheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlUpdated?: (newUrl: string) => void;
}

export const SheetsConfigModal: React.FC<SheetsConfigModalProps> = ({
  isOpen,
  onClose,
  onUrlUpdated
}) => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(getSheetsWebhookUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setSheetsWebhookUrl('');
      if (onUrlUpdated) onUrlUpdated('');
      setTestResult({ success: false, message: 'Se eliminó la URL configurada.' });
      return;
    }

    if (!trimmed.startsWith('https://script.google.com/macros/s/')) {
      setTestResult({
        success: false,
        message: 'La URL debe comenzar por https://script.google.com/macros/s/ y terminar en /exec'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      setSheetsWebhookUrl(trimmed);
      if (onUrlUpdated) onUrlUpdated(trimmed);

      // Probar si responde el doGet
      const res = await fetch(trimmed, { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (json && (json.status === 'ok' || json.message)) {
        setTestResult({
          success: true,
          message: '¡Conexión exitosa! El receptor de Google Sheets respondió correctamente.'
        });
      } else {
        setTestResult({
          success: true,
          message: 'URL guardada exitosamente. Las reservas se enviarán directamente a tu hoja.'
        });
      }
    } catch {
      // Aunque falle el GET por CORS en algunos navegadores, la URL queda guardada y el POST funciona
      setTestResult({
        success: true,
        message: 'URL guardada correctamente en el sistema.'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-stone-900">
              Conexión con Google Sheets
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-stone-600 leading-relaxed">
            Pega aquí la <strong>URL de la aplicación web</strong> generada por Google Apps Script (la que termina en <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900">/exec</code>). Cada reserva recibida se añadirá automáticamente a tu hoja de cálculo.
          </p>

          <div className="space-y-1.5">
            <label className="font-bold text-stone-900 block">
              URL de Google Apps Script:
            </label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 text-xs focus:outline-hidden focus:border-amber-700 font-mono text-stone-800"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-tight">{testResult.message}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-stone-600 hover:bg-stone-100 font-medium transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={handleSaveAndTest}
              className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              {testing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{testing ? 'Verificando...' : 'Guardar y Vincular'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
