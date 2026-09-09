## Production domain readiness follow-up — wetri.shop

Fixed in `5049285`:

- Rebranded public UI, API config, legal/support labels, SEO canonical URLs, structured data, navbar/footer, and editor preview from `WETRI.COM` / `wetri.com` to `wetri.shop`.
- Added centralized API URL resolver:
  - production/server fallback: `https://wetri.shop`
  - browser fallback: same-origin
  - explicit `NEXT_PUBLIC_API_URL` remains supported.
- Removed hardcoded `http://localhost:3001` fallbacks from application source.
- Production CORS now defaults to only `https://wetri.shop`; additional explicit origins require `ALLOWED_ORIGINS`.
- Added production metadata base, canonical URL, and Open Graph site URL.
- Updated `.env.example` production template:
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL=https://wetri.shop`
  - `ALLOWED_ORIGINS=https://wetri.shop`
  - `DOKU_ENV=production`
  - dedicated Digiflazz PLN and webhook env names.
- Documented callback endpoints:
  - DOKU: `https://wetri.shop/api/v1/payment/webhook`
  - Digiflazz: `https://wetri.shop/api/v1/supplier/digiflazz/webhook`

Verification:
- `bun test`: **154 pass, 0 fail**.
- Production build with `NEXT_PUBLIC_API_URL=https://wetri.shop`: **PASS**.
- Source and built-client scan for `localhost:3001`, `wetri.com`, and `WETRI.COM`: **PASS (zero matches)**.

Still requires deployment/DNS work before closing #89:
- Point `wetri.shop` DNS to production instance.
- Install TLS certificate and force HTTP → HTTPS at reverse proxy.
- Proxy `/api/*` to backend `127.0.0.1:3001`; proxy remaining paths to Next.js `127.0.0.1:3000`.
- Configure exact callback URLs in DOKU and Digiflazz dashboards.
- Add `wetri.shop` to Firebase authorized domains.
- Populate production secrets and run external HTTPS callback/resource checks.
