/**
 * EZbill - Database Seeder
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Populates persistent normalized database with foundational enterprise records.
 */

import { DatabaseManager } from './db';
import { hashPassword } from './crypto_util';

export function seedFoundationDatabase(db: DatabaseManager): void {
  // Check if already seeded
  const existingOrg = db.queryOne<{ id: string }>('SELECT id FROM organizations WHERE id = ?', ['org-ezbill-primary']);
  if (existingOrg) {
    return; // Already initialized
  }

  db.transaction(() => {
    // 1. Primary Organization
    db.run(`
      INSERT INTO organizations (id, name, slug, currency, timezone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, ['org-ezbill-primary', 'EZbill Enterprise Hub', 'ezbill-primary', 'USD', 'UTC']);

    // 2. Roles & Permissions
    const roles = [
      {
        id: 'role-admin',
        name: 'admin',
        desc: 'Full administrative access across all organization modules',
        perms: ['*'],
      },
      {
        id: 'role-finance',
        name: 'finance',
        desc: 'Financial controller: billing, invoices, plans, tax, and reconciliation',
        perms: ['billing:*', 'invoices:*', 'customers:read', 'plans:*', 'reports:*'],
      },
      {
        id: 'role-sales',
        name: 'sales',
        desc: 'Sales executive: quotations, customer leads, and plan previews',
        perms: ['quotations:*', 'customers:*', 'plans:read', 'subscriptions:read'],
      },
      {
        id: 'role-support',
        name: 'support',
        desc: 'Customer support staff: read accounts, view open invoices and issues',
        perms: ['customers:read', 'subscriptions:read', 'invoices:read'],
      },
      {
        id: 'role-customer',
        name: 'customer',
        desc: 'Self-service customer portal user',
        perms: ['portal:read', 'portal:invoices:read', 'portal:payments:create'],
      },
    ];

    for (const r of roles) {
      db.run(`
        INSERT INTO roles_permissions (id, name, description, permissions)
        VALUES (?, ?, ?, ?)
      `, [r.id, r.name, r.desc, JSON.stringify(r.perms)]);
    }

    // 3. Currencies
    const currencies = [
      ['USD', 'United States Dollar', '$', 100, 1],
      ['EUR', 'Euro', '€', 100, 1],
      ['GBP', 'British Pound', '£', 100, 1],
      ['INR', 'Indian Rupee', '₹', 100, 1],
    ];
    for (const c of currencies) {
      db.run(`
        INSERT OR IGNORE INTO currencies (code, name, symbol, minor_unit_factor, active)
        VALUES (?, ?, ?, ?, ?)
      `, c);
    }

    // 4. Default Passwords (PBKDF2 salted hash for 'EZbillSecure2026!')
    const defaultCreds = hashPassword('EZbillSecure2026!');

    // 5. Initial Users
    const users = [
      ['usr-1', 'org-ezbill-primary', 'julian@ezbill.io', defaultCreds.hash, defaultCreds.salt, 'Julian Vance', 'admin', 1, null],
      ['usr-2', 'org-ezbill-primary', 'elena@ezbill.io', defaultCreds.hash, defaultCreds.salt, 'Elena Rostova', 'finance', 1, null],
      ['usr-3', 'org-ezbill-primary', 'marcus@ezbill.io', defaultCreds.hash, defaultCreds.salt, 'Marcus Chen', 'sales', 1, null],
      ['usr-4', 'org-ezbill-primary', 'sarah@auroraprotocol.io', defaultCreds.hash, defaultCreds.salt, 'Sarah Lin', 'customer', 1, 'cust-1'],
      ['usr-5', 'org-ezbill-primary', 'david@cortexai.tech', defaultCreds.hash, defaultCreds.salt, 'David Kim', 'customer', 1, 'cust-2'],
    ];

    for (const u of users) {
      db.run(`
        INSERT INTO users (id, organization_id, email, password_hash, salt, name, role, is_active, customer_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, u);

      // Add membership
      db.run(`
        INSERT INTO organization_memberships (id, organization_id, user_id, role, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [`mem-${u[0]}`, u[1], u[0], u[6]]);
    }

    // 6. Customers
    const customers = [
      [
        'cust-1', 'org-ezbill-primary', 'Sarah Lin', 'Aurora Protocol', 'sarah@auroraprotocol.io',
        '+1 (415) 890-1122', '500 Howard St, San Francisco, CA', 'US', 'US-EIN-992819', 'USD', 'active',
      ],
      [
        'cust-2', 'org-ezbill-primary', 'David Kim', 'Cortex Copilot', 'david@cortexai.tech',
        '+1 (206) 555-0199', '1201 3rd Ave, Seattle, WA', 'US', 'US-EIN-774102', 'USD', 'active',
      ],
      [
        'cust-3', 'org-ezbill-primary', 'Amara Patel', 'Lumina Goods', 'amara@luminagoods.com',
        '+1 (312) 440-9831', '233 S Wacker Dr, Chicago, IL', 'US', 'US-EIN-663810', 'USD', 'active',
      ],
      [
        'cust-4', 'org-ezbill-primary', 'Thomas Wright', 'Kestrel Robotics', 'thomas@kestrel.ai',
        '+1 (617) 320-7711', '100 Main St, Cambridge, MA', 'US', 'US-EIN-551029', 'USD', 'lead',
      ],
    ];

    for (const c of customers) {
      db.run(`
        INSERT INTO customers (id, organization_id, name, company, email, phone, address, country, tax_id, currency_preference, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, c);
    }

    // 7. Products
    const products = [
      ['prod-1', 'org-ezbill-primary', 'EZbill Core Billing Platform', 'Real-time subscription engine and billing fabric', 1],
      ['prod-2', 'org-ezbill-primary', 'EZbill Revenue Intelligence Suite', 'Advanced revenue analytics and forecasting models', 1],
    ];

    for (const p of products) {
      db.run(`
        INSERT INTO products (id, organization_id, name, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, p);
    }

    // 8. Subscription Plans
    const plans = [
      [
        'plan-starter', 'prod-1', 'Growth Plan', 'Essential subscription infrastructure for scaling startups',
        'monthly', 2400, 'USD', 14,
        JSON.stringify(['Up to 1,000 active subscriptions', 'Automated reconciliation', 'Standard Webhooks', 'Email Support']),
        1, 1,
      ],
      [
        'plan-pro', 'prod-1', 'Scale Enterprise', 'High-volume billing engine with real-time audit ledger',
        'monthly', 4995, 'USD', 0,
        JSON.stringify(['Unlimited subscriptions', 'Multi-currency invoicing', 'Real-time audit log', 'Dedicated Slack & SLA']),
        1, 1,
      ],
      [
        'plan-annual-pro', 'prod-1', 'Scale Enterprise (Annual)', 'Full enterprise platform with discounted annual commitment',
        'annual', 47950, 'USD', 0,
        JSON.stringify(['Everything in Scale Enterprise', 'Custom contract terms', 'Quarterly architecture review']),
        1, 1,
      ],
    ];

    for (const pl of plans) {
      db.run(`
        INSERT INTO subscription_plans (id, product_id, name, description, billing_interval, price, currency, trial_duration_days, features, active, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, pl);
    }

    // 9. Initial Audit Events
    const initialEvents = [
      ['act-init-1', 'org-ezbill-primary', 'system_initialized', 'EZbill persistent relational database engine initialized', 'System'],
      ['act-init-2', 'org-ezbill-primary', 'customer_created', 'Customer Aurora Protocol (cust-1) provisioned', 'System'],
      ['act-init-3', 'org-ezbill-primary', 'plans_published', 'Default subscription plans activated for catalog', 'Julian Vance'],
    ];

    for (const ev of initialEvents) {
      db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), ?, ?, ?)
      `, ev);
    }
  });
}
