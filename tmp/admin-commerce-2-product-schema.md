## Goal
Create local product catalog schema for Digiflazz-managed digital products.

## Requirements
- Add/extend product table fields for supplier catalog:
  - `supplier`: e.g. `digiflazz`
  - `supplierProductCode`
  - `name`
  - `brand`
  - `category`
  - `type`
  - `costPrice`
  - `sellingPrice`
  - `marginType`: `fixed` or `percentage`
  - `marginValue`
  - `isActive`
  - `supplierStatus`
  - `buyerSkuCode` if matching Digiflazz naming
  - `syncedAt`
- Enforce unique supplier + supplier product code.
- Keep product inactive by default after first sync.
- Keep existing public catalog behavior working.

## Security
- Public catalog only exposes active products and selling price.
- Cost price only visible through admin endpoint.

## Tests
- Schema exports expected fields.
- Public product list hides inactive product.
- Public product response does not expose cost price.

## Done when
- `bun test` passes.
- `bun run build` passes.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/27

