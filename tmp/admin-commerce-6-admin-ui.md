## Goal
Expand `/old-school` dashboard UI for products, vouchers, users, and audit logs.

## Requirements
- Keep route `/old-school` only; do not add `/admin`.
- Add admin tabs/sections:
  - Overview metrics
  - Products
  - Digiflazz sync
  - Pricing
  - Vouchers
  - Users / ban management
  - Audit logs
- Product UI:
  - search/filter
  - active toggle
  - cost price display
  - selling price edit
  - margin edit
  - sync Digiflazz button
- Voucher UI:
  - create/edit form
  - activate/deactivate
  - date/limit/quota fields
- User UI:
  - search users
  - ban/suspend/unban controls
  - reason input
- Show safe loading/error states.

## Security
- Non-admin still sees generic 404-style page.
- UI must not expose Firebase UID unless needed for debugging.
- Backend remains authority for role/status/price.

## Tests/build
- Existing tests remain green.
- `bun run build` succeeds.

## Done when
- Admin can perform core management from UI.
- Errors are visible and actionable.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/27

