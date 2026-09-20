import React, { useState, useEffect, useMemo } from 'react';
import { COUNTRIES, CountryOption, formatPhoneForWhatsApp, parseStoredPhone } from '../utils/phoneUtils';
import { ChevronDown } from 'lucide-react';

interface InternationalPhoneInputProps {
  value: string;
  onChange: (fullFormattedValue: string, cleanWhatsAppDigits: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder,
  id
}) => {
  // Parsear el valor inicial
  const initial = useMemo(() => parseStoredPhone(value), []);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(initial.countryCode || 'VE');
  const [localNumber, setLocalNumber] = useState<string>(initial.localNumber || '');

  // Sincronizar si value cambia externamente
  useEffect(() => {
    const parsed = parseStoredPhone(value);
    setSelectedCountryCode(parsed.countryCode);
    setLocalNumber(parsed.localNumber);
  }, [value]);

  const selectedCountry = useMemo(() => {
    return COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];
  }, [selectedCountryCode]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setSelectedCountryCode(newCode);
    const newCountry = COUNTRIES.find((c) => c.code === newCode) || COUNTRIES[0];

    const fullFormatted = localNumber.trim()
      ? `${newCountry.dialCode} ${localNumber.trim()}`
      : '';
    const cleanDigits = formatPhoneForWhatsApp(fullFormatted);
    onChange(fullFormatted, cleanDigits);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    setLocalNumber(rawInput);

    // Si el usuario escribe o pega un número que ya comienza con +, detectar país automáticamente
    if (rawInput.trim().startsWith('+')) {
      const match = COUNTRIES.find(c => c.code !== 'OTHER' && rawInput.trim().startsWith(c.dialCode));
      if (match) {
        setSelectedCountryCode(match.code);
        const remaining = rawInput.trim().slice(match.dialCode.length).trim();
        setLocalNumber(remaining);
        const fullFormatted = `${match.dialCode} ${remaining}`;
        const cleanDigits = formatPhoneForWhatsApp(fullFormatted);
        onChange(fullFormatted, cleanDigits);
        return;
      }
    }

    const fullFormatted = rawInput.trim()
      ? `${selectedCountry.dialCode} ${rawInput.trim()}`
      : '';
    const cleanDigits = formatPhoneForWhatsApp(fullFormatted);
    onChange(fullFormatted, cleanDigits);
  };

  return (
    <div
      className={`relative flex items-center rounded-lg border border-stone-300 bg-white transition-colors focus-within:border-amber-700 focus-within:ring-1 focus-within:ring-amber-700/20 shadow-2xs ${
        disabled ? 'opacity-60 pointer-events-none bg-stone-100' : ''
      } ${className}`}
    >
      {/* Selector de País con Bandera y Código */}
      <div className="relative flex items-center shrink-0 border-r border-stone-200 bg-stone-50/80 hover:bg-stone-100 rounded-l-lg transition-colors">
        <div className="flex items-center gap-1.5 pl-2.5 pr-6 py-2 text-xs font-semibold text-stone-800 select-none">
          <span className="text-base leading-none" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="font-mono text-stone-700 font-bold">{selectedCountry.dialCode}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-stone-400 pointer-events-none" />

        {/* Elemento select invisible sobre el botón para soporte móvil nativo (iOS / Android) */}
        <select
          value={selectedCountryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          aria-label="Seleccionar país para código telefónico"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name} ({country.dialCode})
            </option>
          ))}
        </select>
      </div>

      {/* Input de Número Local */}
      <input
        id={id}
        type="tel"
        required={required}
        disabled={disabled}
        placeholder={placeholder || selectedCountry.placeholder}
        value={localNumber}
        onChange={handleNumberChange}
        className="w-full px-3 py-2 text-sm text-stone-900 bg-transparent placeholder:text-stone-400 focus:outline-hidden"
      />
    </div>
  );
};
