import React from 'react';

export const CampaignImportance: React.FC = () => {
  return (
    <section className="py-12 bg-white border-t border-stone-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-6">
          ¿Cómo es el proceso de solicitud a Caracas?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-stone-700">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70">
            <span className="font-bold text-amber-800 text-xs uppercase block mb-1">
              Paso 1 · Reserva
            </span>
            <p className="font-semibold text-stone-900 mb-1">Selecciona tus cantidades</p>
            <p className="text-stone-700 leading-relaxed">
              Indica tu parroquia o colegio de Maracaibo y las cantidades que necesita tu comunidad.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70">
            <span className="font-bold text-amber-800 text-xs uppercase block mb-1">
              Paso 2 · Pago Móvil
            </span>
            <p className="font-semibold text-stone-900 mb-1">Realiza y reporta el pago</p>
            <p className="text-stone-700 leading-relaxed">
              Pagas en Bolívares a la cuenta oficial de la Pastoral y confirmas por WhatsApp en un clic.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/70">
            <span className="font-bold text-amber-800 text-xs uppercase block mb-1">
              Paso 3 · Entrega
            </span>
            <p className="font-semibold text-stone-900 mb-1">Retiro en Maracaibo</p>
            <p className="text-stone-700 leading-relaxed">
              La reservación se consolida en el lote arquidiocesano de Caracas y se distribuye en Maracaibo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
