## Goal
Improve `/old-school` admin dashboard controls for homepage promo banners, voucher lifecycle management, and scrollable data-heavy admin views.

## Scope
- Homepage banner/promo content managed from admin dashboard.
- Banner image upload via Cloudinary.
- Voucher UI supports add, edit/settings, disable/kill expired promo.
- Voucher and user lists remain usable with many rows through scroll containers, no pagination.

## Security rules
- Admin APIs stay under `/api/v1/old-school/*`.
- Every mutation requires `requireRole('admin')`.
- Cloudinary uploads are server-side only.
- Public homepage only reads active banner content.

## Child issues
1. Admin homepage banner manager with Cloudinary upload.
2. Voucher UI add/settings/kill controls.
3. Scrollable admin tables/lists for vouchers and users.

## Done when
- Child issues closed.
- `bun test` and `bun run build` pass.
- `/old-school` can manage banners and voucher lifecycle without code changes.
