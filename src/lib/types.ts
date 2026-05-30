export type TransactionType = 'DEBT' | 'PAYMENT';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone_number: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  user_id: string;
  type: TransactionType;
  description: string | null;
  amount: number;
  created_at: string;
}

export interface CustomerBalance {
  customer_id: string;
  user_id: string;
  customer_name: string;
  phone_number: string | null;
  total_debt: number;
  total_paid: number;
  balance: number;
}

export interface PendingItem {
  id?: number;
  type: 'INSERT_TRANSACTION' | 'INSERT_CUSTOMER';
  data: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardSummary {
  totalToReceive: number;
  totalReceivedToday: number;
}

export interface ReportSummary {
  totalSold: number;
  totalReceived: number;
  pendingBalance: number;
}
