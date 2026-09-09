## Tujuan
Buat admin dashboard frontend di route `/old-school`, bukan `/admin`.

## Scope
- Buat page `src/app/old-school/page.tsx`.
- Pakai Firebase login state dari `AuthContext`.
- Panggil backend admin check endpoint (`GET /api/v1/old-school/ping` atau `/me`) dengan Bearer ID token.
- Render dashboard admin hanya jika backend return 200.
- Jika 401: tampilkan login / minta login ulang.
- Jika 403: tampilkan generic 404-style supaya route admin tidak terekspos ke user biasa.
- Jangan tampilkan link admin di navbar untuk user biasa.

## UI Notes
- Clean, modern, matching current cyberpunk design system.
- Jangan pakai nama “admin” pada URL.
- Text boleh menyebut “Old School Control” di dalam dashboard setelah akses valid.

## Acceptance Criteria
- `/old-school` bisa diakses admin valid.
- User biasa mendapat halaman generic not found / unauthorized tanpa detail role.
- Tidak ada `/admin` page aktif.
- `next build` lolos.
