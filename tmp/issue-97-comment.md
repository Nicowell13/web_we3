Fixed in `0dce31c`.

## Change
- Added `export const dynamic = 'force-dynamic';` to `src/app/page.tsx`.
- Homepage `/` now stays server-rendered on demand and reads latest `/api/v1/home-banner` instead of serving stale static output.

## Verification
- Local `bun test`: 160 pass, 0 fail.
- Local `bun run build`: success; route `/` shown as dynamic (`ƒ /`).
- Production deploy: commit `0dce31c` active.
- Services: `wetri-backend` active, `wetri-frontend` active.
- Health: `https://wetri.shop/api/health` returned OK.
- Banner API: `https://wetri.shop/api/v1/home-banner` returned current saved admin banner config.
