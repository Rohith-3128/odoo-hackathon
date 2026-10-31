import React, { useEffect, useState } from 'react';
import { api, Customer, Subscription, Quotation, Invoice, Payment } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Search, Plus, X, ArrowRight } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Customer Detail Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState<{
    customer: Customer;
    subscriptions: Subscription[];
    quotations: Quotation[];
    invoices: Invoice[];
    payments: Payment[];
  } | null>(null);

  // New Customer Form state
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.customers.list(search, statusFilter);
      setCustomers(res.customers);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, statusFilter]);

  const handleSelectCustomer = async (id: string) => {
    try {
      const details = await api.customers.get(id);
      setSelectedCustomer(details);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) {
      setFormError('Name, company name, and email address are required.');
      return;
    }
    setFormError('');

    try {
      await api.customers.create({ name, company, email, phone, address, status: 'active' });
      setIsNewCustomerOpen(false);
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setAddress('');
      loadCustomers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create customer');
    }
  };

  return (
    <div>
      <PageHeader
        title="Customer Directory"
        description="Comprehensive customer profiles with linked contracts, subscriptions, and billing histories."
        breadcrumbs={['EZbill', 'Customers']}
        action={
          <button
            type="button"
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}
            onClick={() => setIsNewCustomerOpen(true)}
          >
            <Plus size={15} style={{ marginRight: '6px' }} />
            Add Customer
          </button>
        }
      />

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by company, name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', height: '42px', fontSize: '13px' }}
          />
        </div>

        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '160px', height: '42px', fontSize: '13px', cursor: 'pointer' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="lead">Lead</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Customer Data Table */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', overflow: 'hidden', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgb(250, 250, 250)', borderBottom: '1px solid var(--border-soft)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Company & Name</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Contact</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)' }}>Joined</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? (
              customers.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgb(253, 253, 253)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.company}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{c.name}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div>{c.email}</div>
                    {c.phone && <div style={{ color: 'var(--muted)', fontSize: '12px' }}>{c.phone}</div>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(c.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-soft)',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>View</span>
                      <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  No customers found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-card" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedCustomer(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#0a0a0a',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '20px',
                }}
              >
                {selectedCustomer.customer.company.charAt(0)}
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.04em' }}>
                  {selectedCustomer.customer.company}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Contact: {selectedCustomer.customer.name}</span>
                  <StatusBadge status={selectedCustomer.customer.status} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                padding: '16px',
                background: 'rgb(250, 250, 250)',
                borderRadius: '12px',
                border: '1px solid var(--border-soft)',
                marginBottom: '28px',
                fontSize: '13px',
              }}
            >
              <div>
                <div style={{ color: 'var(--muted)', marginBottom: '2px' }}>Email Address</div>
                <strong>{selectedCustomer.customer.email}</strong>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', marginBottom: '2px' }}>Phone</div>
                <strong>{selectedCustomer.customer.phone || 'N/A'}</strong>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', marginBottom: '2px' }}>Billing Address</div>
                <strong>{selectedCustomer.customer.address || 'N/A'}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Active Subscriptions</h3>
              {selectedCustomer.subscriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedCustomer.subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      style={{
                        padding: '14px 18px',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong>{sub.planName}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {sub.subNumber} · Renews {new Date(sub.nextBillingDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(sub.price)} / {sub.billingInterval}</span>
                        <StatusBadge status={sub.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>No subscriptions found for this account.</div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Billing Invoices</h3>
              {selectedCustomer.invoices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedCustomer.invoices.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        padding: '12px 18px',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong>{inv.invoiceNumber}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          Due {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(inv.total)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>No invoices created yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Customer Form Modal */}
      {isNewCustomerOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewCustomerOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsNewCustomerOpen(false)}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Add New Customer</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Create an enterprise customer account profile on EZbill.
            </p>

            <form onSubmit={handleCreateCustomer} className="booking-form">
              <div>
                <label className="form-label">Company Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Acme Technologies"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Primary Contact Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Work Email *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="jane@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+1 (555) 012-3456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Billing Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="100 Enterprise Way, Suite 400"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              {formError && (
                <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 500 }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                style={{ height: '44px', width: '100%', fontSize: '14px', marginTop: '12px' }}
              >
                Create Customer Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
