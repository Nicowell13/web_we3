Completed in `87d4abf`.

## What changed
- Moved admin API prefix from `/api/v1/admin/*` to `/api/v1/old-school/*`.
- Added `GET /api/v1/old-school/ping` as RBAC probe endpoint.
- Kept all old-school admin endpoints behind `requireRole('admin')`.
- Legacy admin ping routes now return 404:
  - `/api/admin/ping`
  - `/api/v1/admin/ping`
- Expanded auth/RBAC tests for:
  - 401 without token
  - 403 for normal user
  - 200 for admin DB role
  - 404 for legacy admin routes

## Verification
- `bun test` → 100 pass, 0 fail
- `bun run build` → Next.js production build success
