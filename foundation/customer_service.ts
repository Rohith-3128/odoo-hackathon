/**
 * EZbill - Customer Management Service
 * Team 1: Foundation, Auth & Database Architecture
 *
 * Implements complete customer lifecycle: creation, retrieval, paginated search,
 * filtering, partial updates, and safe archival (soft-delete).
 */

import { DatabaseManager } from './db';
import { Customer, CustomerStatus, PaginatedResult } from './models';

export interface CreateCustomerInput {
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  taxId?: string;
  currencyPreference?: string;
  status?: CustomerStatus;
}

export interface UpdateCustomerInput {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  taxId?: string;
  currencyPreference?: string;
  status?: CustomerStatus;
}

export interface CustomerFilterOptions {
  search?: string;
  status?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export class CustomerService {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(organizationId: string, input: CreateCustomerInput, actor: string = 'System'): Customer {
    const { name, company, email, phone, address, taxId } = input;
    const country = (input.country || 'US').toUpperCase();
    const currencyPreference = (input.currencyPreference || 'USD').toUpperCase();
    const status: CustomerStatus = input.status || 'active';

    // 1. Validation
    if (!name || name.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Contact name is required.');
    }
    if (!company || company.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Company name is required.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('VALIDATION_ERROR: A valid email address is required.');
    }

    const validStatuses: CustomerStatus[] = ['active', 'lead', 'inactive', 'archived'];
    if (!validStatuses.includes(status)) {
      throw new Error(`VALIDATION_ERROR: Status must be one of: ${validStatuses.join(', ')}`);
    }

    // 2. Prevent duplicate active customer emails within the same organization
    const existing = this.db.queryOne<any>(`
      SELECT id FROM customers
      WHERE organization_id = ? AND LOWER(email) = ? AND status != 'archived'
    `, [organizationId, email.toLowerCase().trim()]);

    if (existing) {
      throw new Error('CONFLICT: An active customer with this email already exists in this organization.');
    }

    const customerId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    return this.db.transaction(() => {
      this.db.run(`
        INSERT INTO customers (
          id, organization_id, name, company, email, phone, address, country,
          tax_id, currency_preference, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        customerId,
        organizationId,
        name.trim(),
        company.trim(),
        email.toLowerCase().trim(),
        phone?.trim() || null,
        address?.trim() || null,
        country,
        taxId?.trim() || null,
        currencyPreference,
        status,
      ]);

      // Audit event
      this.db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), 'customer_created', ?, ?)
      `, [`act-${Date.now()}`, organizationId, `Customer '${company}' (${name}) created`, actor]);

      return this.getById(organizationId, customerId)!;
    });
  }

  public getById(organizationId: string, customerId: string): Customer | null {
    const row = this.db.queryOne<any>(`
      SELECT id, organization_id, name, company, email, phone, address, country,
             tax_id, currency_preference, status, created_at, updated_at
      FROM customers
      WHERE id = ? AND organization_id = ?
    `, [customerId, organizationId]);

    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      company: row.company,
      email: row.email,
      phone: row.phone,
      address: row.address,
      country: row.country,
      taxId: row.tax_id,
      currencyPreference: row.currency_preference,
      status: row.status as CustomerStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public list(organizationId: string, options: CustomerFilterOptions = {}): PaginatedResult<Customer> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['organization_id = ?'];
    const params: any[] = [organizationId];

    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    } else {
      // By default exclude archived unless specifically requested
      conditions.push("status != 'archived'");
    }

    if (options.country) {
      conditions.push('country = ?');
      params.push(options.country.toUpperCase());
    }

    if (options.search) {
      conditions.push('(LOWER(name) LIKE ? OR LOWER(company) LIKE ? OR LOWER(email) LIKE ?)');
      const searchPattern = `%${options.search.toLowerCase().trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.join(' AND ');

    const countRow = this.db.queryOne<any>(`
      SELECT COUNT(*) as total FROM customers WHERE ${whereClause}
    `, params);
    const total = countRow ? Number(countRow.total) : 0;

    const rows = this.db.query<any>(`
      SELECT id, organization_id, name, company, email, phone, address, country,
             tax_id, currency_preference, status, created_at, updated_at
      FROM customers
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const data: Customer[] = rows.map(r => ({
      id: r.id,
      organizationId: r.organization_id,
      name: r.name,
      company: r.company,
      email: r.email,
      phone: r.phone,
      address: r.address,
      country: r.country,
      taxId: r.tax_id,
      currencyPreference: r.currency_preference,
      status: r.status as CustomerStatus,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  public update(
    organizationId: string,
    customerId: string,
    input: UpdateCustomerInput,
    actor: string = 'System'
  ): Customer {
    const existing = this.getById(organizationId, customerId);
    if (!existing) {
      throw new Error('NOT_FOUND: Customer does not exist.');
    }

    if (input.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
        throw new Error('VALIDATION_ERROR: A valid email address is required.');
      }
      const duplicate = this.db.queryOne<any>(`
        SELECT id FROM customers
        WHERE organization_id = ? AND LOWER(email) = ? AND id != ? AND status != 'archived'
      `, [organizationId, input.email.toLowerCase().trim(), customerId]);

      if (duplicate) {
        throw new Error('CONFLICT: Another active customer with this email already exists.');
      }
    }

    const updates: string[] = ['updated_at = datetime(\'now\')'];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name.trim());
    }
    if (input.company !== undefined) {
      updates.push('company = ?');
      params.push(input.company.trim());
    }
    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email.toLowerCase().trim());
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?');
      params.push(input.phone?.trim() || null);
    }
    if (input.address !== undefined) {
      updates.push('address = ?');
      params.push(input.address?.trim() || null);
    }
    if (input.country !== undefined) {
      updates.push('country = ?');
      params.push(input.country.toUpperCase());
    }
    if (input.taxId !== undefined) {
      updates.push('tax_id = ?');
      params.push(input.taxId?.trim() || null);
    }
    if (input.currencyPreference !== undefined) {
      updates.push('currency_preference = ?');
      params.push(input.currencyPreference.toUpperCase());
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    params.push(customerId, organizationId);

    return this.db.transaction(() => {
      this.db.run(`
        UPDATE customers
        SET ${updates.join(', ')}
        WHERE id = ? AND organization_id = ?
      `, params);

      this.db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), 'customer_updated', ?, ?)
      `, [`act-${Date.now()}`, organizationId, `Customer ${customerId} updated`, actor]);

      return this.getById(organizationId, customerId)!;
    });
  }

  public archive(organizationId: string, customerId: string, actor: string = 'System'): Customer {
    const existing = this.getById(organizationId, customerId);
    if (!existing) {
      throw new Error('NOT_FOUND: Customer does not exist.');
    }

    return this.db.transaction(() => {
      this.db.run(`
        UPDATE customers
        SET status = 'archived', updated_at = datetime('now')
        WHERE id = ? AND organization_id = ?
      `, [customerId, organizationId]);

      this.db.run(`
        INSERT INTO audit_events (id, organization_id, timestamp, type, description, actor)
        VALUES (?, ?, datetime('now'), 'customer_archived', ?, ?)
      `, [`act-${Date.now()}`, organizationId, `Customer ${customerId} safely archived`, actor]);

      return this.getById(organizationId, customerId)!;
    });
  }
}
