## Goal
Add admin-triggered Digiflazz product synchronization into local DB.

## Requirements
- Add Digiflazz adapter method to fetch price list/product list.
- Add admin endpoint:
  - `POST /api/v1/old-school/suppliers/digiflazz/sync-products`
- Sync behavior:
  - insert new products inactive by default
  - update supplier fields and cost price for existing products
  - preserve admin-managed `sellingPrice`, `isActive`, margin fields unless explicitly recalculated
  - record `syncedAt`
- Return summary counts:
  - created
  - updated
  - unchanged
  - failed
- Write audit trail for sync run.

## Safety
- Do not call Digiflazz from tests.
- Mock adapter in tests.
- Do not expose supplier credentials.

## Tests
- Admin-only endpoint.
- Sync creates inactive products.
- Sync updates cost price without overwriting admin selling price.
- Failure returns useful error and does not crash server.

## Done when
- `bun test` passes.
- `bun run build` passes.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/27

