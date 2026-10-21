export interface DianResolution {
  id: string;
  resolutionNumber: string;
  resolutionDate: string;
  validFrom: string;
  validTo: string;
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  softwarePin: string | null;
  active: boolean;
  createdAt: string;
}

export interface DianResolutionRequest {
  resolutionNumber: string;
  resolutionDate: string;
  validFrom: string;
  validTo: string;
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  softwarePin: string | null;
  active: boolean;
}

export const ELECTRONIC_INVOICE_STATUS = {
  PENDING_SEND: 'PENDING_SEND',
  SENT: 'SENT',
  ACCEPTED_BY_DIAN: 'ACCEPTED_BY_DIAN',
  REJECTED_BY_DIAN: 'REJECTED_BY_DIAN',
} as const;
export type ElectronicInvoiceStatus =
  (typeof ELECTRONIC_INVOICE_STATUS)[keyof typeof ELECTRONIC_INVOICE_STATUS];

export interface ProviderError {
  code: string;
  message: string | null;
  params: string[];
  detail: string | null;
}

export interface ElectronicInvoice {
  id: string;
  salesDocumentId: string;
  sourceDocumentId: string | null;
  cufe: string | null;
  qrCode: string | null;
  status: ElectronicInvoiceStatus;
  sentAt: string | null;
  responseAt: string | null;
  createdAt: string;
  providerInvoiceId?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  errors?: ProviderError[];
}

export interface DianSyncQueueItem {
  id: string;
  electronicInvoiceId: string;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface DigitalCertificate {
  id: string;
  alias: string;
  issuer: string | null;
  subject: string | null;
  expirationDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  uploadedAt: string;
}

export interface DianDashboardSummary {
  todayEmitted: number;
  pendingCount: number;
  rejectedCount: number;
}

export const STATUS_CHIP_COLOR: Record<string, string> = {
  PENDING_SEND: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED_BY_DIAN: 'bg-green-100 text-green-800',
  REJECTED_BY_DIAN: 'bg-red-100 text-red-800',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_SEND: 'Pendiente',
  SENT: 'Enviado',
  ACCEPTED_BY_DIAN: 'Aceptado DIAN',
  REJECTED_BY_DIAN: 'Rechazado DIAN',
};
