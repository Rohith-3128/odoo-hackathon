import React, { useEffect, useState } from 'react';
import { api, Plan, Product } from '../../api/client';
import { PageHeader, StatusBadge } from './DesignSystem';
import { formatCurrency } from '../../utils/pricing';
import { Plus, Check, X } from 'lucide-react';

export const ProductsPlansView: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(3500);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [featuresText, setFeaturesText] = useState('Unlimited API requests\nDedicated support SLA\nCustom domain');

  const loadData = async () => {
    try {
      const [pls, prods] = await Promise.all([api.plans.list(), api.products.list()]);
      setPlans(pls);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const features = featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      await api.plans.create({
        name,
        price,
        billingInterval,
        features,
        productId: products[0]?.id || 'prod-1',
      });

      setIsNewPlanOpen(false);
      setName('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products & Subscription Plans"
        description="Authoritative product catalog defining pricing intervals, entitlements, and features."
        breadcrumbs={['Brightloop Nexus', 'Products & Plans']}
        action={
          <button
            type="button"
            className="btn-primary"
            style={{ height: '40px', padding: '0 20px', fontSize: '13px' }}
            onClick={() => setIsNewPlanOpen(true)}
          >
            <Plus size={15} style={{ marginRight: '6px' }} />
            Create Plan
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1px solid var(--border-soft)',
              borderRadius: '16px',
              padding: '28px',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <StatusBadge status={p.active ? 'active' : 'inactive'} />
                <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {p.billingInterval} interval
                </span>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.03em' }}>{p.name}</h2>

              <div style={{ margin: '16px 0 8px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.04em' }}>
                  {formatCurrency(p.price)}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>/ {p.billingInterval}</span>
              </div>

              <ul style={{ listStyle: 'none', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                {p.features.map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="#17c964" style={{ flexShrink: 0 }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '16px', fontSize: '12px', color: 'var(--muted)' }}>
              Product: Nexus Core Platform · System ID: {p.id}
            </div>
          </div>
        ))}
      </div>

      {isNewPlanOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewPlanOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setIsNewPlanOpen(false)}>
              <X size={18} />
            </button>

            <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Define New Plan</h2>
            <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
              Add a new recurring tier to the product catalog.
            </p>

            <form onSubmit={handleCreatePlan} className="booking-form">
              <div>
                <label className="form-label">Plan Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Scale Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Price (USD) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    className="form-input"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label">Billing Interval</label>
                  <select
                    className="form-input"
                    value={billingInterval}
                    onChange={(e: any) => setBillingInterval(e.target.value)}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Plan Features (one per line)</label>
                <textarea
                  rows={4}
                  className="form-input"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ height: '44px', width: '100%', marginTop: '10px' }}>
                Publish Plan to Catalog
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
