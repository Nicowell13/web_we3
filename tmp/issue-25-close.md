Completed in `df63e04`.

## What changed
- Created guarded client page at `src/app/old-school/page.tsx`.
- Verifies identity via Firebase ID token and RBAC via `GET /api/v1/old-school/ping`.
- Unauthenticated users receive a minimal login gate.
- Unauthorized / non-admin users (403) receive a generic 404-style screen to prevent discovering the admin route surface.
- Admin users receive the Old School Control dashboard:
  - Metric summary (total transactions, sales, status counts)
  - System configs editor
  - Recent audit trail stream
- Verified no `/admin` page exists.

## Verification
- `bun test` → 100 pass, 0 fail
- `bun run build` → Next.js production build generated `/old-school` successfully (10 static/dynamic pages)
