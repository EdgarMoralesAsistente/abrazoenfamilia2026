export type ReservationType = 'Parroquia' | 'Colegio';

export type ReservationStatus = 'Nueva Reserva' | 'En Proceso' | 'Confirmada' | 'Cancelada';

export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Verificando';

export type DeliveryStatus = 'Por Imprimir / En Caracas' | 'Enviado' | 'Entregado';

export interface CrmReservation {
  id?: string;
  timestamp: string;
  code: string;
  institutionType: ReservationType;
  institutionName: string;
  contactName: string;
  phone: string;
  email: string;
  kitQuantity: number;
  aficheQuantity: number;
  guiaQuantity: number;
  hojaQuantity: number;
  totalQuantity: number;
  totalEUR: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  paymentRef: string;
  paymentDate?: string;
  paymentReceipt?: string;
  deliveryStatus: DeliveryStatus;
  deliveryDate: string;
  notes: string;
}

export interface CrmKPIs {
  totalReservas: number;
  totalMontoEUR: number;
  totalMontoRecaudadoEUR: number;
  totalPiezas: number;
  reservasPagadas: number;
  reservasPendientesPago: number;
  reservasVerificando: number;
  montoPendientePagoEUR: number;
  entregasPendientes: number;
  entregasCompletadas: number;
  totalKits: number;
  totalAfiches: number;
  totalGuias: number;
  totalHojas: number;
  totalParroquias: number;
  totalColegios: number;
  montoParroquiasEUR: number;
  montoColegiosEUR: number;
  piezasParroquias: number;
  piezasColegios: number;
  walletSummary?: DollarWalletSummary;
  expensesSummary?: ExpensesSummary;
}

export interface DollarPurchase {
  id: string;
  timestamp: string;
  date: string;
  usdAmount: number;
  exchangeRate: number;
  vesAmount: number;
  originAccount: string;
  destinationWallet: string;
  reference: string;
  operator: string;
  notes: string;
}

export interface WalletBreakdownItem {
  wallet: string;
  amountUSD: number;
  count: number;
  percentage: number;
}

export interface DollarWalletSummary {
  totalUsdPurchased: number;
  totalVesSpent: number;
  averageExchangeRate: number;
  lastExchangeRate: number;
  purchaseCount: number;
  totalVesCollectedEstimated: number;
  availableVesBalance: number;
  walletBreakdown?: WalletBreakdownItem[];
  totalExpensesVES?: number;
  totalExpensesUSD?: number;
}

export interface CrmExpense {
  id: string;
  timestamp: string;
  date: string;
  concept: string;
  category: string;
  amountVES: number;
  amountUSD?: number;
  currency: 'VES' | 'USD';
  paymentMethod: string;
  beneficiary?: string;
  reference: string;
  operator: string;
  notes: string;
}

export interface ExpensesSummary {
  totalExpensesVES: number;
  totalExpensesUSD: number;
  expenseCount: number;
}
