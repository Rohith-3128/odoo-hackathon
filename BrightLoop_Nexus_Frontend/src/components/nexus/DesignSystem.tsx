import React from 'react';

// Status Badge
export const StatusBadge: React.FC<{
  status: string;
}> = ({ status }) => {
  const s = status.toLowerCase();
  let bg = '#f5f5f5';
  let color = '#525252';
  let border = 'rgba(0,0,0,0.06)';

  if (['active', 'paid', 'succeeded', 'accepted'].includes(s)) {
    bg = 'rgba(23, 201, 100, 0.08)';
    color = '#17c964';
    border = 'rgba(23, 201, 100, 0.2)';
  } else if (['unpaid', 'sent', 'lead', 'trialing'].includes(s)) {
    bg = 'rgba(10, 10, 10, 0.05)';
    color = '#0a0a0a';
    border = 'rgba(10, 10, 10, 0.15)';
  } else if (['paused', 'draft'].includes(s)) {
    bg = 'rgba(245, 158, 11, 0.08)';
    color = '#d97706';
    border = 'rgba(245, 158, 11, 0.2)';
  } else if (['canceled', 'overdue', 'failed', 'declined'].includes(s)) {
    bg = 'rgba(239, 68, 68, 0.08)';
    color = '#ef4444';
    border = 'rgba(239, 68, 68, 0.2)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: '-0.01em',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        lineHeight: 1.2,
      }}
    >
      {status}
    </span>
  );
};

// Metric Stat Card
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  trend?: string;
}> = ({ title, value, subtitle, badge, trend }) => {
  return (
    <div
      style={{
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--border-soft)',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)', letterSpacing: '-0.01em' }}>
          {title}
        </span>
        {badge && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgb(245, 245, 245)',
              color: '#0a0a0a',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text)' }}>
        {value}
      </div>

      {(subtitle || trend) && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '6px' }}>
          {trend && <span style={{ color: '#17c964', fontWeight: 600 }}>{trend}</span>}
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};

// Page Header
export const PageHeader: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: string[];
}> = ({ title, description, action, breadcrumbs }) => {
  return (
    <div style={{ marginBottom: '28px' }}>
      {breadcrumbs && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              <span>{b}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '32px',
              fontWeight: 600,
              letterSpacing: '-0.05em',
              color: 'var(--text)',
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '6px', letterSpacing: '-0.01em' }}>
              {description}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

// Empty State
export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => {
  return (
    <div
      style={{
        padding: '64px 24px',
        textAlign: 'center',
        border: '1px dashed var(--border-soft)',
        borderRadius: '16px',
        background: 'rgb(253, 253, 253)',
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '6px' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto 20px' }}>
        {description}
      </p>
      {action}
    </div>
  );
};
