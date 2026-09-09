Epic complete.

Child issues closed: #28, #29, #30, #31, #32, #33.

Delivered:
- User active/suspended/banned status with backend enforcement.
- Local Digiflazz catalog schema and sync endpoint.
- Admin product activation, pricing, margin, and bulk status APIs.
- Admin voucher CRUD, limits, expiry, quota, and server-side validation.
- `/old-school` UI for products, Digiflazz sync, vouchers, and users.
- Admin mutations protected by Supabase DB role and recorded in audit logs.

Verification:
- `bun test`: 101 pass, 0 fail.
- `bun run build`: success.
