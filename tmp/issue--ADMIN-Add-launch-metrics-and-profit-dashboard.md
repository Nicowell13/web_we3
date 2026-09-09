Priority: P1
Effort: M
Depends on: [TRANSACTION]

Context: Admin dashboard exists. Business needs GMV, margin, failures, pending orders, and profit/customer metrics.

Business Goal: Track path to Rp1,000,000/month profit and detect operational issues.

Current State: admin metrics and product pricing exist.

Problem: Admin needs transaction status, revenue, supplier cost, estimated profit, loyalty cost, failed/pending orders.

Proposed Solution: Add metrics endpoint/card using transactions/products, admin-only. Calculate gross profit from sellPrice/basePrice for completed orders.

Acceptance Criteria:
- [ ] Admin sees GMV, order count, success rate, pending/failed counts
- [ ] Admin sees estimated gross profit
- [ ] Admin sees loyalty/referral cost placeholders or real values if present
- [ ] No public API exposes cost/basePrice
- [ ] Tests cover metrics calculations

Testing: service tests; auth/RBAC tests; build.
