import React from 'react';
import { Church, Mail } from 'lucide-react';

interface FooterProps {
  onOpenReservation: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenReservation }) => {
  return (
    <footer className="bg-white border-t border-stone-200/80 py-8 text-xs text-stone-700">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Church className="w-4 h-4 text-amber-800" />
          <span className="font-semibold text-stone-900">
            Pastoral Familiar · Arquidiócesis de Maracaibo
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <a
            href="mailto:lapastoralfamiliar.mcbo@gmail.com"
            className="hover:text-stone-900 transition-colors inline-flex items-center gap-1"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>lapastoralfamiliar.mcbo@gmail.com</span>
          </a>
          <span>•</span>
          <button
            onClick={onOpenReservation}
            className="font-bold text-amber-800 hover:underline"
          >
            Reservar Material
          </button>
        </div>
      </div>
    </footer>
  );
};
