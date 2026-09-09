Parent: #30

## Goal
Add top 5 user spending ranking as chart-style social proof while preserving user privacy.

## Data
- Use successful/completed transactions only.
- Sum spending per user.
- Limit 5.
- Show avatar only.

Do not show:
- name
- email
- UID
- phone
- exact private identity

## API
Recommended:

```text
GET /api/v1/rankings/top-spenders
```

Response public-safe:

```json
{
  "ok": true,
  "rankings": [
    { "rank": 1, "avatarUrl": "...", "score": 100 },
    { "rank": 2, "avatarUrl": "...", "score": 75 }
  ]
}
```

`score` can be normalized percentage/bar height, not raw exact spend if privacy risk.

## UI
- Chart-style card.
- Avatar circles.
- Rank labels #1-#5.
- Bar height/width by normalized spend.
- Fallback avatar if missing.

## Acceptance
- Top 5 displayed without names/emails/IDs.
- Only successful transactions count.
- Empty state works.
- No `basePrice` or sensitive data exposed.
- `bun test` passes.
- `bun run build` passes.
