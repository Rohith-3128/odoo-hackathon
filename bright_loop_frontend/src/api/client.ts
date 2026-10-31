/**
 * Brightloop Nexus - Production API Client
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
  id?: string;
  productId?: string;
  productName?: string;
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  subtotal?: number;
  total: number;
}

export interface QuotationRevision {
  revisionNumber: number;
  revisedAt: string;
  revisedBy: string;
  previousQuoteId: string;
  reason: string;
  changesSummary: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  revisionNumber?: number;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax?: number;
  total: number;
  currency?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'rejected' | 'expired' | 'converted';
  expiresAt: string;
  notes: string;
  termsAndConditions?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  deliveryStatus?: 'pending' | 'delivered' | 'failed';
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  expiredAt?: string;
  convertedAt?: string;
  convertedSubscriptionId?: string;
  revisions?: QuotationRevision[];
}

export interface CommercialTerms {
  planId: string;
  planName: string;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  currency: string;
  features: string[];
}

export interface SubscriptionAuditEvent {
  id: string;
  timestamp: string;
  type: string;
  actor: string;
  previousStatus?: string;
  newStatus?: string;
  description: string;
  details?: Record<string, any>;
}

export interface PlanChangeHistory {
  id: string;
  changedAt: string;
  actor: string;
  previousPlanId: string;
  previousPlanName: string;
  previousPrice: number;
  newPlanId: string;
  newPlanName: string;
  newPrice: number;
  changeType: 'upgrade' | 'downgrade' | 'lateral';
  proration: {
    periodStartDate: string;
    periodEndDate: string;
    effectiveDate: string;
    totalDaysInPeriod: number;
    daysRemaining: number;
    oldPlanPrice: number;
    newPlanPrice: number;
    unusedOldPlanCredit: number;
    proratedNewPlanDebit: number;
    netAdjustment: number;
    currency: string;
  };
  effectiveDate: string;
}

export interface Subscription {
  id: string;
  subNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  planId: string;
  planName: string;
  quotationId?: string;
  status: 'draft' | 'active' | 'trialing' | 'paused' | 'canceled' | 'past_due' | 'expired';
  price: number;
  currency?: string;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  startDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  canceledAt?: string;
  cancellationRequestedAt?: string;
  effectiveCancellationDate?: string;
  cancellationReason?: string;
  cancellationType?: 'immediate' | 'end_of_period';
  pausedAt?: string;
  resumedAt?: string;
  autoRenew: boolean;
  commercialTerms?: CommercialTerms;
  planHistory?: PlanChangeHistory[];
  history?: SubscriptionAuditEvent[];
  createdAt: string;
  updatedAt?: string;
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
    list: async (status?: string, search?: string) => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const res = await request<any>(`/api/quotations?${params}`);
      return Array.isArray(res) ? res : res.quotations || [];
    },
    get: (id: string) =>
      request<{ quotation: Quotation; customer: Customer; subscription?: Subscription }>(
        `/api/quotations/${id}`
      ),
    create: (data: {
      customerId: string;
      planId?: string;
      items?: any[];
      quantity?: number;
      discount?: number;
      discountType?: 'fixed' | 'percentage';
      taxRate?: number;
      notes?: string;
      termsAndConditions?: string;
      expiresDays?: number;
      sendNow?: boolean;
    }) =>
      request<Quotation>('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<Quotation>(`/api/quotations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    send: (id: string) =>
      request<Quotation>(`/api/quotations/${id}/send`, {
        method: 'POST',
      }),
    accept: (id: string) =>
      request<Quotation>(`/api/quotations/${id}/accept`, {
        method: 'POST',
      }),
    reject: (id: string, reason?: string) =>
      request<Quotation>(`/api/quotations/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    expire: (id: string) =>
      request<Quotation>(`/api/quotations/${id}/expire`, {
        method: 'POST',
      }),
    revise: (
      id: string,
      data: {
        items?: any[];
        discount?: number;
        notes?: string;
        expiresDays?: number;
        reason?: string;
      }
    ) =>
      request<{ originalQuote: Quotation; revisedQuote: Quotation }>(`/api/quotations/${id}/revise`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    convert: (id: string) =>
      request<{ quotation: Quotation; subscription: Subscription; invoice: Invoice }>(
        `/api/quotations/${id}/convert`,
        { method: 'POST' }
      ),
  },

  subscriptions: {
    list: async (status?: string, customerId?: string, search?: string) => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (customerId) params.append('customerId', customerId);
      if (search) params.append('search', search);
      const res = await request<any>(`/api/subscriptions?${params}`);
      return Array.isArray(res) ? res : res.subscriptions || [];
    },
    dueRenewal: (lookaheadDays: number = 0) =>
      request<{ dueCount: number; asOfDate: string; subscriptions: Subscription[] }>(
        `/api/subscriptions/due-renewal?lookaheadDays=${lookaheadDays}`
      ),
    get: (id: string) =>
      request<{ subscription: Subscription; customer: Customer; invoices: Invoice[] }>(
        `/api/subscriptions/${id}`
      ),
    getHistory: (id: string) =>
      request<{
        subscriptionId: string;
        subNumber: string;
        history: SubscriptionAuditEvent[];
        planHistory: PlanChangeHistory[];
      }>(`/api/subscriptions/${id}/history`),
    create: (data: {
      customerId: string;
      planId: string;
      trialDays?: number;
      autoRenew?: boolean;
      startImmediately?: boolean;
    }) =>
      request<{ subscription: Subscription; invoice?: Invoice }>('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    activate: (id: string) =>
      request<Subscription>(`/api/subscriptions/${id}/activate`, { method: 'POST' }),
    pause: (id: string) =>
      request<Subscription>(`/api/subscriptions/${id}/pause`, { method: 'POST' }),
    resume: (id: string) =>
      request<Subscription>(`/api/subscriptions/${id}/resume`, { method: 'POST' }),
    prorationPreview: (id: string, newPlanId: string) =>
      request<{
        subscriptionId: string;
        subNumber: string;
        currentPlan: any;
        targetPlan: any;
        proration: any;
      }>(`/api/subscriptions/${id}/proration-preview`, {
        method: 'POST',
        body: JSON.stringify({ newPlanId }),
      }),
    changePlan: (id: string, newPlanId: string) =>
      request<{
        subscription: Subscription;
        planChange: PlanChangeHistory;
        proration: any;
        adjustmentInvoice?: Invoice;
      }>(`/api/subscriptions/${id}/change-plan`, {
        method: 'POST',
        body: JSON.stringify({ newPlanId }),
      }),
    cancel: (id: string, type: 'immediate' | 'end_of_period' = 'end_of_period', reason?: string) =>
      request<Subscription>(`/api/subscriptions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ type, reason }),
      }),
    renew: (id: string) =>
      request<{ subscription: Subscription; invoice: Invoice; billingPeriodKey: string }>(
        `/api/subscriptions/${id}/renew`,
        { method: 'POST' }
      ),
    renewBatch: () =>
      request<{
        runAt: string;
        dueFound: number;
        processed: number;
        errorsCount: number;
        results: any[];
        errors: any[];
      }>('/api/subscriptions/renew-batch', { method: 'POST' }),
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
