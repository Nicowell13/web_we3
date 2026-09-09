Priority: P0
Effort: M

Context: Repository is existing product, not empty project. Need audit before new feature execution.

Business Goal: Ensure school/community top-up beta does not launch with broken money flow.

Current State: Existing code includes Next.js frontend, Elysia/Bun backend, Google auth/RBAC, Digiflazz integration, payment/webhook routes, transaction state machine, points/checkin, admin, dashboard, catalog, tests.

Problem: Need source-backed gap analysis across transaction, payment, supplier, loyalty, referral, admin, observability, security, and business metrics.

Proposed Solution: Trace User -> Frontend -> Backend -> DB -> Payment/Supplier -> Webhook -> DB -> Frontend. Produce gap table, risk register, launch criteria, and ordered implementation backlog.

Acceptance Criteria:
- [ ] Gap table uses DONE/PARTIAL/BROKEN/MISSING/NEEDS VALIDATION
- [ ] Security and unit economics risks listed
- [ ] Launch beta Definition of Done written
- [ ] No coding bundled into audit

Testing: Documentation review plus targeted read-only route/test inspection.
