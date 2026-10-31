/**
 * EZbill - Foundation & Database Architecture Automated Test Suite
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Verifies relational schema, migrations, authentication, RBAC authorization,
 * multi-tenancy isolation, customer management, product/plan catalog, and transactions.
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager } from './db';
import { seedFoundationDatabase } from './seed';
import { AuthService } from './auth_service';
import { CustomerService } from './customer_service';
import { ProductPlanService } from './product_plan_service';
import { hashPassword, verifyPassword, generateSessionToken, verifySessionToken } from './crypto_util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Team 1: Foundation & Core Database Architecture', () => {
  let db: DatabaseManager;
  let auth: AuthService;
  let customers: CustomerService;
  let catalog: ProductPlanService;

  beforeEach(() => {
    // Isolated in-memory relational database for each test suite
    db = new DatabaseManager(':memory:');
    const migrationsDir = path.resolve(__dirname, '..', '..', '..', 'migrations');
    db.runMigrations(migrationsDir);
    seedFoundationDatabase(db);

    auth = new AuthService(db);
    customers = new CustomerService(db);
    catalog = new ProductPlanService(db);
  });

  describe('1. Relational Database & Migrations', () => {
    it('should successfully run schema migrations and verify table existence', () => {
      const tables = db.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      ).map(t => t.name);

      assert.ok(tables.includes('organizations'), 'organizations table should exist');
      assert.ok(tables.includes('users'), 'users table should exist');
      assert.ok(tables.includes('customers'), 'customers table should exist');
      assert.ok(tables.includes('products'), 'products table should exist');
      assert.ok(tables.includes('subscription_plans'), 'subscription_plans table should exist');
      assert.ok(tables.includes('audit_events'), 'audit_events table should exist');
      assert.ok(tables.includes('_migrations'), '_migrations table should exist');
    });

    it('should rollback database transaction on error', () => {
      assert.throws(() => {
        db.transaction(() => {
          db.run(
            "INSERT INTO organizations (id, name, slug) VALUES ('org-temp', 'Temp Org', 'temp-org')"
          );
          throw new Error('Forced failure to trigger rollback');
        });
      }, /Forced failure/);

      const found = db.queryOne('SELECT * FROM organizations WHERE id = ?', ['org-temp']);
      assert.equal(found, null, 'Transaction should have rolled back uncommitted record');
    });
  });

  describe('2. Authentication & Cryptography', () => {
    it('should securely hash passwords with PBKDF2 salt and verify them', () => {
      const password = 'CorrectHorseBatteryStaple123!';
      const { salt, hash } = hashPassword(password);

      assert.ok(salt.length >= 32, 'Salt should be at least 32 hex chars');
      assert.ok(hash.length >= 64, 'Hash should be at least 64 hex chars');

      assert.equal(verifyPassword(password, salt, hash), true, 'Valid password must verify');
      assert.equal(verifyPassword('WrongPassword', salt, hash), false, 'Invalid password must be rejected');
    });

    it('should authenticate seeded administrator and return valid token', () => {
      const result = auth.login({
        email: 'julian@ezbill.io',
        password: 'EZbillSecure2026!',
      });

      assert.equal(result.user.email, 'julian@ezbill.io');
      assert.equal(result.user.role, 'admin');
      assert.ok(result.token, 'Should return session token');

      const verified = auth.verifyToken(result.token);
      assert.ok(verified, 'Session token must verify');
      assert.equal(verified?.email, 'julian@ezbill.io');
    });

    it('should reject login with wrong password or nonexistent email', () => {
      assert.throws(() => {
        auth.login({ email: 'julian@ezbill.io', password: 'InvalidPassword' });
      }, /AUTH_FAILED/);

      assert.throws(() => {
        auth.login({ email: 'nonexistent@ezbill.io', password: 'EZbillSecure2026!' });
      }, /AUTH_FAILED/);
    });

    it('should register a new user and prevent duplicate email conflict', () => {
      const newUser = auth.register('org-ezbill-primary', {
        email: 'newfinance@ezbill.io',
        password: 'ComplexPassword123!',
        name: 'Alex Rivera',
        role: 'finance',
      });

      assert.equal(newUser.user.email, 'newfinance@ezbill.io');
      assert.equal(newUser.user.role, 'finance');

      // Duplicate registration attempt must fail
      assert.throws(() => {
        auth.register('org-ezbill-primary', {
          email: 'newfinance@ezbill.io',
          password: 'AnotherPassword123!',
          name: 'Imposter',
          role: 'finance',
        });
      }, /CONFLICT/);
    });

    it('should reject registration with invalid email or short password', () => {
      assert.throws(() => {
        auth.register('org-ezbill-primary', {
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Invalid Test',
        });
      }, /VALIDATION_ERROR/);

      assert.throws(() => {
        auth.register('org-ezbill-primary', {
          email: 'valid@ezbill.io',
          password: 'short',
          name: 'Invalid Test',
        });
      }, /VALIDATION_ERROR/);
    });
  });

  describe('3. Customer Management', () => {
    it('should create customer with persistent relational storage and validation', () => {
      const customer = customers.create('org-ezbill-primary', {
        name: 'Clara Oswald',
        company: 'Oswald Publishing LLC',
        email: 'clara@oswaldpub.com',
        phone: '+1 (555) 019-2831',
        address: '742 Evergreen Terr, Springfield, OR',
        country: 'US',
        taxId: 'US-EIN-192831',
        currencyPreference: 'USD',
        status: 'active',
      });

      assert.ok(customer.id.startsWith('cust-'));
      assert.equal(customer.company, 'Oswald Publishing LLC');
      assert.equal(customer.status, 'active');

      const retrieved = customers.getById('org-ezbill-primary', customer.id);
      assert.equal(retrieved?.email, 'clara@oswaldpub.com');
    });

    it('should prevent duplicate active customer email in same organization', () => {
      assert.throws(() => {
        customers.create('org-ezbill-primary', {
          name: 'Duplicate Sarah',
          company: 'Duplicate Co',
          email: 'sarah@auroraprotocol.io', // Already seeded
        });
      }, /CONFLICT/);
    });

    it('should list customers with pagination and search filter', () => {
      const list = customers.list('org-ezbill-primary', { search: 'Aurora', limit: 10 });
      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].company, 'Aurora Protocol');

      const all = customers.list('org-ezbill-primary', { limit: 2 });
      assert.equal(all.data.length, 2);
      assert.equal(all.pagination.limit, 2);
      assert.ok(all.pagination.total >= 4);
    });

    it('should partially update customer information (PATCH)', () => {
      const updated = customers.update('org-ezbill-primary', 'cust-1', {
        phone: '+1 (415) 999-0000',
        company: 'Aurora Protocol International',
      });

      assert.equal(updated.phone, '+1 (415) 999-0000');
      assert.equal(updated.company, 'Aurora Protocol International');
    });

    it('should safely archive customer (soft delete) to preserve financial integrity', () => {
      const archived = customers.archive('org-ezbill-primary', 'cust-1');
      assert.equal(archived.status, 'archived');

      // Default list should exclude archived
      const list = customers.list('org-ezbill-primary');
      const found = list.data.find(c => c.id === 'cust-1');
      assert.equal(found, undefined, 'Archived customer should be excluded from active list');

      // But record must still exist in DB for audit trail
      const direct = customers.getById('org-ezbill-primary', 'cust-1');
      assert.equal(direct?.status, 'archived');
    });
  });

  describe('4. Product & Subscription Plan Management', () => {
    it('should create product in catalog and retrieve it', () => {
      const product = catalog.createProduct('org-ezbill-primary', {
        name: 'EZbill Automated Tax Engine',
        description: 'Multi-jurisdictional sales tax and VAT automation',
        active: true,
      });

      assert.ok(product.id.startsWith('prod-'));
      assert.equal(product.name, 'EZbill Automated Tax Engine');

      const list = catalog.listProducts('org-ezbill-primary');
      assert.ok(list.some(p => p.id === product.id));
    });

    it('should create subscription plan with integer minor-unit pricing', () => {
      const plan = catalog.createPlan('org-ezbill-primary', {
        productId: 'prod-1',
        name: 'Scale High Volume',
        billingInterval: 'monthly',
        price: 9900, // $99.00 in minor units
        currency: 'USD',
        trialDurationDays: 14,
        features: ['50,000 monthly invoices', 'Dedicated webhook queue'],
        active: true,
      });

      assert.ok(plan.id.startsWith('plan-'));
      assert.equal(plan.price, 9900);
      assert.equal(plan.billingInterval, 'monthly');
      assert.equal(plan.version, 1);
    });

    it('should reject invalid plan price (negative or floating point)', () => {
      assert.throws(() => {
        catalog.createPlan('org-ezbill-primary', {
          productId: 'prod-1',
          name: 'Invalid Price Plan',
          billingInterval: 'monthly',
          price: -500,
        });
      }, /VALIDATION_ERROR/);

      assert.throws(() => {
        catalog.createPlan('org-ezbill-primary', {
          productId: 'prod-1',
          name: 'Invalid Float Plan',
          billingInterval: 'monthly',
          price: 49.95 as any, // Floating point forbidden
        });
      }, /VALIDATION_ERROR/);
    });

    it('should increment plan version when price changes to protect existing contracts', () => {
      const updated = catalog.updatePlan('plan-starter', {
        price: 2900, // Price increase from $24.00 to $29.00
      });

      assert.equal(updated.price, 2900);
      assert.equal(updated.version, 2, 'Version must increment when price is updated');
    });
  });

  describe('5. Multi-Tenancy & Audit Ledger', () => {
    it('should isolate customer records between different organizations', () => {
      // Create separate tenant organization
      db.run(`
        INSERT INTO organizations (id, name, slug)
        VALUES ('org-tenant-b', 'Tenant B Corp', 'tenant-b')
      `);

      customers.create('org-tenant-b', {
        name: 'Tenant B User',
        company: 'Tenant B Corp',
        email: 'user@tenantb.com',
      });

      const orgAList = customers.list('org-ezbill-primary');
      assert.ok(!orgAList.data.some(c => c.email === 'user@tenantb.com'), 'Tenant A must not see Tenant B customers');

      const orgBList = customers.list('org-tenant-b');
      assert.equal(orgBList.data.length, 1);
      assert.equal(orgBList.data[0].email, 'user@tenantb.com');
    });

    it('should record audit events for major operations', () => {
      const events = db.query<any>('SELECT * FROM audit_events ORDER BY timestamp DESC');
      assert.ok(events.length > 0, 'Audit trail must have recorded events');
      assert.ok(events.some(e => e.type === 'customer_created' || e.type === 'system_initialized'));
    });
  });
});
