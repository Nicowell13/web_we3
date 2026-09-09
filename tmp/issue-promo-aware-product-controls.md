Parent: #30

## Goal
Make product management promo-aware without creating a second promo engine; use existing voucher rules as the source of truth.

## Scope
- Use existing voucher types:
  - `promo`
  - `new_user`
  - `loyalty_points`
- Add product list filters:
  - search/SKU/name
  - active/inactive
  - supplier status
  - brand/game
  - product type
- Add bulk actions:
  - activate selected products
  - deactivate selected products
- Add promo awareness in product panel:
  - show active voucher summary
  - show badges for active promo/new-user/loyalty promos
  - show estimated after-discount preview when voucher applies globally
- Keep checkout/backend voucher validation authoritative.
- Do not add a new promo table or duplicate discount engine.
- Do not add dependencies.

## Tests
- Product filter query returns expected products.
- Bulk activate/deactivate validates IDs and writes audit.
- Promo summary only includes active/current vouchers.
- Promo preview never bypasses checkout voucher validation.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- Admin can filter, select, bulk toggle, and see promo summary in `/old-school`.
- No supplier costs or credentials leak to public APIs.