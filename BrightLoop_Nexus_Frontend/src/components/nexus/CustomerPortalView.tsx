import React, { useEffect, useState } from 'react';
import { api, Customer, Subscription, Invoice, Payment, Quotation } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Shield } from 'lucide-react';

interface CustomerPortalProps {
  currentCustomerId: string;
}

export const CustomerPortalView: React.FC<CustomerPortalProps> = ({ currentCustomerId }) => {
  const [data, setData] = useState<{
    customer: Customer;
    subscriptions: Subscription[];
    invoices: Invoice[];
    payments: Payment[];
    quotations: Quotation[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const loadPortalData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.portal.getAccount(currentCustomerId);
      setData(res);
      setEditPhone(res.customer.phone || '');
      setEditAddress(res.customer.address || '');
    } catch (err: any) {
      setError(err.message || 'Access denied or failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCustomerId) {
      loadPortalData();
    }
  }, [currentCustomerId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    try {
      await api.customers.update(data.customer.id, {
        phone: editPhone,
        address: editAddress,
      });
      setProfileSuccess('Profile contact information updated.');
      setIsEditingProfile(false);
      loadPortalData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    try {
      await api.invoices.pay(invoiceId, { method: 'card', isSimulated: true });
      alert('Invoice paid successfully via Customer Portal.');
      loadPortalData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRequestCancel = async (subId: string) => {
    if (!confirm('Are you sure you want to request cancellation for this subscription?')) return;
    try {
      await api.subscriptions.cancel(subId);
      alert('Cancellation request processed. Service will remain active until current billing period end.');
      loadPortalData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
        Authenticating customer session and loading private portal records...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px', background: 'rgba(239,68,68,0.06)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
        <h3 style={{ color: '#ef4444', fontWeight: 600, marginBottom: '6px' }}>Access Control Restriction</h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {error || 'Unable to access requested customer account. Please ensure valid authorization.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Customer Portal — ${data.customer.company}`}
        description="Self-service portal for managing active subscriptions, invoices, and billing contact details."
        breadcrumbs={['Customer Portal', data.customer.company]}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', background: 'rgb(245, 245, 245)', padding: '6px 14px', borderRadius: '9999px' }}>
            <Shield size={13} color="#17c964" />
            <span>Encrypted Self-Service Session</span>
          </div>
        }
      />

      {profileSuccess && (
        <div style={{ padding: '12px 16px', background: 'rgba(23, 201, 100, 0.1)', color: '#17c964', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
          {profileSuccess}
        </div>
      )}

      {/* Account Profile Card */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff', padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.03em' }}>Account Profile</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Authorized billing contact information</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid var(--border-soft)',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isEditingProfile ? 'Cancel' : 'Edit Contact Info'}
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Billing Address</label>
              <input
                type="text"
                className="form-input"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}>
                Save Updated Details
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--muted)' }}>Primary Contact</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{data.customer.name}</div>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Account Email</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{data.customer.email}</div>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Phone</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{data.customer.phone || 'N/A'}</div>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Billing Address</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{data.customer.address || 'N/A'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff', padding: '24px', marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Your Subscriptions
        </h2>

        {data.subscriptions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.subscriptions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgb(253, 253, 253)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px' }}>{sub.planName}</strong>
                    <StatusBadge status={sub.status} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                    {sub.subNumber} · Next billing date: {new Date(sub.nextBillingDate).toLocaleDateString()}
                  </div>
                  {sub.status === 'canceled' && sub.effectiveCancellationDate && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>
                      Access active until {new Date(sub.effectiveCancellationDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{formatCurrency(sub.price)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>per {sub.billingInterval}</div>
                  </div>

                  {sub.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => handleRequestCancel(sub.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        color: '#ef4444',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Request Cancellation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: '13px' }}>No active subscriptions on this account.</div>
        )}
      </div>

      {/* Invoices */}
      <div style={{ border: '1px solid var(--border-soft)', borderRadius: '16px', background: '#ffffff', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.03em', marginBottom: '16px' }}>
          Billing Invoices & Receipts
        </h2>

        {data.invoices.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--muted)' }}>
                <th style={{ padding: '10px 14px' }}>Invoice #</th>
                <th style={{ padding: '10px 14px' }}>Total</th>
                <th style={{ padding: '10px 14px' }}>Due Date</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '14px', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '14px', fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                  <td style={{ padding: '14px' }}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td style={{ padding: '14px' }}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    {inv.status === 'unpaid' ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handlePayInvoice(inv.id)}
                        style={{ height: '30px', padding: '0 14px', fontSize: '12px', borderRadius: '8px' }}
                      >
                        Pay {formatCurrency(inv.amountDue)}
                      </button>
                    ) : (
                      <span style={{ color: '#17c964', fontWeight: 600, fontSize: '12px' }}>
                        Paid In Full
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: '13px' }}>No invoices found.</div>
        )}
      </div>
    </div>
  );
};
