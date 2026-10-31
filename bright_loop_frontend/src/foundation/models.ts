/**
 * EZbill - Foundation Domain Models & Interfaces
 * Team 1: Foundation, Auth & Database Architecture
 */

export type UserRole = 'admin' | 'finance' | 'sales' | 'support' | 'customer';

export type CustomerStatus = 'active' | 'lead' | 'inactive' | 'archived';

export type BillingInterval = 'monthly' | 'quarterly' | 'annual';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
  salt: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  taxId?: string;
  currencyPreference: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  description: string;
  billingInterval: BillingInterval;
  price: number; // Stored in minor units (integer cents, e.g. 2400 = $24.00)
  currency: string;
  trialDurationDays: number;
  features: string[];
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  organizationId?: string;
  timestamp: string;
  type: string;
  description: string;
  actor: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
