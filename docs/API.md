# EZbill REST API Specification

## 1. Global Conventions

All endpoints adhere to RESTful conventions over HTTP/JSON.

- **Base URL:** `/api`
- **Request Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <session_or_jwt_token>` (for authenticated endpoints)
- **Status Codes:**
  - `200 OK`: Successful retrieval or update.
  - `201 Created`: Successful creation.
  - `400 Bad Request`: Validation failure or malformed payload.
  - `401 Unauthorized`: Missing or invalid credentials/token.
  - `403 Forbidden`: Insufficient role permissions or cross-organization access violation.
  - `404 Not Found`: Target resource does not exist.
  - `409 Conflict`: Uniqueness constraint violation (e.g. duplicate email).
  - `500 Internal Server Error`: Unhandled server exception (sanitized in production).

---

## 2. Standard Envelope Formats

### 2.1 Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### 2.2 Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address format.",
    "details": [
      { "field": "email", "issue": "Must be a valid RFC 5322 email string" }
    ]
  }
}
```

---

## 3. Endpoints

### 3.1 Authentication & Authorization (`/api/auth`)

#### `POST /api/auth/register`
Creates a new tenant user account.
- **Access:** Public or Admin-only depending on tenant configuration.
- **Body:**
  ```json
  {
    "email": "sarah@auroraprotocol.io",
    "password": "SecurePassword123!",
    "name": "Sarah Lin",
    "role": "customer",
    "organizationId": "org-ezbill-primary"
  }
  ```
- **Response `201`:** `{ "success": true, "data": { "token": "...", "user": { ... } } }`

#### `POST /api/auth/login`
Authenticates user and returns session Bearer token.
- **Body:** `{ "email": "julian@ezbill.io", "password": "..." }`
- **Response `200`:** User entity, organization, active role, and Bearer token.

#### `POST /api/auth/logout`
Terminates active session token.
- **Access:** Authenticated.
- **Response `200`:** `{ "success": true, "message": "Successfully logged out" }`

#### `GET /api/auth/me`
Retrieves authenticated user profile, permissions, and organization.
- **Access:** Authenticated.

---

### 3.2 Customer Management (`/api/customers`)

#### `GET /api/customers`
Paginated, searchable list of customers.
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20)
  - `search` (matches `name`, `company`, `email`)
  - `status` (`active`, `lead`, `inactive`, `archived`)
- **Access:** `admin`, `finance`, `sales`, `support`.

#### `POST /api/customers`
Creates a new customer.
- **Body:**
  ```json
  {
    "name": "Sarah Lin",
    "company": "Aurora Protocol",
    "email": "sarah@auroraprotocol.io",
    "phone": "+1 (415) 890-1122",
    "address": "500 Howard St, San Francisco, CA",
    "country": "US",
    "taxId": "US-EIN-992819",
    "currencyPreference": "USD"
  }
  ```
- **Response `201`:** Created customer object with assigned ID.

#### `GET /api/customers/:id`
Retrieves customer by ID, including summary of active subscriptions and open balances.

#### `PATCH /api/customers/:id`
Updates customer fields (partial update).

#### `DELETE /api/customers/:id`
Safe archival: marks customer status as `archived` to preserve historical financial records.

---

### 3.3 Product Catalog (`/api/products`)

#### `GET /api/products`
Lists all products (filterable by `active=true/false`).

#### `POST /api/products`
Creates a new product.
- **Access:** `admin`, `finance`.
- **Body:** `{ "name": "EZbill Revenue Suite", "description": "...", "active": true }`

#### `PATCH /api/products/:id`
Updates product metadata or toggles active status.

---

### 3.4 Subscription Plans (`/api/plans`)

#### `GET /api/plans`
Lists available plans (filterable by `productId`, `interval`, `active`).

#### `POST /api/plans`
Creates a new subscription plan.
- **Access:** `admin`, `finance`.
- **Body:**
  ```json
  {
    "productId": "prod-1",
    "name": "Scale Enterprise",
    "billingInterval": "monthly",
    "price": 4995,
    "currency": "USD",
    "trialDurationDays": 14,
    "features": ["Unlimited subscriptions", "Dedicated Slack SLA"],
    "active": true
  }
  ```
- **Validation Rules:**
  - `price` must be an integer >= 0 (minor units).
  - `billingInterval` must be one of `monthly`, `quarterly`, `annual`.
  - `currency` must be a supported 3-letter ISO code.

#### `PATCH /api/plans/:id`
Updates plan active status or details. Note: Changing price increments `version` so existing customer subscriptions retain their locked historical rate.

---

### 3.5 Audit Ledger (`/api/audit-events`)

#### `GET /api/audit-events`
Lists paginated historical activity events for security and compliance audits.
- **Access:** `admin`, `finance`.
