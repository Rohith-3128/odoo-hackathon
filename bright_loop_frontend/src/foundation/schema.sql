-- ==============================================================================
-- EZbill Normalized Relational Database Schema
-- Team 1: Foundation, Auth & Database Architecture
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- 1. Organizations (Workspaces / Legal Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Roles and Permissions
CREATE TABLE IF NOT EXISTS roles_permissions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions TEXT NOT NULL -- JSON Array
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    customer_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4. Organization Memberships
CREATE TABLE IF NOT EXISTS organization_memberships (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(organization_id, user_id)
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(2) DEFAULT 'US' NOT NULL,
    tax_id VARCHAR(50),
    currency_preference VARCHAR(3) DEFAULT 'USD' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'lead', 'inactive', 'archived'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_customers_org_email ON customers(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(organization_id, status);

-- 6. Product Catalog
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);

-- 7. Subscription Plans & Pricing Tiers
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    billing_interval VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'annual'
    price INTEGER NOT NULL, -- In minor units (cents) to avoid floating point issues
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    trial_duration_days INTEGER DEFAULT 0 NOT NULL,
    features TEXT, -- JSON Array of string feature perks
    active BOOLEAN DEFAULT 1 NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_plans_product ON subscription_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON subscription_plans(active);

-- 8. Currencies
CREATE TABLE IF NOT EXISTS currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    minor_unit_factor INTEGER DEFAULT 100 NOT NULL,
    active BOOLEAN DEFAULT 1 NOT NULL
);

-- 9. Audit Events (Immutable Security & Administrative Trail)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    actor VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    metadata TEXT -- JSON encoded details
);

CREATE INDEX IF NOT EXISTS idx_audit_org_ts ON audit_events(organization_id, timestamp DESC);

-- 10. Application Settings
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(36) PRIMARY KEY,
    organization_id VARCHAR(36) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, setting_key)
);
