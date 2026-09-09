## Goal
Build admin commerce controls in `/old-school` so operators can manage Digiflazz products, pricing, vouchers, and fraud enforcement safely.

## Scope
- Product catalog synced from Digiflazz into local DB.
- Admin product activation and selling price controls.
- Voucher lifecycle and discount rules.
- User status management: active, suspended, banned.
- Backend enforcement for banned users and trusted pricing.
- Audit logs for every admin mutation.

## Security rules
- Admin UI route remains `/old-school`.
- Admin APIs stay under `/api/v1/old-school/*`.
- Every mutation requires server-side `requireRole('admin')`.
- Frontend role/price/voucher input is never trusted.
- No public endpoint may promote roles or bypass bans.

## Child issues
1. User status + ban enforcement.
2. Local Digiflazz product catalog schema.
3. Digiflazz product sync admin endpoint.
4. Admin product CRUD/activation/pricing.
5. Voucher CRUD + validation rules.
6. Admin UI tabs for products, vouchers, users, and audit.

## Done when
- Each child issue is closed.
- `bun test` and `bun run build` pass.
- Admin can manage product availability, selling prices, vouchers, and banned users without deploy.
