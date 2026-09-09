Parent: #30
Depends on: #54, #55

## Goal
Add game topup UX features required for smooth customer flow.

## Scope
- Fast game/product search.
- Popular category section.
- Product cards with clear price, availability, and CTA.
- Topup detail flow:
  - input user ID/server ID
  - choose nominal
  - choose voucher if eligible
  - show payment summary
  - show total payment
- Transaction status affordance:
  - pending
  - paid
  - processing
  - success
  - failed
- Empty/error states:
  - no products
  - inactive product
  - supplier maintenance
  - failed checkout validation
- Trust hints:
  - process cepat
  - pembayaran aman
  - support 24/7

## Constraints
- Do not build a full per-game rules engine yet.
- Use simple required-field validation first.
- Existing checkout/backend voucher validation remains authoritative.
- No new dependency.
- No public `basePrice` exposure.

## Acceptance
- Customer can find a game/product quickly.
- Topup page clearly shows what to fill and what to pay.
- Voucher UI does not bypass backend validation.
- Mobile-first layout works.
- `bun test` passes.
- `bun run build` passes.
