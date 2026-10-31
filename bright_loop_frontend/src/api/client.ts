/**
 * EZbill - Production API Client
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'finance' | 'sales' | 'customer';
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'lead' | 'inactive';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  price: number;
  currency: string;
  features: string[];
  active: boolean;
}

export interface QuotationItem {
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
  expiresAt: string;
  notes: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  subNumber: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'paused' | 'canceled' | 'past_due';
  price: number;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  canceledAt?: string;
  effectiveCancellationDate?: string;
  autoRenew: boolean;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  subscriptionId?: string;
  quotationId?: string;
  items: InvoiceItem[];
  total: number;
  amountPaid: number;
  amountDue: number;
  status: 'draft' | 'unpaid' | 'paid' | 'overdue' | 'void';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  method: 'card' | 'wire' | 'ach' | 'simulation';
  status: 'succeeded' | 'pending' | 'failed';
  isSimulated: boolean;
  transactionRef: string;
  createdAt: string;
}

export interface DashboardMetrics {
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  upcomingRenewals: number;
  canceledSubscriptions: number;
  pausedSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  overdueInvoicesCount: number;
  overdueBalance: number;
  recentEvents: Array<{
    id: string;
    timestamp: string;
    type: string;
    description: string;
    actor: string;
  }>;
  customersCount: number;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(endpoint, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    getUsers: () => request<User[]>('/api/auth/users'),
    login: (email: string) =>
      request<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },

  customers: {
    list: (search?: string, status?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      return request<{ customers: Customer[]; total: number }>(`/api/customers?${params}`);
    },
    get: (id: string) =>
      request<{
        customer: Customer;
        subscriptions: Subscription[];
        quotations: Quotation[];
        invoices: Invoice[];
        payments: Payment[];
      }>(`/api/customers/${id}`),
    create: (data: Partial<Customer>) =>
      request<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Customer>) =>
      request<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  products: {
    list: () => request<Product[]>('/api/products'),
  },

  plans: {
    list: () => request<Plan[]>('/api/plans'),
    create: (data: Partial<Plan>) =>
      request<Plan>('/api/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  quotations: {
    list: () => request<Quotation[]>('/api/quotations'),
    create: (data: {
      customerId: string;
      planId: string;
      quantity: number;
      discount: number;
      notes?: string;
      expiresDays?: number;
    }) =>
      request<Quotation>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    accept: (id: string) =>
      request<Quotation>(`/api/quotations/${id}/accept`, {
        method: 'PUT',
      }),
    convert: (id: string) =>
      request<{ quotation: Quotation; subscription: Subscription; invoice: Invoice }>(
        `/api/quotations/${id}/convert`,
        { method: 'POST' }
      ),
  },

  subscriptions: {
    list: (status?: string, customerId?: string) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (customerId) params.append('customerId', customerId);
      return request<Subscription[]>(`/api/subscriptions?${params}`);
    },
    create: (data: { customerId: string; planId: string }) =>
      request<{ subscription: Subscription; invoice: Invoice }>('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    pause: (id: string) =>
      request<Subscription>(`/api/subscriptions/${id}/pause`, { method: 'PUT' }),
    resume: (id: string) =>
      request<Subscription>(`/api/subscriptions/${id}/resume`, { method: 'PUT' }),
    cancel: (id: string) =>
      request<Subscription>(`/api/subscriptions/${id}/cancel`, { method: 'PUT' }),
    changePlan: (id: string, newPlanId: string) =>
      request<Subscription>(`/api/subscriptions/${id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({ newPlanId }),
      }),
  },

  invoices: {
    list: (status?: string, customerId?: string) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (customerId) params.append('customerId', customerId);
      return request<Invoice[]>(`/api/invoices?${params}`);
    },
    pay: (id: string, data: { method?: string; isSimulated?: boolean }) =>
      request<{ invoice: Invoice; payment: Payment }>(`/api/invoices/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  payments: {
    list: () => request<Payment[]>('/api/payments'),
  },

  dashboard: {
    getMetrics: () => request<DashboardMetrics>('/api/dashboard/metrics'),
  },

  portal: {
    getAccount: (customerId: string) =>
      request<{
        customer: Customer;
        subscriptions: Subscription[];
        invoices: Invoice[];
        payments: Payment[];
        quotations: Quotation[];
      }>(`/api/portal/${customerId}`),
  },
  billing: {
    taxRules: () => request<any[]>('/api/billing/tax-rules'),
    createTaxRule: (data: any) =>
      request<any>('/api/billing/tax-rules', { method: 'POST', body: JSON.stringify(data) }),
    toggleTaxRule: (id: string) =>
      request<any>(`/api/billing/tax-rules/${id}/toggle`, { method: 'PUT' }),
    discounts: () => request<any[]>('/api/billing/discounts'),
    createDiscount: (data: any) =>
      request<any>('/api/billing/discounts', { method: 'POST', body: JSON.stringify(data) }),
    validateDiscount: (data: any) =>
      request<any>('/api/billing/discounts/validate', { method: 'POST', body: JSON.stringify(data) }),
    calculate: (data: any) =>
      request<any>('/api/billing/calculate', { method: 'POST', body: JSON.stringify(data) }),
    createInvoice: (data: any) =>
      request<any>('/api/billing/invoices', { method: 'POST', body: JSON.stringify(data) }),
    getInvoice: (id: string) => request<any>(`/api/billing/invoices/${id}`),
    voidInvoice: (id: string) =>
      request<any>(`/api/billing/invoices/${id}/void`, { method: 'PUT' }),
    recordPayment: (data: any) =>
      request<any>('/api/billing/payments', { method: 'POST', body: JSON.stringify(data) }),
    requestRefund: (data: any) =>
      request<any>('/api/billing/refunds', { method: 'POST', body: JSON.stringify(data) }),
    approveRefund: (id: string) =>
      request<any>(`/api/billing/refunds/${id}/approve`, { method: 'PUT' }),
    completeRefund: (id: string) =>
      request<any>(`/api/billing/refunds/${id}/complete`, { method: 'PUT' }),
    rejectRefund: (id: string) =>
      request<any>(`/api/billing/refunds/${id}/reject`, { method: 'PUT' }),
    listRefunds: (status?: string) =>
      request<any[]>(`/api/billing/refunds${status ? `?status=${status}` : ''}`),
    runRecurring: () => request<any>('/api/billing/recurring/run', { method: 'POST' }),
    upcomingRenewals: () => request<any>('/api/billing/recurring/upcoming'),
    runReconciliation: () =>
      request<any>('/api/billing/reconciliation/run', { method: 'POST' }),
    getReconciliation: () => request<any[]>('/api/billing/reconciliation'),
    getFinancialSummary: (startDate?: string, endDate?: string) => {
      const p = new URLSearchParams();
      if (startDate) p.append('startDate', startDate);
      if (endDate) p.append('endDate', endDate);
      return request<any>(`/api/billing/reports/summary?${p}`);
    },
    getOutstandingReport: () => request<any>('/api/billing/reports/outstanding'),
  },
};
