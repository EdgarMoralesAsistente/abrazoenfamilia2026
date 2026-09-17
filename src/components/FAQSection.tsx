import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: '¿Por qué se pide a Caracas?',
    a: 'La impresión oficial masiva se coordina a nivel nacional por la CEV en Caracas para abaratar costos y garantizar uniformidad litúrgica.'
  },
  {
    q: '¿Cómo realizo el aporte de la reserva?',
    a: 'Al completar el formulario con los precios en Euros (€), se te facilitan los datos oficiales de la Pastoral Familiar. Posteriormente, confirmas enviando el comprobante vía WhatsApp con tu código de reserva.'
  },
  {
    q: '¿Dónde se retira el material en Maracaibo?',
    a: (
      <>
        El material impreso se retirará en los talleres Arciprestales preparatorios a la Campaña Abrazo en Familia 2026 y en los talleres que se realizarán para los colegios. Debes estar atento a la cuenta en Instagram del Secretariado de Pastoral Familiar de la Arquidiócesis de Maracaibo (
        <a
          href="https://www.instagram.com/pfamiliarmaracaibo/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2"
        >
          @pfamiliarmaracaibo
        </a>
        )
      </>
    )
  }
];

export const FAQSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-10 bg-stone-50 border-t border-stone-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-4">
          Preguntas Frecuentes
        </h3>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-stone-200/80 overflow-hidden">
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full p-3.5 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-stone-900 hover:text-amber-800"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-stone-600 transition-transform ${open === idx ? 'rotate-180' : ''}`} />
              </button>
              {open === idx && (
                <div className="px-3.5 pb-3.5 pt-1 text-xs sm:text-sm text-stone-700 leading-relaxed border-t border-stone-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
