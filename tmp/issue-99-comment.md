Fixed in `ebdeed4`.

## Change
- Moved selected product checkout action above the product grid in `QuickOrderWidget`.
- Checkout button now appears directly after the target/customer input area once a product is selected.
- Button remains disabled until target input is valid; PLN still requires successful customer inquiry.
- Mobile product grid now uses 2 columns consistently: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`.

## Verification
- `bun test`: 160 pass, 0 fail.
- `bun run build`: success.
- Production deployed commit `ebdeed4`.
- `wetri-backend` active, `wetri-frontend` active.
- `https://wetri.shop/api/health`: OK.
