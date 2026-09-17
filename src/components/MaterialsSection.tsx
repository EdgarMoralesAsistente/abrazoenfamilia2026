import React from 'react';
import { CAMPAIGN_ITEMS } from '../data/parishes';
import familyKitImg from '../assets/images/familia_unida_campana_1789603056189.jpg';
import { Plus } from 'lucide-react';

interface MaterialsSectionProps {
  onSelectAndOpenModal: (itemId?: string) => void;
  exchangeRate?: number;
}

export const MaterialsSection: React.FC<MaterialsSectionProps> = ({
  onSelectAndOpenModal
}) => {
  const fullKit = CAMPAIGN_ITEMS.find((item) => item.isKit);
  const individualItems = CAMPAIGN_ITEMS.filter((item) => !item.isKit);

  return (
    <section id="materiales" className="py-12 sm:py-16 bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
              Materiales Disponibles
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 mt-0.5">
              Solicita el kit recomendado o piezas individuales por separado.
            </p>
          </div>
          <div className="text-xs text-stone-700">
            <span className="font-semibold px-2.5 py-1 rounded-md bg-stone-200/70 text-stone-800">
              Precios oficiales en Euros (€)
            </span>
          </div>
        </div>

        {/* Tarjeta del Kit Completo Minimalista */}
        {fullKit && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 mb-8 flex flex-col md:flex-row items-center gap-6 shadow-xs">
            <div className="w-full md:w-48 h-36 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
              <img
                src={familyKitImg}
                alt="Familia unida compartiendo - Campaña Abrazo en Familia 2026"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Recomendado
                </span>
                <span className="text-xs text-stone-700">Impresión en Caracas</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900">
                {fullKit.name}
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Contiene: 1 Afiche Oficial a todo color, 1 Guía Metodológica del Facilitador y 1 Hoja del Niño.
              </p>
            </div>

            <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
              <div className="text-left md:text-right">
                <span className="text-2xl font-black text-stone-900 block">
                  {fullKit.unitPriceEUR.toFixed(2)} €
                </span>
                <span className="text-xs text-stone-600 font-medium">
                  Kit Completo
                </span>
              </div>
              <button
                onClick={() => onSelectAndOpenModal(fullKit.id)}
                className="px-4 py-2.5 rounded-xl font-bold bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm transition-colors shadow-2xs"
              >
                Reservar Kit
              </button>
            </div>
          </div>
        )}

        {/* Items Individuales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {individualItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-stone-200/80 p-4 flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-semibold text-stone-700 block mb-1">
                  Material Individual
                </span>
                <h4 className="text-sm font-bold text-stone-900 leading-snug">
                  {item.name}
                </h4>
                <p className="text-xs text-stone-700 mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-stone-900 text-base">
                    {item.unitPriceEUR.toFixed(2)} €
                  </span>
                  <span className="text-[11px] text-stone-600 block">
                    Unidad
                  </span>
                </div>
                <button
                  onClick={() => onSelectAndOpenModal(item.id)}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
