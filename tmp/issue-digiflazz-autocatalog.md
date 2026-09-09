Parent: #30

## Problem
Digiflazz credentials and `/v1/price-list` can be valid, but no products appear in `/old-school` because the local database has no `games_catalog` rows. `products.game_id` requires a foreign key to `games_catalog.id`, while Digiflazz sends `brand` names instead of local game IDs. Current sync maps unknown brands to `failed`, so `products` remains empty.

Current observed DB state:

```text
games_catalog = 0
products = 0
digiflazz products = 0
```

## Goal
Make Digiflazz sync create or reuse local game catalog rows from Digiflazz brand data, then insert/update products so imported products appear in the admin dashboard.

## Scope
1. Normalize Digiflazz brand values into local slugs:
   - lowercase
   - trim
   - non-alphanumeric to `-`
   - trim leading/trailing `-`
2. Auto-create `games_catalog` when a brand does not exist:
   - `id`: normalized brand slug
   - `name`: original Digiflazz brand
   - `publisher`: `Digiflazz`
   - `category`: Digiflazz `type` if usable, fallback `Game`
   - `thumbnailUrl`: safe local/default placeholder
   - `isActive`: `true`
3. Map Digiflazz products:
   - `gameId`: normalized brand slug
   - `sku`: `buyer_sku_code`
   - `denomination`: `product_name`
   - `basePrice`: `price`
   - `sellPrice`: only set from cost when product is new
   - `supplierCode`: `digiflazz`
   - `supplierProductCode`: `buyer_sku_code`
   - `brand`: `brand`
   - `productType`: `type`
   - `supplierStatus`: `status`
   - `syncedAt`: current time
4. Preserve admin-owned fields on existing products:
   - `sellPrice`
   - `marginType`
   - `marginValue`
   - `isActive`
5. Return observable sync result:

```json
{
  "created": 0,
  "updated": 0,
  "unchanged": 0,
  "failed": 0,
  "gamesCreated": 0,
  "total": 75
}
```

6. Update `/old-school` sync message to show `gamesCreated`.
7. Keep provider rate-limit errors visible and do not retry repeatedly.

## Tests
- Brand `Mobile Legends` normalizes to `mobile-legends`.
- Empty brand marks product invalid.
- Empty `games_catalog` causes sync to create a game row.
- New product is inserted after game creation.
- Existing product update does not overwrite `sellPrice`, `marginType`, `marginValue`, or `isActive`.
- Sync result includes `gamesCreated`.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- After Digiflazz rate-limit clears, one sync creates `games_catalog > 0` and `products > 0`.
- `/old-school` shows imported products.
- No Digiflazz credential, API key, sign, or supplier secret is logged or displayed.

## Notes
Do not use `/v1/transaction` for product import; it creates or checks orders, not product catalog data.