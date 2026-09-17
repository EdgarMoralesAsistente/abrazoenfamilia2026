import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { authenticateCrmUser, setCrmSession } from '../../lib/googleSheets';
import { CrmUser } from '../../types/auth';

interface CrmLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CrmUser) => void;
}

export const CrmLoginModal: React.FC<CrmLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUser.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authenticateCrmUser(emailOrUser, password);
      if (res.success && res.user) {
        setCrmSession(res.user, rememberMe);
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError(res.message || 'Credenciales no autorizadas.');
      }
    } catch {
      setError('Ocurrió un error al verificar credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden my-6">
        {/* Barra superior con botón de cerrar */}
        <div className="pt-5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-200">
              <ShieldCheck className="w-3 h-3 text-amber-700" />
              Seguridad Pastoral
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Encabezado con Identidad Pastoral */}
        <div className="px-6 pt-2 pb-5 text-center">
          <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <img
              src="https://res.cloudinary.com/djvpapwvq/image/upload/v1789603448/Logo_del_Secretariado_de_Pastoral_Familiar_Sin_fondo_nffmht.png"
              alt="Logo Pastoral Familiar Maracaibo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="text-xl font-black text-stone-900 tracking-tight">
            Acceso al CRM Pastoral
          </h3>
          <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto leading-relaxed">
            Área restringida para miembros autorizados del equipo de la Pastoral Familiar (Arquidiócesis de Maracaibo).
          </p>
        </div>

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Mensaje de Error si aplica */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Campo Usuario o Correo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Correo o Usuario Autorizado</span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoComplete="username"
                placeholder="ej. lapastoralfamiliar.mcbo@gmail.com"
                value={emailOrUser}
                onChange={(e) => setEmailOrUser(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50/50 focus:bg-white focus:outline-hidden focus:border-amber-700 focus:ring-2 focus:ring-amber-700/10 transition-all font-medium text-stone-900"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Contraseña o Clave</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50/50 focus:bg-white focus:outline-hidden focus:border-amber-700 focus:ring-2 focus:ring-amber-700/10 transition-all font-medium text-stone-900 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-md"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Recordar Sesión */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-amber-700 focus:ring-amber-700 cursor-pointer accent-amber-700"
              />
              <span>Mantener sesión iniciada</span>
            </label>
          </div>

          {/* Botón de Iniciar Sesión */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verificando equipo pastoral...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Ingresar al CRM</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
