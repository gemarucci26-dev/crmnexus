export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type Theme = 'dark' | 'light';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';

export interface Lead {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  empresa?: string;
  cargo?: string;
  tags: string[];
  status: LeadStatus;
  source?: string;
  createdById?: string;
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type Provider = 'EVOLUTION' | 'OFFICIAL';

export interface Campaign {
  id: string;
  nome: string;
  descricao?: string;
  mensagem: string;
  status: CampaignStatus;
  agendamento?: string;
  speed?: number;
  provider: Provider;
  costPerDispatch: number;
  createdById?: string;
  _count?: {
    leads: number;
    dispatches: number;
  };
  totalLeads?: number;
  dispatched?: number;
  createdAt: string;
  updatedAt: string;
}

export type DispatchStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface Dispatch {
  id: string;
  campaignId: string;
  leadId: string;
  userId: string;
  mensagem: string;
  status: DispatchStatus;
  cost?: number;
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
  lead?: {
    nome: string;
    telefone?: string;
  };
  campaign?: {
    nome: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  totalDispatches: number;
  responseRate: number;
  qualifiedLeads: number;
  costPerLead: number;
}

export interface ChartData {
  name: string;
  value: number;
  value2?: number;
}

export interface TimelineItem {
  id: string;
  type: 'dispatch' | 'response' | 'campaign' | 'lead';
  message: string;
  timestamp: string;
}

export interface PaymentPlan {
  id: string;
  label: string;
  amount: number;
  credits: number;
}

export interface PaymentSession {
  paymentId: string;
  checkoutUrl?: string;
  amount: number;
  credits: number;
  qrCode?: string;
  qrCodeBase64?: string;
  status?: string;
}