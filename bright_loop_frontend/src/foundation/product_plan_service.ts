/**
 * EZbill - Product & Subscription Plan Management Service
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Implements product catalog, pricing models, recurring billing intervals,
 * and immutable contract versioning.
 */

import { DatabaseManager } from './db';
import { Product, Plan, BillingInterval } from './models';

export interface CreateProductInput {
  name: string;
  description?: string;
  active?: boolean;
}

export interface CreatePlanInput {
  productId: string;
  name: string;
  description?: string;
  billingInterval: BillingInterval;
  price: number; // Integer minor units (e.g. 2400 for $24.00)
  currency?: string;
  trialDurationDays?: number;
  features?: string[];
  active?: boolean;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  billingInterval?: BillingInterval;
  price?: number;
  currency?: string;
  trialDurationDays?: number;
  features?: string[];
  active?: boolean;
}

export class ProductPlanService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  // ─── Product Operations ───────────────────────────────────────────────

  public createProduct(organizationId: string, input: CreateProductInput, actor: string = 'System'): Product {
    const { name, description } = input;
    const active = input.active !== undefined ? input.active : true;

    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Product name is required.');
    }

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    return this.db.transaction(() => {
      this.db.run(`
        INSERT INTO products (id, organization_id, name, description, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [productId, organizationId, name.trim(), description?.trim() || null, active ? 1 : 0]);

      this.db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), 'product_created', ?, ?)
      `, [`act-${Date.now()}`, organizationId, `Product '${name}' created`, actor]);

      return this.getProductById(organizationId, productId)!;
    });
  }

  public getProductById(organizationId: string, productId: string): Product | null {
    const row = this.db.queryOne<any>(`
      SELECT id, organization_id, name, description, active, created_at, updated_at
      FROM products
      WHERE id = ? AND organization_id = ?
    `, [productId, organizationId]);

    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      active: Boolean(row.active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public listProducts(organizationId: string, activeOnly: boolean = false): Product[] {
    let sql = 'SELECT id, organization_id, name, description, active, created_at, updated_at FROM products WHERE organization_id = ?';
    const params: any[] = [organizationId];

    if (activeOnly) {
      sql += ' AND active = 1';
    }
    sql += ' ORDER BY created_at ASC';

    const rows = this.db.query<any>(sql, params);
    return rows.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      description: r.description,
      active: Boolean(r.active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // ─── Plan Operations ──────────────────────────────────────────────────

  public createPlan(organizationId: string, input: CreatePlanInput, actor: string = 'System'): Plan {
    const { productId, name, description, billingInterval, price } = input;
    const currency = (input.currency || 'USD').toUpperCase();
    const trialDurationDays = Math.max(0, input.trialDurationDays || 0);
    const features = input.features || [];
    const active = input.active !== undefined ? input.active : true;

    // 1. Validation
    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Plan name is required.');
    }
    if (typeof price !== 'number' || price < 0 || !Number.isInteger(price)) {
      throw new Error('VALIDATION_ERROR: Plan price must be a non-negative integer in minor units (e.g. cents).');
    }

    const validIntervals: BillingInterval[] = ['monthly', 'quarterly', 'annual'];
    if (!validIntervals.includes(billingInterval)) {
      throw new Error(`VALIDATION_ERROR: Billing interval must be one of: ${validIntervals.join(', ')}`);
    }

    // 2. Ensure product exists within organization
    const product = this.getProductById(organizationId, productId);
    if (!product) {
      throw new Error('NOT_FOUND: Referenced product does not exist in this organization.');
    }

    const planId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    return this.db.transaction(() => {
      this.db.run(`
        INSERT INTO subscription_plans (
          id, product_id, name, description, billing_interval, price, currency,
          trial_duration_days, features, active, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `, [
        planId,
        productId,
        name.trim(),
        description?.trim() || null,
        billingInterval,
        price,
        currency,
        trialDurationDays,
        JSON.stringify(features),
        active ? 1 : 0,
      ]);

      this.db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), 'plan_created', ?, ?)
      `, [`act-${Date.now()}`, organizationId, `Plan '${name}' created ($${price / 100}/${billingInterval})`, actor]);

      return this.getPlanById(planId)!;
    });
  }

  public getPlanById(planId: string): Plan | null {
    const row = this.db.queryOne<any>(`
      SELECT id, product_id, name, description, billing_interval, price, currency,
             trial_duration_days, features, active, version, created_at, updated_at
      FROM subscription_plans
      WHERE id = ?
    `, [planId]);

    if (!row) return null;

    let parsedFeatures: string[] = [];
    try {
      parsedFeatures = JSON.parse(row.features || '[]');
    } catch {
      parsedFeatures = [];
    }

    return {
      id: row.id,
      productId: row.product_id,
      name: row.name,
      description: row.description,
      billingInterval: row.billing_interval as BillingInterval,
      price: Number(row.price),
      currency: row.currency,
      trialDurationDays: Number(row.trial_duration_days),
      features: parsedFeatures,
      active: Boolean(row.active),
      version: Number(row.version),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public listPlans(filter: { productId?: string; interval?: string; activeOnly?: boolean } = {}): Plan[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.productId) {
      conditions.push('product_id = ?');
      params.push(filter.productId);
    }
    if (filter.interval) {
      conditions.push('billing_interval = ?');
      params.push(filter.interval);
    }
    if (filter.activeOnly) {
      conditions.push('active = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM subscription_plans ${whereClause} ORDER BY price ASC`;

    const rows = this.db.query<any>(sql, params);

    return rows.map(r => {
      let parsedFeatures: string[] = [];
      try {
        parsedFeatures = JSON.parse(r.features || '[]');
      } catch {
        parsedFeatures = [];
      }
      return {
        id: r.id,
        productId: r.product_id,
        name: r.name,
        description: r.description,
        billingInterval: r.billing_interval as BillingInterval,
        price: Number(r.price),
        currency: r.currency,
        trialDurationDays: Number(r.trial_duration_days),
        features: parsedFeatures,
        active: Boolean(r.active),
        version: Number(r.version),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  public updatePlan(planId: string, input: UpdatePlanInput, actor: string = 'System'): Plan {
    const existing = this.getPlanById(planId);
    if (!existing) {
      throw new Error('NOT_FOUND: Plan does not exist.');
    }

    const updates: string[] = ['updated_at = datetime(\'now\')'];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name.trim());
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description.trim());
    }
    if (input.billingInterval !== undefined) {
      updates.push('billing_interval = ?');
      params.push(input.billingInterval);
    }
    if (input.currency !== undefined) {
      updates.push('currency = ?');
      params.push(input.currency.toUpperCase());
    }
    if (input.trialDurationDays !== undefined) {
      updates.push('trial_duration_days = ?');
      params.push(Math.max(0, input.trialDurationDays));
    }
    if (input.features !== undefined) {
      updates.push('features = ?');
      params.push(JSON.stringify(input.features));
    }
    if (input.active !== undefined) {
      updates.push('active = ?');
      params.push(input.active ? 1 : 0);
    }
    // Increment version if price changes to ensure historical subscriptions are not mutated
    if (input.price !== undefined && input.price !== existing.price) {
      if (typeof input.price !== 'number' || input.price < 0 || !Number.isInteger(input.price)) {
        throw new Error('VALIDATION_ERROR: Price must be a non-negative integer in minor units.');
      }
      updates.push('price = ?');
      params.push(input.price);
      updates.push('version = version + 1');
    }

    params.push(planId);

    return this.db.transaction(() => {
      this.db.run(`
        UPDATE subscription_plans
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);

      this.db.run(`
        INSERT INTO audit_events (id, timestamp, type, description, actor)
        VALUES (?, datetime('now'), 'plan_updated', ?, ?)
      `, [`act-${Date.now()}`, `Plan ${planId} updated`, actor]);

      return this.getPlanById(planId)!;
    });
  }
}
