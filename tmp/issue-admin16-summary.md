Parent: #30
Depends on: #48
Useful for: #49

## Goal
Add an admin product summary endpoint to power category/group counts and sync observability in `/old-school`.

## Endpoint

```text
GET /api/v1/old-school/products/summary
```

Admin-only through existing `/api/v1/old-school/*` RBAC.

## Response shape

```json
{
  "ok": true,
  "categories": [
    {
      "name": "Game",
      "count": 20,
      "activeCount": 12,
      "groups": [
        { "name": "Mobile Legends", "count": 12, "activeCount": 8 },
        { "name": "Free Fire", "count": 8, "activeCount": 4 }
      ]
    },
    {
      "name": "Pulsa",
      "count": 40,
      "activeCount": 25,
      "groups": [
        { "name": "Telkomsel", "count": 10, "activeCount": 7 },
        { "name": "XL", "count": 8, "activeCount": 5 }
      ]
    }
  ],
  "totalProducts": 75,
  "activeProducts": 0,
  "lastSyncedAt": "2026-09-04T16:51:16.676Z"
}
```

## Scope
- Aggregate products joined to `games_catalog`.
- Count per category.
- Count per group/provider/game.
- Count active products.
- Return latest `syncedAt` for Digiflazz products.
- Sort category order:
  - Game
  - Pulsa
  - PLN
  - E-Wallet
  - Voucher
  - Other
- Sort groups alphabetically.
- Do not include `basePrice`, supplier credentials, signatures, or raw provider secrets.

## UI usage
- Category tabs show counts.
- Group chips show counts.
- Header shows total products, active products, and last sync time.
- If sync fails, UI still shows previous summary and current error message.

## Tests
- Summary groups products by category and group.
- Active counts are correct.
- Latest `syncedAt` returns newest sync time.
- Endpoint remains admin-only.
- Response does not expose `basePrice`.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- `/old-school` can show category counts without scanning raw UI state.
- Endpoint returns stable shape when products table is empty.