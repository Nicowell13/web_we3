Priority: P2
Effort: L
Depends on: [LOYALTY]

Context: Referral is growth lever, but must wait until transaction and loyalty are reliable.

Business Goal: Grow through school/community without high acquisition cost.

Current State: No confirmed referral implementation from current audit pass.

Problem: Referral without guard risks self-referral, multi-account abuse, fake rewards, and negative unit economics.

Proposed Solution: Design referral attribution, eligibility only after valid first SUCCESS transaction, ledger-backed reward, anti-abuse limits, and admin metrics.

Acceptance Criteria:
- [ ] Referral reward only after referred user valid transaction
- [ ] Self-referral blocked
- [ ] One reward per referred customer
- [ ] Cost cap defined before implementation
- [ ] Admin can see referral source/conversion/cost

Testing: eligibility tests; abuse tests; ledger tests; build.
