Priority: P0
Effort: M
Depends on: [PAYMENT]

Context: Digiflazz integration and product sync exist. Transaction fulfillment must handle supplier error and insufficient balance.

Business Goal: Prevent paid orders from silently failing and give admin clear action path.

Current State: Digiflazz adapter and supplier tests exist; sync reliability issues have been fixed.

Problem: Need verify paid -> supplier order -> processing/success/failed behavior, insufficient balance, timeout, and status check.

Proposed Solution: Normalize supplier errors, store supplier reference/SN, expose admin failure reason, and define retry/reconciliation for safe states.

Acceptance Criteria:
- [ ] Insufficient Digiflazz balance produces actionable admin/user status
- [ ] Supplier timeout does not mark success prematurely
- [ ] Supplier duplicate/reference handling is safe
- [ ] Status check can reconcile processing orders
- [ ] Tests cover supplier error/timeout

Testing: supplier adapter tests; transaction service tests; build.
