## Problem
Admin needs a visible phone correction dialog for failed Pulsa/Data orders before a separate manual repay. Previous body was accidentally copied from issue #99; this issue concerns admin order intervention, not Quick Transactions layout.

## Acceptance criteria
- Detect Pulsa/Data strictly from gamesCatalog.category, not brand/productType substring matches.
- Visible Koreksi Nomor HP action and accessible dialog with labeled phone input, existing number, explicit save, and separate repay confirmation.
- Only paid orders with a confirmed failed supplier attempt may be corrected or repaid. Block PENDING, REFUNDED, SUCCESS, processing, timeout, unknown/pending supplier responses, stale attempts and all supplier success evidence.
- Never create a paid order as a status probe. Existing Digiflazz checkOrderStatus payload is not a proven read-only reconciliation operation; uncertain attempts remain blocked.
- Validate phone syntax and operator/product compatibility; unsupported brands and unverified alternate Pulsa/Data SKUs fail closed.
- Correction and audit are atomic with row locking; repay claims transaction before supplier submission to prevent concurrent duplicates.
- Scoped local regression tests/build, commit/push, then production deploy and verification. Do not modify unrelated Footer.tsx or execute financial repay for testing.

## Verification
Pending deployment and final verification. Keep issue open until verified; authenticated browser interaction may require operator verification.
