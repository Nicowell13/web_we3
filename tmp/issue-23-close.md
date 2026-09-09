Completed in `3e9d66a`.

## What changed
- `authenticate` now resolves role from Supabase Postgres `users.role` after Firebase `verifyIdToken()` succeeds.
- `requireRole('admin')` no longer trusts Firebase token/custom claims for authorization.
- Admin routes now use `requireRole('admin')` instead of returning `{ ok: false }` with HTTP 200.
- Added regression test proving a forged Firebase `role: 'admin'` claim is ignored when DB role is `user`.
- Updated product tests with DB role mock required by auth middleware.

## Verification
- `bun test` → 97 pass, 0 fail
- `bun run build` → Next.js production build success
