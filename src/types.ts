export interface MaterialItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  details: string[];
  unitPriceEUR: number;
  isKit?: boolean;
  tag?: string;
  badgeColor?: string;
  image?: string;
}

export interface CartItemSelection {
  itemId: string;
  quantity: number;
}

export interface ReservationFormData {
  fullName: string;
  idNumber: string; // Cédula o RIF
  phone: string; // WhatsApp
  email: string;
  institutionType?: 'parroquia' | 'colegio';
  parish: string;
  schoolName?: string;
  customParish?: string;
  role: string;
  deliveryMethod: 'retiro_sede' | 'vicaria_parroquial' | 'coordinacion_directa';
  notes?: string;
  items: CartItemSelection[];
  totalEUR: number;
}

export interface StoredReservation extends ReservationFormData {
  id: string;
  code: string;
  createdAt: string;
  status: 'pendiente_pago' | 'verificado' | 'en_proceso_caracas' | 'listo_entrega';
  paymentReference?: string;
  syncedToGoogleSheets?: boolean;
  emailSent?: boolean;
}

export interface ActivityNotification {
  id: string;
  parishName: string;
  personName: string;
  role: string;
  itemsPurchased: string;
  timeAgo: string;
  avatarSeed: string;
}

export interface BankPaymentDetails {
  bankName: string;
  bankCode: string;
  accountHolder: string;
  idDoc: string;
  phoneNumber: string;
  accountNumber?: string;
  email: string;
  paymentInstructions: string[];
}
