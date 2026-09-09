Parent: #30

## Goal
Give admins a safe product pricing dialog in `/old-school` for setting sell price, cost/modal awareness, margin, profit preview, and active status.

## Scope
- Keep routes under `/old-school` and `/api/v1/old-school/*`.
- Show product name, SKU, brand/game, product type, supplier status, and synced time.
- Show supplier modal/cost as `basePrice` only to admins.
- Let admins edit:
  - `sellPrice`
  - `marginType` (`fixed` or `percentage`)
  - `marginValue`
  - `isActive`
- Add profit preview:
  - Profit: `sellPrice - basePrice`
  - Profit percentage: `((sellPrice - basePrice) / basePrice) * 100`
- Add “calculate from margin” behavior:
  - fixed: `basePrice + marginValue`
  - percentage: `basePrice + (basePrice * marginValue / 100)`
- Validate every field server-side.
- Write audit trail on price/status changes.
- Public product APIs must not expose `basePrice`.

## Tests
- Reject negative `sellPrice`.
- Reject invalid `marginType`.
- Reject percentage margin > 100.
- Update product creates audit trail.
- Public products do not expose `basePrice`.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- Admin can save pricing changes from dialog.
- Regular user/public response does not expose supplier cost.