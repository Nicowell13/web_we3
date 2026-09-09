Deployed commit https://github.com/Nicowell13/web_we3/commit/e3347d93f4d322fef07b3b759b171f3cbfe5cb2a.

Implemented visible Koreksi Nomor HP action for exact catalog Pulsa/Data categories, native labeled dialog, explicit save separate from financially confirmed repay. Server requires paid + FAILED + matching supplier failure evidence; blocks pending/unknown/timeout/refunded/success evidence. Correction and audit use one DB transaction with row lock. Repay uses a conditional claim before supplier submission and conditional finalization. Phone/operator validation fails closed for unsupported brands; unverified alternate Pulsa/Data SKU is blocked.

Verification:
- Local selected regression suite: 41 passed, 0 failed; dedicated correction/repay suite 8 passed, including mocked audit rollback and lost concurrent claim (zero supplier calls).
- Local Next.js production build passed. Standalone tsc --noEmit still reports test-suite typing errors including missing bun:test declarations and existing mock signatures; not presented as a clean full typecheck or full-suite pass.
- Server selected regression suite: 41 passed, 0 failed; production build passed in a separate staging directory. Existing live .next was preserved as .next-before-e3347d9, not deleted.
- Server HEAD e3347d93f4d322fef07b3b759b171f3cbfe5cb2a; tracked working tree clean; wetri-backend and wetri-frontend active after restart.
- https://wetri.shop/api/health HTTP 200, status ok.
- Admin ping and unauthenticated POST target/repay for a nonexistent verification ID return 401.
- https://wetri.shop/old-school HTTP 200; served asset /_next/static/chunks/app/old-school/page-6a41a4251bb18711.js HTTP 200 contains Koreksi Nomor HP, target-correction-title, and Simpan Nomor.
- Footer.tsx was excluded; no actual financial repay or supplier status probe executed.

Remaining verification: authenticated admin browser interaction and real DB concurrency/rollback integration were not exercised. No connected browser capability is available in this session. Keep issue OPEN until operator confirms dialog visibility and safe save behavior on an eligible confirmed-failed transaction; do not use a real repay as a test. Unsupported by.U/unknown brands and uncertain supplier attempts intentionally remain locked.
