Parent: #30
Depends on: #48

## Goal
Make `/old-school` product management simple and modern by grouping Digiflazz products by category and subcategory/provider/game.

## User experience
Admin should not scroll one mixed list. Admin should choose category first, then group/provider/game.

Layout:

```text
Products & Digiflazz
├── Sync button + last result/error
├── Category tabs
│   ├── Game
│   ├── Pulsa
│   ├── PLN
│   ├── E-Wallet
│   ├── Voucher
│   └── Other
├── Group chips
│   ├── Game: Mobile Legends, Free Fire
│   ├── Pulsa: Telkomsel, XL, Axis, Indosat, Tri, Smartfren, By.U
│   ├── PLN: PLN
│   └── E-Wallet: DANA, OVO, GoPay, ShopeePay
├── Search field
├── Supplier status / active filters
├── Bulk actions
└── Scrollable product list
```

## Scope
- Add category tabs in Products & Digiflazz panel.
- Add group/provider/game chips based on selected category.
- Filters must compose together:
  - category
  - group/brand
  - search
  - active/inactive
  - supplier status
- Preserve existing actions:
  - Sync Digiflazz
  - Harga dialog
  - Enable/Disable per product
  - Bulk enable/disable
- Product card must show:
  - category/group
  - product name
  - SKU
  - supplier status
  - active status
  - modal/cost for admin only
  - sell price
  - profit preview
  - price edit button
- Keep list scrollable, no pagination unless needed later.
- Keep public APIs from exposing supplier cost.

## Sorting
Default ordering:
1. Category order: Game, Pulsa, PLN, E-Wallet, Voucher, Other
2. Group/provider A-Z
3. Price low-to-high
4. Product name A-Z fallback

## Tests
- Admin UI build succeeds.
- Product filter query composes category/group/search/status.
- Public product API still hides `basePrice`.
- Bulk actions still work after filters.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- Admin can quickly find Game products by game name.
- Admin can quickly find Pulsa products by provider.
- Admin can filter PLN and E-Wallet separately.
- No duplicate promo/pricing engine introduced.