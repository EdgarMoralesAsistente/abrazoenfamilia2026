import { MaterialItem, ActivityNotification, BankPaymentDetails } from '../types';

export const DEFAULT_EXCHANGE_RATE = 44.5; // Tasa referencial Bs/USD actualizable

export const CAMPAIGN_ITEMS: MaterialItem[] = [
  {
    id: 'kit-completo-2026',
    name: 'Kit Impreso Completo «Abrazo en Familia 2026»',
    shortName: 'Kit Completo 2026',
    description: 'El paquete oficial integral para la pastoral familiar parroquial, colegios y comunidades. Incluye todos los recursos didácticos impresos enviados directamente desde la sede nacional en Caracas.',
    details: [
      '1 Afiche Oficial de la Campaña 2026 a todo color (formato grande)',
      '1 Guía Metodológica del Facilitador con temas, dinámicas y oraciones',
      '1 Hoja de Trabajo y Actividades para el Niño ilustrada'
    ],
    unitPriceEUR: 7.00,
    isKit: true,
    tag: 'Recomendado para Parroquias y Colegios',
    badgeColor: 'amber'
  },
  {
    id: 'afiche-oficial-2026',
    name: 'Afiche Oficial de la Campaña 2026 (Individual)',
    shortName: 'Afiche Oficial 2026',
    description: 'Afiche litúrgico y formativo impreso en papel satinado brillante de alta durabilidad para carteleras parroquiales, colegios y capillas.',
    details: [
      'Impresión offset a full color de alta calidad',
      'Lema inspirador oficial de la Campaña 2026',
      'Dimensiones estándar para carteleras y templos'
    ],
    unitPriceEUR: 3.00,
    isKit: false,
    tag: 'Individual',
    badgeColor: 'blue'
  },
  {
    id: 'guia-facilitador-2026',
    name: 'Guía Metodológica del Facilitador 2026 (Individual)',
    shortName: 'Guía del Facilitador',
    description: 'Manual pedagógico y teológico-pastoral con el desarrollo temático de las sesiones familiares, reflexiones, dinámicas grupales y esquemas de talleres.',
    details: [
      'Contenido pedagógico y catequético actualizado',
      'Guión paso a paso para reuniones en comunidades de base',
      'Lecturas bíblicas, oraciones y cantos sugeridos'
    ],
    unitPriceEUR: 4.00,
    isKit: false,
    tag: 'Individual',
    badgeColor: 'emerald'
  },
  {
    id: 'hoja-nino-2026',
    name: 'Hoja de Trabajo y Dinámicas del Niño 2026 (Individual)',
    shortName: 'Hoja del Niño',
    description: 'Material didáctico para niños y adolescentes con ilustraciones para colorear, reflexiones familiares para el hogar y compromisos de ternura.',
    details: [
      'Diseño ameno e interactivo para catequesis y escuelas',
      'Espacio para compromiso familiar firmado en el hogar',
      'Actividades prácticas de integración familiar'
    ],
    unitPriceEUR: 1.00,
    isKit: false,
    tag: 'Individual',
    badgeColor: 'rose'
  }
];

// Lista de Parroquias Eclesiales de la Arquidiócesis de Maracaibo
export const MARACAIBO_PARISHES: string[] = [
  'Basílica Santuario Ntra. Sra. de Chiquinquirá y San Juan de Dios (Casco Central)',
  'Catedral San Pedro y San Pablo (El Sagrario - Centro)',
  'Parroquia San Onofre (Av. Delicias / Tierra Negra)',
  'Parroquia Santa Bárbara (Centro Histórico)',
  'Parroquia Nuestra Señora de Coromoto (Los Olivos)',
  'Parroquia San Antonio María Claret (Av. 5 de Julio)',
  'Parroquia Santísimo Redentor (El Tránsito)',
  'Parroquia Nuestra Señora del Rosario de Aránzazu (Santa Rita / Maracaibo)',
  'Parroquia San Juan Bosco (El Rosal / Av. Delicias)',
  'Parroquia San Bartolomé (Valle Frío)',
  'Parroquia Sagrado Corazón de Jesús (Bella Vista)',
  'Parroquia La Milagrosa (Los Haticos)',
  'Parroquia Nuestra Señora de La Merced (Monte Claro)',
  'Parroquia San Tarcisio (Circunvalación 2)',
  'Parroquia San Judas Tadeo (Pomona)',
  'Parroquia La Sagrada Familia (Urb. Coromoto)',
  'Parroquia San José (Baralt / Bella Vista)',
  'Parroquia San Vicente de Paúl (La Lago)',
  'Parroquia Inmaculada Concepción (Santa Lucía)',
  'Parroquia Divino Niño (El Pinar)',
  'Parroquia Nuestra Señora de Fátima (18 de Octubre)',
  'Parroquia San Ramón Nonato (Monte Bello)',
  'Parroquia San Martín de Porres (Sierra Maestra)',
  'Parroquia Nuestra Señora de la Candelaria (San Jacinto)',
  'Parroquia San Alfonso María de Ligorio (Santa María)',
  'Parroquia Jesús de la Misericordia (Bella Vista)',
  'Parroquia Nuestra Señora del Carmen (Barrio San José)',
  'Parroquia Nuestra Señora de Guadalupe (Sierra Maestra)',
  'Parroquia Santo Cristo de Aranza (Haticos por arriba)',
  'Movimiento Familiar Cristiano (MFC Maracaibo)',
  'Otra parroquia o templo de Maracaibo'
];

export const PARISH_ROLES = [
  'Coordinador(a) Parroquial de Pastoral Familiar',
  'Párroco / Vicario Parroquial',
  'Catequista Parroquial / Diócesis',
  'Docente / Pastoral Educativa',
  'Coordinador(a) de Zona / Vicaría Pastoral',
  'Feligrés / Familia de la Comunidad'
];

export const BANK_DETAILS: BankPaymentDetails = {
  bankName: 'Banesco Banco Universal (ó Banco de Venezuela)',
  bankCode: '0134',
  accountHolder: 'Pastoral Familiar Arquidiócesis de Maracaibo',
  idDoc: 'J-30489211-4',
  phoneNumber: '0414-6864290',
  accountNumber: '0134-0072-88-0721054321',
  email: 'lapastoralfamiliar.mcbo@gmail.com',
  paymentInstructions: [
    'Realiza el Pago Móvil o transferencia por el monto exacto en Bolívares calculado en tu reservación.',
    'En el concepto o motivo del pago indica tu nombre y apellido + número de reserva.',
    'Guarda el comprobante digital (captura de pantalla o número de referencia de 6 a 8 dígitos).',
    'Reporta tu pago directamente al WhatsApp de la Pastoral Familiar (+58 414-6864290) o vía correo electrónico.'
  ]
};

// Datos para la burbuja de notificaciones push de compras recientes
export const RECENT_PARISH_PURCHASES: ActivityNotification[] = [
  {
    id: 'act-1',
    parishName: 'Basílica de Nuestra Señora de Chiquinquirá',
    personName: 'Hna. María Elena',
    role: 'Pastoral Parroquial',
    itemsPurchased: '10 Kits Impresos Completos',
    timeAgo: 'Hace 3 minutos',
    avatarSeed: 'ME'
  },
  {
    id: 'act-2',
    parishName: 'Parroquia San Onofre',
    personName: 'Carlos Villalobos',
    role: 'Coordinador Pastoral Familiar',
    itemsPurchased: '25 Kits Completos',
    timeAgo: 'Hace 8 minutos',
    avatarSeed: 'CV'
  },
  {
    id: 'act-3',
    parishName: 'Parroquia San Antonio María Claret',
    personName: 'Dra. Lisbeth Romero',
    role: 'Catequista de Familia',
    itemsPurchased: '5 Kits y 40 Hojas del Niño',
    timeAgo: 'Hace 14 minutos',
    avatarSeed: 'LR'
  },
  {
    id: 'act-4',
    parishName: 'Parroquia Nuestra Señora de Coromoto',
    personName: 'Pbro. Alexander Díaz',
    role: 'Párroco',
    itemsPurchased: '50 Kits Impresos para la comunidad',
    timeAgo: 'Hace 22 minutos',
    avatarSeed: 'AD'
  },
  {
    id: 'act-5',
    parishName: 'Parroquia Santísimo Redentor',
    personName: 'Familia Morales Briceño',
    role: 'Agente de Pastoral',
    itemsPurchased: '15 Kits y 10 Guías del Facilitador',
    timeAgo: 'Hace 35 minutos',
    avatarSeed: 'MB'
  },
  {
    id: 'act-6',
    parishName: 'Parroquia San Juan Bosco',
    personName: 'Prof. Gabriel Pirela',
    role: 'Pastoral Juvenil y Familiar',
    itemsPurchased: '30 Kits Completos y 60 Hojas del Niño',
    timeAgo: 'Hace 48 minutos',
    avatarSeed: 'GP'
  },
  {
    id: 'act-7',
    parishName: 'Parroquia La Milagrosa',
    personName: 'Yolanda Finol',
    role: 'Coordinadora de Catequesis',
    itemsPurchased: '12 Kits Impresos',
    timeAgo: 'Hace 1 hora',
    avatarSeed: 'YF'
  },
  {
    id: 'act-8',
    parishName: 'Parroquia Santa Bárbara',
    personName: 'Diácono Roberto García',
    role: 'Comunidad Eclesial',
    itemsPurchased: '8 Kits y 15 Afiches Oficiales',
    timeAgo: 'Hace 1 hora',
    avatarSeed: 'RG'
  }
];
