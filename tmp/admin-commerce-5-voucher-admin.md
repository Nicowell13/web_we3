## Goal
Add admin voucher management and robust discount validation.

## Requirements
- Add admin endpoints under `/api/v1/old-school/vouchers`:
  - create voucher
  - list/search/filter vouchers
  - update voucher
  - activate/deactivate voucher
  - set quota and per-user limit
- Voucher fields/rules:
  - code
  - discount type: fixed or percentage
  - discount value
  - max discount
  - min transaction amount
  - points required if redeemable by loyalty points
  - active date range
  - product/category restrictions
  - quota
  - per-user limit
- Backend validation must compute discount server-side.
- Add audit trail for voucher mutations.

## Security
- Admin-only mutation endpoints.
- Public/user voucher APIs cannot override discount amount.
- Expired/inactive/quota-exhausted vouchers rejected server-side.

## Tests
- Admin CRUD access control.
- Fixed and percentage discounts.
- Max discount cap.
- Min transaction enforcement.
- Expired/inactive/quota exhausted rejected.

## Done when
- `bun test` passes.
- `bun run build` passes.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/27

