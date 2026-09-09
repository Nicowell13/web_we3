Priority: P0
Effort: M
Depends on: [TRANSACTION]

Context: Payment webhook exists and state machine exists. Launch needs reliable handling of pending/success/failed/duplicate webhook.

Business Goal: Avoid lost payments, double fulfillment, and manual confusion.

Current State: DOKU signature tests and webhook tests exist.

Problem: Need validate webhook can be replayed safely, updates one order, and does not award/trigger supplier twice.

Proposed Solution: Add explicit idempotency checks, correlation logs, retry-safe webhook processing, and reconciliation admin view/command if status mismatches.

Acceptance Criteria:
- [ ] Duplicate success webhook processed once
- [ ] Failed payment never triggers supplier order
- [ ] Unknown order safely reported
- [ ] Correlation/order id visible in logs/admin audit
- [ ] Tests cover replay and failure states

Testing: webhook tests; state-machine tests; build.
