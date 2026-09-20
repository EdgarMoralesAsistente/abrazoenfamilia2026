export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  example: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', placeholder: '0414-1234567', example: '0414-1234567' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', placeholder: '300 123 4567', example: '300 123 4567' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸', placeholder: '(202) 555-0123', example: '202 555 0123' },
  { code: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸', placeholder: '612 345 678', example: '612 345 678' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', placeholder: '9 1234 5678', example: '9 1234 5678' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦', placeholder: '6123-4567', example: '6123-4567' },
  { code: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪', placeholder: '912 345 678', example: '912 345 678' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', placeholder: '99 123 4567', example: '99 123 4567' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', placeholder: '9 11 1234-5678', example: '9 11 1234-5678' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽', placeholder: '55 1234 5678', example: '55 1234 5678' },
  { code: 'DO', name: 'República Dominicana', dialCode: '+1', flag: '🇩🇴', placeholder: '809 123 4567', example: '809 123 4567' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', placeholder: '8123-4567', example: '8123-4567' },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷', placeholder: '11 91234-5678', example: '11 91234-5678' },
  { code: 'IT', name: 'Italia', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789', example: '312 345 6789' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', placeholder: '912 345 678', example: '912 345 678' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦', placeholder: '(416) 555-0123', example: '416 555 0123' },
  { code: 'OTHER', name: 'Otro país (+)', dialCode: '+', flag: '🌐', placeholder: 'Número completo con código', example: '+...' }
];

/**
 * Normaliza y formatea un número de teléfono a solo dígitos aptos para URLs de WhatsApp (wa.me o web.whatsapp.com)
 */
export const formatPhoneForWhatsApp = (rawPhone: string): string => {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();

  // Si viene con prefijo internacional explícito (+)
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    // Caso especial Venezuela (+58): si el usuario escribió +58 0414..., remover el 0 superfluo
    if (digits.startsWith('580')) {
      return '58' + digits.slice(3);
    }
    return digits;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Si empieza con 580 (ej. 5804141234567), quitar el 0
  if (digits.startsWith('580')) {
    return '58' + digits.slice(3);
  }

  // Si ya tiene el prefijo de Venezuela 58 y longitud completa
  if (digits.startsWith('58') && digits.length >= 12) {
    return digits;
  }

  // Número venezolano con cero inicial (ej. 04141234567 -> 584141234567)
  if (digits.startsWith('0') && digits.length >= 10) {
    return '58' + digits.slice(1);
  }

  // Número venezolano de 10 dígitos sin cero (ej. 4141234567 -> 584141234567)
  if (digits.length === 10 && /^(412|414|424|416|426)/.test(digits)) {
    return '58' + digits;
  }

  return digits;
};

/**
 * Separa un número almacenado en prefijo de país y número local para inicializar el input
 */
export const parseStoredPhone = (fullPhone: string): { countryCode: string; dialCode: string; localNumber: string } => {
  if (!fullPhone) {
    return { countryCode: 'VE', dialCode: '+58', localNumber: '' };
  }

  const trimmed = fullPhone.trim();

  // Buscar coincidencia con los países conocidos
  for (const country of COUNTRIES) {
    if (country.code === 'OTHER') continue;
    if (trimmed.startsWith(country.dialCode)) {
      const rest = trimmed.slice(country.dialCode.length).trim();
      return {
        countryCode: country.code,
        dialCode: country.dialCode,
        localNumber: rest
      };
    }
  }

  // Si no coincide con prefijo +, pero es un número local venezolano (0414..., 0424..., etc.)
  return {
    countryCode: 'VE',
    dialCode: '+58',
    localNumber: trimmed
  };
};
