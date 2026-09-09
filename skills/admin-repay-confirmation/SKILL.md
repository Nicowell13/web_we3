---
name: "admin-repay-confirmation"
description: "Procedure for admin to safely perform repay on Digiflazz-failed transactions with manual balance attestation."
---

# admin-repay-confirmation

## Trigger
Admin initiates repay via endpoint `/api/v1/old-school/orders/:orderId/repay` with payload containing `balanceConfirmed: true`.

## Procedure
1. Validate payload: ensure `balanceConfirmed === true`; otherwise throw error "Konfirmasi pengecekan saldo Digiflazz wajib dicentang".
2. Extract admin identifier from request auth token (`user.uid`). If missing or empty, throw error "Identitas admin wajib tersedia".
3. Load transaction by `orderId` joining `products` and `gamesCatalog` to obtain `category`, `brand`, `defaultSupplierSku`.
4. Call `hasConfirmedSupplierFailure(tx)`; if false, throw error "Repay memerlukan pembayaran dan kegagalan supplier terkonfirmasi".
5. For Pulsa/Data categories, verify `tx.targetServerId` is null and `validateTargetPhone(tx.targetUserId, brand)` passes; reject otherwise.
6. Build `retryRef` (`${orderId}-R${randomUUID()}`).
7. Prepare audit record `ADMIN_REPAY_CONFIRMED` with fields `{ adminId, balanceConfirmed: true, confirmedAt: new Date().toISOString(), previousSupplierReference: tx.supplierReference || tx.orderId }` and insert into `auditTrails` **before** any supplier call.
8. Update transaction to `PROCESSING`, set `supplierReference = retryRef`, store audit info in `metadata.lastAdminRepay`, and `updatedAt`.
9. Invoke active Digiflazz supplier `createOrder(targetSku, customerNo, amount, retryRef)`.
10. Interpret supplier response: if `status` is `sukses` → set transaction `SUCCESS`; if `gagal` → `FAILED`; else `PROCESSING`. Capture any error message.
11. Update transaction fields `status`, `supplierReference`, `supplierSn`, `metadata.lastSupplierResponse`, `needsAdminAction` (true unless SUCCESS), timestamps, and audit `ADMIN_REPAY_SUCCESS` or `ADMIN_REPAY_FAILED` with request/response details.
12. If transaction reached `SUCCESS` and `userId` present, calculate points and reward referral.
13. Return JSON `{ ok: true, orderId, status, targetSku, supplierReference, supplierSn, error? }`.

## Notes
- Guard rejects pending, timeout, success, refunded, or any transaction where supplier evidence exists.
- Admin must manually verify Digiflazz balance; attestation does not replace supplier failure evidence.
- All audit entries include `adminId` from token, never from request body.
- Function `hasConfirmedSupplierFailure` implements strict Digiflazz failure detection based on webhook payload status `gagal`/`failed` and absence of success signals.
- Function `validateTargetPhone` ensures 08-prefixed 10‑15 digit number matches operator prefixes.
