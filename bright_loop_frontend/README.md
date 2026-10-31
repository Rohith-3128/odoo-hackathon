# EZbill Subscription & Billing Operating System

A unified creative agency landing platform and enterprise subscription management operating system built with React 19, TypeScript, Vite, and custom CSS.

---

## Architecture Overview

```
                                      ┌────────────────────────────────────────┐
                                      │              Browser Client            │
                                      │  (EZbill Landing Hero + EZbill Workspace)     │
                                      └──────────────────┬─────────────────────┘
                                                         │
                                               /api/* HTTP Fetch
                                                         │
                                                         ▼
                                      ┌────────────────────────────────────────┐
                                      │         Vite Dev Server Plugin         │
                                      │          (vite.config.ts)              │
                                      └──────────────────┬─────────────────────┘
                                                         │
                                                         ▼
                                      ┌────────────────────────────────────────┐
                                      │     Authoritative In-Memory Engine     │
                                      │          (src/api/serverApi.ts)        │
                                      └──────────────────┬─────────────────────┘
                                                         │
                                      ┌──────────────────┴─────────────────────┐
                                      │  - Customers & Organizations           │
                                      │  - Products & Pricing Plans            │
                                      │  - Quotations & Acceptance             │
                                      │  - Subscriptions & Proration Engine    │
                                      │  - Invoices & Payment Ledger           │
                                      │  - Audit Logs & Security Tracing       │
                                      └────────────────────────────────────────┘
```

### 1. Landing Experience (EZbill)
- **Design Philosophy**: Minimalist, black-and-white editorial aesthetic with tight negative letter-spacing (`-0.08em` to `-0.04em`).
- **Typography**: Google Fonts `Source Serif 4` (weights 400, 600, italic), `Inter` (weights 400, 500, 600, 700), and `Cedarville Cursive` for brand logos.
- **Custom CSS**: Pure CSS variables (`--bg`, `--text`, `--muted`, `--button-bg`, `--button-text`, `--border-soft`, `--green`), hardware-accelerated keyframe animations (`line-pulse`, `marquee-left`), curved line borders (`2.5px solid #FCFAF8`, 80% radius), and progressive edge fade blur.
- **Interactive Capabilities**:
  - Full-screen navigation drawer overlay with 48px typography.
  - Interactive Plans modal with real-time billing toggle (monthly vs quarterly savings).
  - 15-minute intro booking modal with calendar date selection and validation against double-booking.
  - Informational overlays for Projects, Team, FAQs, and Contact.

### 2. EZbill (Subscription Operating System)
Integrated subscription lifecycle suite adhering to strict accounting and operational integrity:
- **Shared Design System** (`src/components/nexus/DesignSystem.tsx`):
  - Standardized badges (`StatusBadge`), Stat cards (`StatCard`), Page headers, and empty states.
  - Consistent border radiuses, typography, and palette mirroring the EZbill aesthetic.
- **Overview Dashboard** (`src/components/nexus/DashboardView.tsx`):
  - Real-time calculated MRR (normalizing monthly, quarterly `/3`, and annual `/12` billing intervals).
  - Calculated ARR (`MRR * 12`).
  - Strict financial separation between **Invoiced Accounts Receivable** and **Cleared Cash Deposits**.
  - Renewal forecasts (within 30-day window) and overdue invoice tracking.
  - Authoritative audit event log showing system, sales, and billing operations.
- **Customer Management** (`src/components/nexus/CustomersView.tsx`):
  - Searchable directory with status filtering (`Active`, `Prospect`, `Churned`).
  - Customer 360 drawer displaying contact info, primary plan, active subscriptions, and lifetime spend.
  - Customer onboarding modal with company and billing details.
- **Products & Plans** (`src/components/nexus/ProductsPlansView.tsx`):
  - Tier catalog (Design Partner, Full-Stack Design, Dedicated Studio Squad).
  - Feature entitlement lists and quota configurations.
- **Quotations Lifecycle** (`src/components/nexus/QuotationsView.tsx`):
  - Proposal creation with custom discount allowances, validity terms, and scope notes.
  - One-click customer acceptance and automated conversion into an active subscription and opening invoice.
- **Subscriptions Management** (`src/components/nexus/SubscriptionsView.tsx`):
  - Status management: Pause, Resume, and Scheduled Cancellation (effective at current period end).
  - Plan upgrade / downgrade modal with immediate prorated adjustments.
- **Billing & Invoices** (`src/components/nexus/BillingView.tsx`):
  - Invoice ledger with due dates, payment status, and balance calculations.
  - Payment simulation modal marking collections as cleared cash in real-time.
  - Printable / viewable PDF-style receipt modal.
- **Financial Reports** (`src/components/nexus/FinancialReportsView.tsx`):
  - Collection efficiency metric (`Cleared Cash / Invoiced AR`).
  - Plan-by-plan revenue distribution.
  - Direct CSV financial export.
- **Customer Self-Service Portal** (`src/components/nexus/CustomerPortalView.tsx`):
  - Strict account isolation: customers can only view their own invoices, payment receipts, and subscriptions.
  - Self-service profile updates and subscription cancellation requests.

---

## Directory Structure

```
├── .env.example                     # Environment template
├── index.html                       # HTML entry point with Google Fonts preconnect
├── metadata.json                    # AI Studio applet metadata
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite build config & REST API middleware plugin
├── src/
│   ├── main.tsx                     # React root mount
│   ├── App.tsx                      # Root component & view router
│   ├── index.css                    # Pure custom CSS styling system
│   ├── api/
│   │   ├── client.ts                # Strongly-typed client-side API SDK
│   │   └── serverApi.ts             # Authoritative backend state & REST API handlers
│   ├── utils/
│   │   ├── metrics.ts               # Authoritative financial metric formulas
│   │   ├── metrics.test.ts          # Unit tests for metrics engine
│   │   ├── pricing.ts               # Plans, slots, and pricing logic
│   │   └── pricing.test.ts          # Unit tests for pricing & booking logic
│   └── components/
│       ├── Navbar.tsx               # Fixed header with logo & drawer trigger
│       ├── DrawerOverlay.tsx        # Full-screen menu overlay
│       ├── Hero.tsx                 # Landing hero section with background cover & CTAs
│       ├── CurvedLines.tsx          # 20+20 animated curved line pulses
│       ├── Ticker.tsx               # Infinite marquee ticker
│       ├── TrustedBy.tsx            # Brand marquee with custom typography
│       ├── PlansModal.tsx           # Agency plan selector modal
│       ├── BookingModal.tsx         # 15-minute slot reservation modal
│       ├── InfoModals.tsx           # Projects, Team, FAQs, Contact dialogs
│       └── nexus/
│           ├── DesignSystem.tsx     # Reusable UI components & tokens
│           ├── NexusWorkspace.tsx   # Workspace layout shell & role switcher
│           ├── DashboardView.tsx    # Executive dashboard & audit trail
│           ├── CustomersView.tsx    # Customer directory & 360 view
│           ├── ProductsPlansView.tsx# Catalog of services & tiers
│           ├── QuotationsView.tsx   # Quotes creation & conversion
│           ├── SubscriptionsView.tsx# Subscription lifecycle manager
│           ├── BillingView.tsx      # Invoices, payments, and receipts
│           ├── FinancialReportsView.tsx # Analytics & CSV export
│           └── CustomerPortalView.tsx  # Customer self-service isolated portal
```

---

## Testing & Quality Assurance

### Run Unit Tests
Both core mathematical and business logic engines are decoupled and tested with the native Node.js test runner:
```bash
npx --yes tsx --test src/utils/pricing.test.ts src/utils/metrics.test.ts
```
**Test Coverage**:
- MRR normalization across monthly, quarterly, and annual billing intervals.
- ARR multiplication accuracy (`MRR * 12`).
- Financial separation between gross invoiced receivables and settled cash balances.
- Upcoming renewal filtering across 30-day lookahead windows.
- Plan feature list integrity and discount computation.
- Calendar slot reservation validation and collision prevention.

### Linting
```bash
npm run lint
# or
npx tsc --noEmit
```

### Production Build
```bash
npm run build
```

---

## Walkthrough: End-to-End Subscription Workflow

1. **Accessing the Operating System**:
   - From the EZbill landing page, click the **"EZbill Workspace"** button in the top navigation bar or the mobile drawer.
2. **Review Executive Metrics**:
   - The Overview dashboard reflects real-time MRR ($10,490/mo), ARR ($125,880), Invoiced AR ($12,390), and Cleared Cash ($9,990).
3. **Convert a Quotation**:
   - Navigate to **Quotations** in the sidebar.
   - Click **Accept & Convert** on proposal `QUO-2026-002` (Fintech Pulse).
   - The system transitions the quote to `Converted`, generates a live subscription, and creates a corresponding pending invoice.
4. **Process a Payment**:
   - Navigate to **Billing & Invoices**.
   - Select **Pay / Clear** on invoice `INV-2026-002`.
   - Complete the simulation to record the settled funds; the dashboard Cleared Cash updates instantly.
   - Click **Receipt** to view or print the generated receipt.
5. **Manage Subscription Lifecycle**:
   - Navigate to **Subscriptions**.
   - Pause, resume, or schedule end-of-period cancellations on any active agreement.
6. **Customer Portal Isolation**:
   - In the top right user menu, switch roles to **Sarah Lin (Venture Studio)** or **David Kim (Fintech Pulse)**.
   - Observe that the interface switches into the Customer Portal view displaying only that customer's subscriptions, invoices, and payment receipts.
