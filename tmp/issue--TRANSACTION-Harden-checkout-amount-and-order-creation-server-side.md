Priority: P0
Effort: M
Depends on: [AUDIT]

Context: Frontend checkout currently sends amount/order payload. Business rule says never trust price from frontend.

Business Goal: Prevent price manipulation and duplicate/bad orders before launch.

Current State: Checkout UI exists; payment create-link route exists; transaction state machine exists.

Problem: Need verify and harden server-side product price lookup, order idempotency, and duplicate payment behavior.

Proposed Solution: Payment/order creation must accept productId + target fields, lookup sellPrice server-side, generate stable order reference server-side, and reject frontend-supplied price/status/points.

Acceptance Criteria:
- [ ] Frontend cannot change transaction amount
- [ ] Server derives amount from active product sellPrice
- [ ] Duplicate submit does not create unintended duplicate charge/order
- [ ] Inactive product cannot be purchased
- [ ] Tests cover price tampering and duplicate submit

Testing: bun test; focused payment route tests; build.
