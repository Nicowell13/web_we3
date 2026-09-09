## Goal
Add admin product management endpoints for activation and pricing.

## Requirements
- Add admin endpoints under `/api/v1/old-school/products`:
  - list products with search/filter/category/supplier/status
  - get product detail
  - update product active flag
  - update selling price
  - update margin type/value
  - bulk activate/deactivate selected products
- Price calculation rules:
  - `sellingPrice` is authority for checkout.
  - If margin fields are set, compute selling price from `costPrice` + margin on demand or during update.
  - Never trust price from frontend checkout.
- Add audit trail for every product mutation.

## Security
- Admin-only endpoints.
- Cost price visible only to admin.
- Public catalog exposes only active products and final selling price.

## Tests
- Non-admin forbidden.
- Admin can update active status and selling price.
- Checkout/public product path uses DB selling price, not browser input.

## Done when
- `bun test` passes.
- `bun run build` passes.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/27

