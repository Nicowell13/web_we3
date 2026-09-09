## Goal
Add user status controls and enforce bans server-side.

## Requirements
- Extend `users` with:
  - `status`: `active`, `suspended`, `banned` default `active`
  - `bannedAt`
  - `bannedReason`
- Add admin endpoints under `/api/v1/old-school/users`:
  - list users with filters/search
  - update user status
  - ban user with reason
  - unban user
- Add audit trail entries for every status change.
- Block banned users in backend protected flows:
  - dashboard
  - check-in
  - voucher redeem/validate where user context exists
  - checkout/transaction creation if present
- Suspended users may view dashboard but cannot transact/redeem/check-in.

## Security
- All admin endpoints require `requireRole('admin')`.
- Never trust frontend status.
- Do not expose Firebase UID unnecessarily in UI.

## Tests
- Non-admin cannot call user status endpoints.
- Admin can ban/unban.
- Banned user gets 403 on protected action.
- Existing active user behavior remains unchanged.

## Done when
- `bun test` passes.
- `bun run build` passes.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/27

