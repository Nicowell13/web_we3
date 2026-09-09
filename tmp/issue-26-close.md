Completed in `0d96c43`.

## What changed
- Added `docs/admin-access.md` detailing:
  - Architecture split (Firebase identity token verification vs Supabase `users.role` database authority).
  - Safe initial admin promotion queries via Supabase SQL Editor (by email or UID).
  - Verification procedure using `/old-school` route.
  - Safe rollback procedure to revoke admin privileges.
  - No public admin promotion endpoints.

## Verification
- `bun test` → 100 pass, 0 fail
- `bun run build` → Next.js production build success
