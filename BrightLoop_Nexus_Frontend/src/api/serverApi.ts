import type { IncomingMessage, ServerResponse } from 'http';

// Database Models
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

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  actor: string;
}

// Global In-Memory Authoritative Database
export const DB = {
  users: [
    { id: 'usr-1', name: 'Julian Vance', email: 'julian@brightloopnexus.io', role: 'admin' },
    { id: 'usr-2', name: 'Elena Rostova', email: 'elena@brightloopnexus.io', role: 'finance' },
    { id: 'usr-3', name: 'Marcus Chen', email: 'marcus@brightloopnexus.io', role: 'sales' },
    { id: 'usr-4', name: 'Sarah Lin', email: 'sarah@auroraprotocol.io', role: 'customer', customerId: 'cust-1' },
    { id: 'usr-5', name: 'David Kim', email: 'david@cortexai.tech', role: 'customer', customerId: 'cust-2' },
  ] as User[],

  customers: [
    {
      id: 'cust-1',
      name: 'Sarah Lin',
      company: 'Aurora Protocol',
      email: 'sarah@auroraprotocol.io',
      phone: '+1 (415) 890-1122',
      address: '500 Howard St, San Francisco, CA',
      status: 'active',
      createdAt: '2026-08-14T10:00:00.000Z',
    },
    {
      id: 'cust-2',
      name: 'David Kim',
      company: 'Cortex Copilot',
      email: 'david@cortexai.tech',
      phone: '+1 (206) 555-0199',
      address: '1201 3rd Ave, Seattle, WA',
      status: 'active',
      createdAt: '2026-09-02T14:30:00.000Z',
    },
    {
      id: 'cust-3',
      name: 'Amara Patel',
      company: 'Lumina Goods',
      email: 'amara@luminagoods.com',
      phone: '+1 (312) 440-9831',
      address: '233 S Wacker Dr, Chicago, IL',
      status: 'active',
      createdAt: '2026-09-18T09:15:00.000Z',
    },
    {
      id: 'cust-4',
      name: 'Thomas Wright',
      company: 'Kestrel Robotics',
      email: 'thomas@kestrel.ai',
      phone: '+1 (617) 320-7711',
      address: '100 Main St, Cambridge, MA',
      status: 'lead',
      createdAt: '2026-10-10T16:45:00.000Z',
    },
  ] as Customer[],

  products: [
    { id: 'prod-1', name: 'Nexus Core Platform', description: 'Real-time subscription engine and billing fabric', active: true },
    { id: 'prod-2', name: 'Nexus Intelligence Suite', description: 'Advanced revenue analytics and forecasting models', active: true },
  ] as Product[],

  plans: [
    {
      id: 'plan-starter',
      productId: 'prod-1',
      name: 'Growth Plan',
      billingInterval: 'monthly',
      price: 2400,
      currency: 'USD',
      features: ['Up to 1,000 active subscriptions', 'Automated reconciliation', 'Standard Webhooks', 'Email Support'],
      active: true,
    },
    {
      id: 'plan-pro',
      productId: 'prod-1',
      name: 'Scale Enterprise',
      billingInterval: 'monthly',
      price: 4995,
      currency: 'USD',
      features: ['Unlimited subscriptions', 'Multi-currency invoicing', 'Real-time audit log', 'Dedicated Slack & SLA'],
      active: true,
    },
    {
      id: 'plan-annual-pro',
      productId: 'prod-1',
      name: 'Scale Enterprise (Annual)',
      billingInterval: 'annual',
      price: 47950,
      currency: 'USD',
      features: ['Everything in Scale Enterprise', 'Custom contract terms', 'Quarterly architecture review'],
      active: true,
    },
  ] as Plan[],

  quotations: [
    {
      id: 'quote-101',
      quoteNumber: 'QUO-2026-001',
      customerId: 'cust-4',
      customerName: 'Kestrel Robotics',
      items: [
        {
          planId: 'plan-pro',
          planName: 'Scale Enterprise',
          quantity: 1,
          unitPrice: 4995,
          discount: 500,
          total: 4495,
        },
      ],
      subtotal: 4995,
      totalDiscount: 500,
      total: 4495,
      status: 'sent',
      expiresAt: '2026-11-20T23:59:59.000Z',
      notes: 'Initial enterprise rollout pilot pricing discount included.',
      createdAt: '2026-10-22T11:20:00.000Z',
    },
  ] as Quotation[],

  subscriptions: [
    {
      id: 'sub-201',
      subNumber: 'SUB-2026-081',
      customerId: 'cust-1',
      customerName: 'Aurora Protocol',
      planId: 'plan-pro',
      planName: 'Scale Enterprise',
      status: 'active',
      price: 4995,
      billingInterval: 'monthly',
      currentPeriodStart: '2026-10-14T00:00:00.000Z',
      currentPeriodEnd: '2026-11-14T00:00:00.000Z',
      nextBillingDate: '2026-11-14T00:00:00.000Z',
      autoRenew: true,
      createdAt: '2026-08-14T10:30:00.000Z',
    },
    {
      id: 'sub-202',
      subNumber: 'SUB-2026-092',
      customerId: 'cust-2',
      customerName: 'Cortex Copilot',
      planId: 'plan-pro',
      planName: 'Scale Enterprise',
      status: 'active',
      price: 4995,
      billingInterval: 'monthly',
      currentPeriodStart: '2026-10-02T00:00:00.000Z',
      currentPeriodEnd: '2026-11-02T00:00:00.000Z',
      nextBillingDate: '2026-11-02T00:00:00.000Z',
      autoRenew: true,
      createdAt: '2026-09-02T15:00:00.000Z',
    },
    {
      id: 'sub-203',
      subNumber: 'SUB-2026-098',
      customerId: 'cust-3',
      customerName: 'Lumina Goods',
      planId: 'plan-starter',
      planName: 'Growth Plan',
      status: 'active',
      price: 2400,
      billingInterval: 'monthly',
      currentPeriodStart: '2026-10-18T00:00:00.000Z',
      currentPeriodEnd: '2026-11-18T00:00:00.000Z',
      nextBillingDate: '2026-11-18T00:00:00.000Z',
      autoRenew: true,
      createdAt: '2026-09-18T10:00:00.000Z',
    },
  ] as Subscription[],

  invoices: [
    {
      id: 'inv-301',
      invoiceNumber: 'INV-2026-001',
      customerId: 'cust-1',
      customerName: 'Aurora Protocol',
      subscriptionId: 'sub-201',
      items: [{ description: 'Scale Enterprise Subscription (Oct 14 - Nov 14)', amount: 4995 }],
      total: 4995,
      amountPaid: 4995,
      amountDue: 0,
      status: 'paid',
      dueDate: '2026-10-21T00:00:00.000Z',
      paidAt: '2026-10-14T11:00:00.000Z',
      createdAt: '2026-10-14T00:00:00.000Z',
    },
    {
      id: 'inv-302',
      invoiceNumber: 'INV-2026-002',
      customerId: 'cust-2',
      customerName: 'Cortex Copilot',
      subscriptionId: 'sub-202',
      items: [{ description: 'Scale Enterprise Subscription (Oct 02 - Nov 02)', amount: 4995 }],
      total: 4995,
      amountPaid: 4995,
      amountDue: 0,
      status: 'paid',
      dueDate: '2026-10-09T00:00:00.000Z',
      paidAt: '2026-10-02T16:10:00.000Z',
      createdAt: '2026-10-02T00:00:00.000Z',
    },
    {
      id: 'inv-303',
      invoiceNumber: 'INV-2026-003',
      customerId: 'cust-3',
      customerName: 'Lumina Goods',
      subscriptionId: 'sub-203',
      items: [{ description: 'Growth Plan Subscription (Oct 18 - Nov 18)', amount: 2400 }],
      total: 2400,
      amountPaid: 0,
      amountDue: 2400,
      status: 'unpaid',
      dueDate: '2026-11-04T00:00:00.000Z',
      createdAt: '2026-10-18T00:00:00.000Z',
    },
  ] as Invoice[],

  payments: [
    {
      id: 'pay-401',
      paymentNumber: 'PAY-2026-001',
      invoiceId: 'inv-301',
      invoiceNumber: 'INV-2026-001',
      customerId: 'cust-1',
      customerName: 'Aurora Protocol',
      amount: 4995,
      currency: 'USD',
      method: 'card',
      status: 'succeeded',
      isSimulated: false,
      transactionRef: 'ch_3N1K928J019XLL',
      createdAt: '2026-10-14T11:00:00.000Z',
    },
    {
      id: 'pay-402',
      paymentNumber: 'PAY-2026-002',
      invoiceId: 'inv-302',
      invoiceNumber: 'INV-2026-002',
      customerId: 'cust-2',
      customerName: 'Cortex Copilot',
      amount: 4995,
      currency: 'USD',
      method: 'ach',
      status: 'succeeded',
      isSimulated: false,
      transactionRef: 'ach_8892183011',
      createdAt: '2026-10-02T16:10:00.000Z',
    },
  ] as Payment[],

  activity: [
    { id: 'act-1', timestamp: '2026-10-22T11:20:00.000Z', type: 'quotation_created', description: 'Quotation QUO-2026-001 issued to Kestrel Robotics', actor: 'Marcus Chen' },
    { id: 'act-2', timestamp: '2026-10-18T10:00:00.000Z', type: 'subscription_created', description: 'Subscription SUB-2026-098 started for Lumina Goods', actor: 'Elena Rostova' },
    { id: 'act-3', timestamp: '2026-10-14T11:00:00.000Z', type: 'payment_received', description: 'Payment of $4,995 received for Invoice INV-2026-001', actor: 'System' },
  ] as ActivityEvent[],
};

export function logActivity(type: string, description: string, actor: string) {
  DB.activity.unshift({
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    description,
    actor,
  });
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, data: any, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlObj = new URL(req.url || '/', 'http://localhost:3000');
  const pathname = urlObj.pathname;
  const method = req.method?.toUpperCase();

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  // Auth Users
  if (pathname === '/api/auth/users' && method === 'GET') {
    sendJson(res, DB.users);
    return true;
  }

  // Auth Login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseJsonBody(req);
    const user = DB.users.find(
      (u) => u.email.toLowerCase() === (body.email || '').toLowerCase()
    );
    if (!user) {
      sendJson(res, { error: 'Invalid credentials or user not found.' }, 401);
    } else {
      sendJson(res, { user });
    }
    return true;
  }

  // Customers List & Create
  if (pathname === '/api/customers') {
    if (method === 'GET') {
      const search = urlObj.searchParams.get('search')?.toLowerCase();
      const status = urlObj.searchParams.get('status');
      let list = [...DB.customers];

      if (search) {
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            c.company.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search)
        );
      }
      if (status && status !== 'all') {
        list = list.filter((c) => c.status === status);
      }
      sendJson(res, { customers: list, total: list.length });
      return true;
    }

    if (method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.name || !body.email || !body.company) {
        sendJson(res, { error: 'Name, company, and email are required.' }, 400);
        return true;
      }
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone || '',
        address: body.address || '',
        status: body.status || 'active',
        createdAt: new Date().toISOString(),
      };
      DB.customers.unshift(newCust);
      logActivity('customer_created', `Customer ${body.company} created.`, 'Admin');
      sendJson(res, newCust, 201);
      return true;
    }
  }

  // Customer Detail & Update
  const custDetailMatch = pathname.match(/^\/api\/customers\/([^\/]+)$/);
  if (custDetailMatch) {
    const customerId = custDetailMatch[1];
    const customer = DB.customers.find((c) => c.id === customerId);
    if (!customer) {
      sendJson(res, { error: 'Customer not found' }, 404);
      return true;
    }

    if (method === 'GET') {
      sendJson(res, {
        customer,
        subscriptions: DB.subscriptions.filter((s) => s.customerId === customer.id),
        quotations: DB.quotations.filter((q) => q.customerId === customer.id),
        invoices: DB.invoices.filter((i) => i.customerId === customer.id),
        payments: DB.payments.filter((p) => p.customerId === customer.id),
      });
      return true;
    }

    if (method === 'PUT') {
      const body = await parseJsonBody(req);
      if (body.name) customer.name = body.name;
      if (body.company) customer.company = body.company;
      if (body.email) customer.email = body.email;
      if (body.phone !== undefined) customer.phone = body.phone;
      if (body.address !== undefined) customer.address = body.address;
      if (body.status) customer.status = body.status;

      logActivity('customer_updated', `Customer ${customer.company} profile updated.`, 'User');
      sendJson(res, customer);
      return true;
    }
  }

  // Products
  if (pathname === '/api/products' && method === 'GET') {
    sendJson(res, DB.products);
    return true;
  }

  // Plans List & Create
  if (pathname === '/api/plans') {
    if (method === 'GET') {
      sendJson(res, DB.plans);
      return true;
    }
    if (method === 'POST') {
      const body = await parseJsonBody(req);
      const newPlan: Plan = {
        id: `plan-${Date.now()}`,
        productId: body.productId || 'prod-1',
        name: body.name,
        billingInterval: body.billingInterval || 'monthly',
        price: Number(body.price) || 0,
        currency: 'USD',
        features: Array.isArray(body.features) ? body.features : [],
        active: true,
      };
      DB.plans.push(newPlan);
      logActivity('plan_created', `Plan ${newPlan.name} created.`, 'Admin');
      sendJson(res, newPlan, 201);
      return true;
    }
  }

  // Quotations List & Create
  if (pathname === '/api/quotations') {
    if (method === 'GET') {
      sendJson(res, DB.quotations);
      return true;
    }
    if (method === 'POST') {
      const body = await parseJsonBody(req);
      const customer = DB.customers.find((c) => c.id === body.customerId);
      const plan = DB.plans.find((p) => p.id === body.planId);
      if (!customer || !plan) {
        sendJson(res, { error: 'Valid customer and plan required' }, 400);
        return true;
      }
      const qty = Math.max(1, Number(body.quantity) || 1);
      const disc = Math.max(0, Number(body.discount) || 0);
      const subtotal = plan.price * qty;
      const total = Math.max(0, subtotal - disc);

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (Number(body.expiresDays) || 14));

      const newQuote: Quotation = {
        id: `quote-${Date.now()}`,
        quoteNumber: `QUO-2026-${String(DB.quotations.length + 1).padStart(3, '0')}`,
        customerId: customer.id,
        customerName: customer.company,
        items: [
          {
            planId: plan.id,
            planName: plan.name,
            quantity: qty,
            unitPrice: plan.price,
            discount: disc,
            total,
          },
        ],
        subtotal,
        totalDiscount: disc,
        total,
        status: 'sent',
        expiresAt: expiry.toISOString(),
        notes: body.notes || 'Proposal terms based on subscription tier.',
        createdAt: new Date().toISOString(),
      };
      DB.quotations.unshift(newQuote);
      logActivity('quotation_created', `Quotation ${newQuote.quoteNumber} created.`, 'Sales');
      sendJson(res, newQuote, 201);
      return true;
    }
  }

  // Quotation Accept & Convert
  const quoteAcceptMatch = pathname.match(/^\/api\/quotations\/([^\/]+)\/accept$/);
  if (quoteAcceptMatch && method === 'PUT') {
    const quote = DB.quotations.find((q) => q.id === quoteAcceptMatch[1]);
    if (!quote) {
      sendJson(res, { error: 'Quote not found' }, 404);
      return true;
    }
    quote.status = 'accepted';
    logActivity('quotation_accepted', `Quotation ${quote.quoteNumber} accepted.`, 'Customer');
    sendJson(res, quote);
    return true;
  }

  const quoteConvertMatch = pathname.match(/^\/api\/quotations\/([^\/]+)\/convert$/);
  if (quoteConvertMatch && method === 'POST') {
    const quote = DB.quotations.find((q) => q.id === quoteConvertMatch[1]);
    if (!quote) {
      sendJson(res, { error: 'Quote not found' }, 404);
      return true;
    }
    const item = quote.items[0];
    const plan = DB.plans.find((p) => p.id === item.planId) || DB.plans[0];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      subNumber: `SUB-2026-${String(DB.subscriptions.length + 1).padStart(3, '0')}`,
      customerId: quote.customerId,
      customerName: quote.customerName,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      price: item.total,
      billingInterval: plan.billingInterval,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      autoRenew: true,
      createdAt: now.toISOString(),
    };

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`,
      customerId: quote.customerId,
      customerName: quote.customerName,
      subscriptionId: newSub.id,
      quotationId: quote.id,
      items: [{ description: `${plan.name} Initiation (${quote.quoteNumber})`, amount: item.total }],
      total: item.total,
      amountPaid: 0,
      amountDue: item.total,
      status: 'unpaid',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now.toISOString(),
    };

    quote.status = 'converted';
    DB.subscriptions.unshift(newSub);
    DB.invoices.unshift(newInv);
    logActivity('quotation_converted', `Quotation ${quote.quoteNumber} converted to Subscription ${newSub.subNumber}.`, 'System');
    sendJson(res, { quotation: quote, subscription: newSub, invoice: newInv });
    return true;
  }

  // Subscriptions List & Create
  if (pathname === '/api/subscriptions') {
    if (method === 'GET') {
      const status = urlObj.searchParams.get('status');
      const customerId = urlObj.searchParams.get('customerId');
      let list = [...DB.subscriptions];
      if (status && status !== 'all') list = list.filter((s) => s.status === status);
      if (customerId) list = list.filter((s) => s.customerId === customerId);
      sendJson(res, list);
      return true;
    }
    if (method === 'POST') {
      const body = await parseJsonBody(req);
      const customer = DB.customers.find((c) => c.id === body.customerId);
      const plan = DB.plans.find((p) => p.id === body.planId);
      if (!customer || !plan) {
        sendJson(res, { error: 'Customer and plan required' }, 400);
        return true;
      }
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const newSub: Subscription = {
        id: `sub-${Date.now()}`,
        subNumber: `SUB-2026-${String(DB.subscriptions.length + 1).padStart(3, '0')}`,
        customerId: customer.id,
        customerName: customer.company,
        planId: plan.id,
        planName: plan.name,
        status: 'active',
        price: plan.price,
        billingInterval: plan.billingInterval,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        nextBillingDate: periodEnd.toISOString(),
        autoRenew: true,
        createdAt: now.toISOString(),
      };

      const newInv: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2026-${String(DB.invoices.length + 1).padStart(3, '0')}`,
        customerId: customer.id,
        customerName: customer.company,
        subscriptionId: newSub.id,
        items: [{ description: `${plan.name} First Period`, amount: plan.price }],
        total: plan.price,
        amountPaid: 0,
        amountDue: plan.price,
        status: 'unpaid',
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
      };

      DB.subscriptions.unshift(newSub);
      DB.invoices.unshift(newInv);
      logActivity('subscription_created', `Subscription ${newSub.subNumber} started.`, 'Admin');
      sendJson(res, { subscription: newSub, invoice: newInv }, 201);
      return true;
    }
  }

  // Subscription Actions: Pause, Resume, Cancel, Plan
  const subActionMatch = pathname.match(/^\/api\/subscriptions\/([^\/]+)\/(pause|resume|cancel|plan)$/);
  if (subActionMatch && method === 'PUT') {
    const subId = subActionMatch[1];
    const action = subActionMatch[2];
    const sub = DB.subscriptions.find((s) => s.id === subId);
    if (!sub) {
      sendJson(res, { error: 'Subscription not found' }, 404);
      return true;
    }
    if (action === 'pause') {
      sub.status = 'paused';
      sub.autoRenew = false;
      logActivity('subscription_paused', `Subscription ${sub.subNumber} paused.`, 'Admin');
    } else if (action === 'resume') {
      sub.status = 'active';
      sub.autoRenew = true;
      logActivity('subscription_resumed', `Subscription ${sub.subNumber} resumed.`, 'Admin');
    } else if (action === 'cancel') {
      sub.status = 'canceled';
      sub.canceledAt = new Date().toISOString();
      sub.effectiveCancellationDate = sub.currentPeriodEnd;
      sub.autoRenew = false;
      logActivity('subscription_canceled', `Subscription ${sub.subNumber} scheduled for cancelation.`, 'Admin');
    } else if (action === 'plan') {
      const body = await parseJsonBody(req);
      const newPlan = DB.plans.find((p) => p.id === body.newPlanId);
      if (newPlan) {
        sub.planId = newPlan.id;
        sub.planName = newPlan.name;
        sub.price = newPlan.price;
        sub.billingInterval = newPlan.billingInterval;
        logActivity('subscription_plan_changed', `Subscription ${sub.subNumber} plan changed to ${newPlan.name}.`, 'Admin');
      }
    }
    sendJson(res, sub);
    return true;
  }

  // Invoices List & Pay
  if (pathname === '/api/invoices' && method === 'GET') {
    const status = urlObj.searchParams.get('status');
    const customerId = urlObj.searchParams.get('customerId');
    let list = [...DB.invoices];
    if (status && status !== 'all') list = list.filter((i) => i.status === status);
    if (customerId) list = list.filter((i) => i.customerId === customerId);
    sendJson(res, list);
    return true;
  }

  const invoicePayMatch = pathname.match(/^\/api\/invoices\/([^\/]+)\/pay$/);
  if (invoicePayMatch && method === 'POST') {
    const inv = DB.invoices.find((i) => i.id === invoicePayMatch[1]);
    if (!inv) {
      sendJson(res, { error: 'Invoice not found' }, 404);
      return true;
    }
    const body = await parseJsonBody(req);
    const amount = inv.amountDue;
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      paymentNumber: `PAY-2026-${String(DB.payments.length + 1).padStart(3, '0')}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      amount,
      currency: 'USD',
      method: body.method || 'card',
      status: 'succeeded',
      isSimulated: body.isSimulated === true,
      transactionRef: `txn_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    inv.amountPaid += amount;
    inv.amountDue = 0;
    inv.status = 'paid';
    inv.paidAt = newPayment.createdAt;
    DB.payments.unshift(newPayment);
    logActivity('payment_recorded', `Payment of $${amount} cleared for ${inv.invoiceNumber}.`, 'Finance');
    sendJson(res, { invoice: inv, payment: newPayment });
    return true;
  }

  // Payments List
  if (pathname === '/api/payments' && method === 'GET') {
    sendJson(res, DB.payments);
    return true;
  }

  // Dashboard Metrics
  if (pathname === '/api/dashboard/metrics' && method === 'GET') {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const activeSubs = DB.subscriptions.filter((s) => s.status === 'active');
    const canceledSubs = DB.subscriptions.filter((s) => s.status === 'canceled');
    const pausedSubs = DB.subscriptions.filter((s) => s.status === 'paused');

    const upcomingRenewals = activeSubs.filter((s) => {
      const nextDate = new Date(s.nextBillingDate);
      return nextDate >= now && nextDate <= thirtyDaysOut;
    });

    const mrr = activeSubs.reduce((acc, sub) => {
      if (sub.billingInterval === 'monthly') return acc + sub.price;
      if (sub.billingInterval === 'quarterly') return acc + sub.price / 3;
      if (sub.billingInterval === 'annual') return acc + sub.price / 12;
      return acc + sub.price;
    }, 0);

    const arr = mrr * 12;

    const totalInvoiced = DB.invoices
      .filter((i) => i.status !== 'void')
      .reduce((acc, i) => acc + i.total, 0);

    const totalCollected = DB.payments
      .filter((p) => p.status === 'succeeded')
      .reduce((acc, p) => acc + p.amount, 0);

    const outstandingBalance = DB.invoices
      .filter((i) => i.status === 'unpaid' || i.status === 'overdue')
      .reduce((acc, i) => acc + i.amountDue, 0);

    const overdueInvoices = DB.invoices.filter((i) => {
      if (i.status === 'paid' || i.status === 'void') return false;
      return new Date(i.dueDate) < now;
    });

    const overdueBalance = overdueInvoices.reduce((acc, i) => acc + i.amountDue, 0);

    sendJson(res, {
      activeSubscriptions: activeSubs.length,
      newSubscriptionsThisMonth: DB.subscriptions.length,
      upcomingRenewals: upcomingRenewals.length,
      canceledSubscriptions: canceledSubs.length,
      pausedSubscriptions: pausedSubs.length,
      monthlyRecurringRevenue: Math.round(mrr),
      annualRecurringRevenue: Math.round(arr),
      totalInvoiced,
      totalCollected,
      outstandingBalance,
      overdueInvoicesCount: overdueInvoices.length,
      overdueBalance,
      recentEvents: DB.activity.slice(0, 8),
      customersCount: DB.customers.length,
    });
    return true;
  }

  // Customer Portal Account
  const portalMatch = pathname.match(/^\/api\/portal\/([^\/]+)$/);
  if (portalMatch && method === 'GET') {
    const customerId = portalMatch[1];
    const customer = DB.customers.find((c) => c.id === customerId);
    if (!customer) {
      sendJson(res, { error: 'Customer account not found' }, 404);
      return true;
    }
    sendJson(res, {
      customer,
      subscriptions: DB.subscriptions.filter((s) => s.customerId === customer.id),
      invoices: DB.invoices.filter((i) => i.customerId === customer.id),
      payments: DB.payments.filter((p) => p.customerId === customer.id),
      quotations: DB.quotations.filter((q) => q.customerId === customer.id),
    });
    return true;
  }

  return false;
}
