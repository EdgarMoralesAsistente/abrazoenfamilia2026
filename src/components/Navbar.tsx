import React from 'react';
import { ShoppingBag, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenReservation: () => void;
  onOpenCrm: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenReservation, onOpenCrm }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Logo / Identidad Minimalista y Prolija */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
            <img
              src="https://res.cloudinary.com/djvpapwvq/image/upload/v1789603448/Logo_del_Secretariado_de_Pastoral_Familiar_Sin_fondo_nffmht.png"
              alt="Logo Secretariado de Pastoral Familiar Maracaibo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-stone-900 tracking-tight text-sm sm:text-base leading-tight truncate">
                Abrazo en Familia
              </span>
              <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200/60 shrink-0">
                2026
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium leading-tight truncate mt-0.5">
              Pastoral Familiar · <span className="hidden sm:inline">Arquidiócesis de </span>Maracaibo
            </p>
          </div>
        </div>

        {/* Acciones del Menú Superior */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Botón Discreto de Acceso al CRM */}
          <button
            onClick={onOpenCrm}
            title="Acceso al CRM Pastoral de Pagos y Reservas"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden xs:inline sm:inline">CRM</span>
          </button>

          {/* Acción Principal Optimizada para Móvil */}
          <button
            onClick={onOpenReservation}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white shadow-xs transition-all shrink-0 active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Reservar</span>
            <span className="hidden sm:inline">Kit</span>
          </button>
        </div>
      </div>
    </header>
  );
};

