import React from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import heroImg from '../assets/images/abrazo_familia_hero_1789589426360.jpg';
import { CAMPAIGN_ITEMS } from '../data/parishes';

interface HeroProps {
  onOpenReservation: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenReservation }) => {
  const fullKit = CAMPAIGN_ITEMS.find((c) => c.isKit);
  const kitPrice = fullKit ? `${fullKit.unitPriceEUR.toFixed(2).replace('.', ',')} €` : '7,00 €';

  return (
    <section className="py-12 sm:py-16 bg-white border-b border-stone-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 items-center">
          {/* Texto y Acción */}
          <div className="md:col-span-7 space-y-5">
            <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
              Campaña Arquidiocesana · Maracaibo 2026
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Material Impreso <br />
              <span className="text-amber-800">Abrazo en Familia 2026</span>
            </h1>

            <p className="text-stone-700 text-sm sm:text-base leading-relaxed max-w-lg">
              Reserva a tiempo el material formativo oficial para tu parroquia o colegio. Las solicitudes se envían de forma centralizada a <strong>Caracas</strong> para entrega en Maracaibo.
            </p>

            {/* Contenido del Kit de un vistazo */}
            <div className="pt-1 space-y-2">
              <p className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Cada Kit Oficial Incluye:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-700">
                <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200/70">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>1 Afiche a color</span>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200/70">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>1 Guía Facilitador</span>
                </div>
                <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-2 rounded-lg border border-stone-200/70">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>1 Hoja del Niño</span>
                </div>
              </div>
            </div>

            {/* Botón Principal */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={onOpenReservation}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-amber-700 hover:bg-amber-800 text-white shadow-sm transition-all text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Reservar Kit Completo ({kitPrice})</span>
              </button>

              <span className="text-xs text-stone-700">
                Aporte oficial: {kitPrice} por kit completo
              </span>
            </div>
          </div>

          {/* Imagen Minimalista */}
          <div className="md:col-span-5">
            <div className="rounded-2xl overflow-hidden shadow-md border border-stone-200/80 aspect-4/3 relative">
              <img
                src={heroImg}
                alt="Familia venezolana - Abrazo en Familia 2026"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 to-transparent flex items-end p-4">
                <p className="text-xs text-white font-medium">
                  Pastoral Familiar · Arquidiócesis de Maracaibo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
