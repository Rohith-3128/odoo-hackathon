import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { billingRoutes, createBillingDB } from './src/billing/billing_routes';
import { workflowRoutes } from './src/workflow/workflow_routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial In-Memory Authority Database for EZbill
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'finance' | 'sales' | 'customer';
  customerId?: string;
}

interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'lead' | 'inactive';
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

interface Plan {
  id: string;
  productId: string;
  name: string;
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  price: number;
  currency: string;
  features: string[];
  active: boolean;
}

interface QuotationItem {
  planId: string;
  planName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Quotation {
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

interface Subscription {
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

interface InvoiceItem {
  description: string;
  amount: number;
}

interface Invoice {
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

interface Payment {
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

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  actor: string;
}

// Database state
const DB = {
  users: [
    { id: 'usr-1', name: 'Julian Vance', email: 'julian@ezbill.io', role: 'admin' },
    { id: 'usr-2', name: 'Elena Rostova', email: 'elena@ezbill.io', role: 'finance' },
    { id: 'usr-3', name: 'Marcus Chen', email: 'marcus@ezbill.io', role: 'sales' },
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
    { id: 'prod-1', name: 'EZbill Core Billing Platform', description: 'Real-time subscription engine and billing fabric', active: true },
    { id: 'prod-2', name: 'EZbill Revenue Intelligence Suite', description: 'Advanced revenue analytics and forecasting models', active: true },
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
      price: 47950, // 20% discount
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

function logActivity(type: string, description: string, actor: string) {
  DB.activity.unshift({
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type,
    description,
    actor,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Teammate 3: Billing & Financial Engine APIs
  const billingDB = createBillingDB();
  app.use(billingRoutes(DB, billingDB));

  // Teammate 2: Quotations & Subscription Lifecycle Workflow APIs
  app.use(workflowRoutes(DB, billingDB));

  // -------------------------------------------------------------
  // AUTHENTICATION APIs
  // -------------------------------------------------------------
  app.get('/api/auth/users', (req, res) => {
    res.json(DB.users);
  });

  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    const user = DB.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials or user not found.' });
    }
    res.json({ user });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, company, role, phone, address } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const existingUser = DB.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userRole = role === 'admin' || role === 'finance' || role === 'sales' ? role : 'customer';

    let customerId: string | undefined;
    if (userRole === 'customer') {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name,
        company: company || `${name}'s Organization`,
        email,
        phone: phone || '',
        address: address || '',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      DB.customers.unshift(newCust);
      customerId = newCust.id;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role: userRole,
      customerId,
    };

    DB.users.push(newUser);
    logActivity('user_registered', `New ${userRole} account registered for ${name} (${email}).`, 'Auth');

    res.status(201).json({ user: newUser });
  });

  // -------------------------------------------------------------
  // CUSTOMERS APIs
  // -------------------------------------------------------------
  app.get('/api/customers', (req, res) => {
    const { search, status } = req.query;
    let list = [...DB.customers];

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter((c) => c.status === status);
    }

    res.json({
      customers: list,
      total: list.length,
    });
  });

  app.post('/api/customers', (req, res) => {
    const { name, company, email, phone, address, status } = req.body;
    if (!name || !email || !company) {
      return res.status(400).json({ error: 'Name, company, and email are required.' });
    }

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name,
      company,
      email,
      phone: phone || '',
      address: address || '',
      status: status || 'active',
      createdAt: new Date().toISOString(),
    };

    DB.customers.unshift(newCust);
    logActivity('customer_created', `New customer ${company} (${name}) created.`, 'Admin');
    res.status(201).json(newCust);
  });

  app.get('/api/customers/:id', (req, res) => {
    const customer = DB.customers.find((c) => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const customerSubs = DB.subscriptions.filter((s) => s.customerId === customer.id);
    const customerQuotes = DB.quotations.filter((q) => q.customerId === customer.id);
    const customerInvoices = DB.invoices.filter((i) => i.customerId === customer.id);
    const customerPayments = DB.payments.filter((p) => p.customerId === customer.id);

    res.json({
      customer,
      subscriptions: customerSubs,
      quotations: customerQuotes,
      invoices: customerInvoices,
      payments: customerPayments,
    });
  });

  app.put('/api/customers/:id', (req, res) => {
    const customer = DB.customers.find((c) => c.id === req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { name, company, email, phone, address, status } = req.body;
    if (name) customer.name = name;
    if (company) customer.company = company;
    if (email) customer.email = email;
    if (phone !== undefined) customer.phone = phone;
    if (address !== undefined) customer.address = address;
    if (status) customer.status = status;

    logActivity('customer_updated', `Customer profile ${customer.company} updated.`, 'User');
    res.json(customer);
  });

  // -------------------------------------------------------------
  // PRODUCTS & PLANS APIs
  // -------------------------------------------------------------
  app.get('/api/products', (req, res) => {
    res.json(DB.products);
  });

  app.get('/api/plans', (req, res) => {
    res.json(DB.plans);
  });

  app.post('/api/plans', (req, res) => {
    const { name, productId, billingInterval, price, features } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Plan name and price are required.' });
    }

    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      productId: productId || 'prod-1',
      name,
      billingInterval: billingInterval || 'monthly',
      price: Number(price),
      currency: 'USD',
      features: Array.isArray(features) ? features : [],
      active: true,
    };

    DB.plans.push(newPlan);
    logActivity('plan_created', `New plan '${name}' created at $${price}/${billingInterval}.`, 'Admin');
    res.status(201).json(newPlan);
  });

  // Note: Teammate 2 Quotations and Subscriptions routes are mounted above via workflowRoutes(DB, billingDB)



  // -------------------------------------------------------------
  // INVOICES & PAYMENTS APIs
  // -------------------------------------------------------------
  app.get('/api/invoices', (req, res) => {
    const { status, customerId } = req.query;
    let list = [...DB.invoices];

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter((i) => i.status === status);
    }
    if (customerId && typeof customerId === 'string') {
      list = list.filter((i) => i.customerId === customerId);
    }

    res.json(list);
  });

  app.get('/api/payments', (req, res) => {
    res.json(DB.payments);
  });

  app.post('/api/invoices/:id/pay', (req, res) => {
    const inv = DB.invoices.find((i) => i.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    if (inv.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already fully paid.' });
    }

    const { method, isSimulated } = req.body;
    const paymentAmount = inv.amountDue;

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      paymentNumber: `PAY-2026-${String(DB.payments.length + 1).padStart(3, '0')}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      amount: paymentAmount,
      currency: 'USD',
      method: method || 'card',
      status: 'succeeded',
      isSimulated: isSimulated === true,
      transactionRef: `sim_txn_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    inv.amountPaid += paymentAmount;
    inv.amountDue = 0;
    inv.status = 'paid';
    inv.paidAt = newPayment.createdAt;

    DB.payments.unshift(newPayment);

    logActivity('payment_recorded', `Payment of $${paymentAmount} processed for ${inv.invoiceNumber} (${isSimulated ? 'Simulated' : 'Confirmed'}).`, 'Finance');

    res.json({ invoice: inv, payment: newPayment });
  });

  // -------------------------------------------------------------
  // DASHBOARD METRICS API (Authoritative calculation from database)
  // -------------------------------------------------------------
  app.get('/api/dashboard/metrics', (req, res) => {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Active, canceled, upcoming subscriptions
    const activeSubs = DB.subscriptions.filter((s) => s.status === 'active');
    const canceledSubs = DB.subscriptions.filter((s) => s.status === 'canceled');
    const pausedSubs = DB.subscriptions.filter((s) => s.status === 'paused');

    // Upcoming renewals in next 30 days
    const upcomingRenewals = activeSubs.filter((s) => {
      const nextDate = new Date(s.nextBillingDate);
      return nextDate >= now && nextDate <= thirtyDaysOut;
    });

    // Authoritative MRR calculation normalized by interval
    const mrr = activeSubs.reduce((acc, sub) => {
      if (sub.billingInterval === 'monthly') return acc + sub.price;
      if (sub.billingInterval === 'quarterly') return acc + sub.price / 3;
      if (sub.billingInterval === 'annual') return acc + sub.price / 12;
      return acc + sub.price;
    }, 0);

    const arr = mrr * 12;

    // Financial reconciliation: Invoiced Revenue vs Collected Cash vs Outstanding
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

    res.json({
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
  });

  // -------------------------------------------------------------
  // CUSTOMER PORTAL API (Role-restricted customer view)
  // -------------------------------------------------------------
  app.get('/api/portal/:customerId', (req, res) => {
    const customer = DB.customers.find((c) => c.id === req.params.customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer account not found' });
    }

    const subscriptions = DB.subscriptions.filter((s) => s.customerId === customer.id);
    const invoices = DB.invoices.filter((i) => i.customerId === customer.id);
    const payments = DB.payments.filter((p) => p.customerId === customer.id);
    const quotations = DB.quotations.filter((q) => q.customerId === customer.id);

    res.json({
      customer,
      subscriptions,
      invoices,
      payments,
      quotations,
    });
  });

  // -------------------------------------------------------------
  // VITE / STATIC MIDDLEWARE
  // -------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EZbill] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
