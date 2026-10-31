# EZbill Engineering Collaboration & Contribution Guidelines

## 1. Branch Strategy

The team operates under a 4-teammate branch matrix with protected integration branches:

| Teammate | Assigned Branch | Domain Scope |
| :--- | :--- | :--- |
| **Teammate 1** | `team1/foundation` | Backend runtime, Relational DB, Auth/RBAC, Customers, Products, Plans, API docs. |
| **Teammate 2** | `team2/workflow` | Quotations, Revisions, Subscription state machine, Proration, Renewals. |
| **Teammate 3** | `team3/billing` | Recurring billing, Invoicing, Taxes (GST), Discounts, Payments, Reconciliation, Refunds. |
| **Teammate 4** | `team4/frontend` | React UI, Dashboard, Quotation wizard, Customer portal, State management. |

---

## 2. Core Working Agreements

1. **Never Commit Directly to `main`:** All work must originate on the designated team feature branch.
2. **Push in Meaningful, Incremental Units:** Break major architectural deliverables into logical, testable commits. Avoid massive single-dump pull requests.
3. **Preserve Shared Contracts:** If you must adjust a shared TypeScript interface, database column, or route path, communicate with the affected teammate before merging.
4. **Offline Local First:** Every feature must run without requiring paid external cloud APIs. When external services (e.g. LLM, payment gateways) are referenced, deterministic local fallbacks or simulation drivers must be present.
5. **No Broken Builds:** Run `npm run test` or relevant test scripts before pushing any commit.
6. **Pull Request Protocol:**
   - Open a PR from your team branch against `main` (or designated integration branch).
   - Require at least one peer review.
   - Rebase or merge cleanly without force pushing to shared branches (`git push --force` is prohibited on shared branches).
