## Goal
Complete voucher controls in `/old-school`: add voucher, edit voucher settings, and kill/disable voucher when promo is over.

## Requirements
- Add voucher create form with fields:
  - code
  - discount type: fixed/percentage
  - discount value
  - min purchase
  - max discount
  - quota
  - points required
  - public/private flag
  - expiry date/time
  - active flag
- Add edit/settings controls for existing voucher.
- Add explicit kill/disable action that sets `isActive = false`.
- Show quota usage and expired status.
- Show success/error feedback after every action.
- Reuse existing admin API from #32 where possible; add missing endpoint only if needed.

## Security
- Backend remains authority for all voucher validation.
- Frontend form cannot bypass expiry/quota/min purchase checks.
- Admin-only endpoints.

## Tests/build
- Existing voucher tests remain green.
- Add lightweight tests if backend endpoint changes.
- `bun run build` succeeds.

## Done when
- Admin can add voucher, change settings, and kill promo from UI.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/34

