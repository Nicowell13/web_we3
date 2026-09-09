Parent: #30

## Goal
Make Digiflazz product import reliable and observable: every sync attempt must clearly report success, provider error, malformed response, or rate-limit without pretending failures are zero products.

## Scope
- Use `POST https://api.digiflazz.com/v1/price-list` for catalog import.
- Sign with MD5 of `username + apiKey + "pricelist"`.
- Do not call `/v1/transaction` for product import because it creates top-up orders.
- Do not send unsupported `code: "all"` when requesting full catalog.
- Throw explicit errors for non-2xx responses and non-array payloads.
- Preserve admin `sellPrice` when updating existing products.
- Update supplier-driven fields only: `basePrice`, `brand`, `productType`, `supplierStatus`, `syncedAt`.
- Upsert idempotently by `supplierCode + supplierProductCode`.
- Return `created`, `updated`, `unchanged`, `failed`, and `total`.
- Surface provider error messages, including rate limits, to `/old-school`.

## Tests
- Valid array import creates products.
- Existing product update does not overwrite `sellPrice`.
- Malformed payload throws explicit error.
- Rate-limit message propagates.
- Missing game mapping increments `failed`.

## Acceptance
- `bun test` passes.
- `bun run build` passes.
- `/old-school` sync result shows accurate counts or provider error.
- No credentials, signatures, or supplier secrets exposed in logs/UI.