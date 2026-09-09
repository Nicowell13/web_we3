Priority: P1
Effort: L
Depends on: [TRANSACTION], [PAYMENT]

Context: Loyalty points exist, but business requires ledger and cost control.

Business Goal: Increase repeat purchase without destroying 5-7.5% margin.

Current State: users.points and check-in/points logic exist.

Problem: Raw balance can drift; rewards must be auditable and capped to 1-2% GMV unless manually validated.

Proposed Solution: Add point ledger for earn/spend/adjustment with transaction reference, calculate balance from ledger or validate cached balance, and add reward cost guard.

Acceptance Criteria:
- [ ] Points awarded only after SUCCESS once
- [ ] Failed/refunded orders do not award points
- [ ] Ledger records earn/spend/adjustment with reference
- [ ] Outstanding point liability measurable
- [ ] Reward cost cap documented/testable

Testing: migration/schema tests; transaction points tests; business math tests; build.
