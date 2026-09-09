Parent: #30

## Goal
Classify Digiflazz products during sync so imported products are grouped into useful catalog categories instead of a flat mixed supplier list.

## Problem
Digiflazz sends products with supplier-oriented fields (`brand`, `type`, `product_name`, `buyer_sku_code`, `price`). Admin needs business-oriented groups: Game, Pulsa, PLN, E-Wallet, Voucher, and Other. Current sync only auto-creates `games_catalog` from brand, so category can be too raw or inconsistent.

## Scope
Add a small backend classifier with no new dependency:

```ts
classifyDigiflazzProduct(item)
```

Return shape:

```ts
{
  category: 'Game' | 'Pulsa' | 'PLN' | 'E-Wallet' | 'Voucher' | 'Other',
  groupName: string,
  subCategory: string,
}
```

Initial rules:
- `PLN` brand or token listrik wording => `PLN`
- `TELKOMSEL`, `XL`, `AXIS`, `INDOSAT`, `TRI`, `SMARTFREN`, `BY.U` => `Pulsa`
- `MOBILE LEGENDS`, `FREE FIRE` => `Game`
- `DANA`, `OVO`, `GO-PAY`, `GOPAY`, `SHOPEE PAY`, `SHOPEEPAY` => `E-Wallet`
- voucher wording/product types => `Voucher`
- unknown => `Other`

Mapping during sync:
- `games_catalog.category` = classifier category
- `games_catalog.name` = classifier groupName
- `products.productType` = classifier subCategory or supplier type
- Preserve existing admin-owned product fields:
  - `sellPrice`
  - `marginType`
  - `marginValue`
  - `isActive`
- Do not expose supplier credentials, signs, or raw secrets.

## Tests
- Mobile Legends classified as `Game`.
- Free Fire classified as `Game`.
- TELKOMSEL/XL/AXIS/INDOSAT/TRI/SMARTFREN/BY.U classified as `Pulsa`.
- PLN classified as `PLN`.
- DANA/OVO/GoPay/ShopeePay classified as `E-Wallet`.
- Unknown brand classified as `Other`.
- Sync-created catalog row stores classifier category.
- Existing product update preserves admin price/margin/status.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- New sync creates/updates catalog categories consistently.
- Products remain linked to valid `games_catalog` rows.
- No new dependency added.