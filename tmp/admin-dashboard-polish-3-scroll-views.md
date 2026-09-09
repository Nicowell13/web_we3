## Goal
Make voucher and user admin views scrollable for many rows without pagination.

## Requirements
- Update `/old-school` UI sections:
  - Voucher list uses fixed/max height scroll container.
  - User list uses fixed/max height scroll container.
  - Product list keeps scroll behavior too.
- Keep headers/actions visible enough for usability.
- Avoid pagination for now.
- Preserve responsive mobile layout.
- Avoid layout shift when many rows load.
- Empty states remain visible.

## Acceptance
- 50+ users do not make whole admin page unusable.
- 50+ vouchers do not push audit/config sections too far down.
- Scrollbars work inside their panels.
- `bun run build` succeeds.

## Done when
- Admin can browse long voucher/user lists by scrolling inside panels.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/34

