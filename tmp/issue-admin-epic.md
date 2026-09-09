## Ringkasan
Rancang dan implementasikan pemisahan role user/admin yang aman dengan Firebase Auth sebagai identity provider dan Supabase Postgres sebagai sumber role aplikasi. Admin dashboard harus memakai route tersembunyi `/old-school`, bukan `/admin`.

## Scope
- Firebase Auth hanya untuk login dan verifikasi ID token.
- Supabase Postgres tabel `users` menyimpan `role` (`user` | `admin`).
- Semua akses admin divalidasi backend via RBAC server-side.
- Admin dashboard frontend berada di `/old-school`.
- Route lama `/admin` dan `/api/admin/*` tidak boleh aktif.

## Prinsip Keamanan
- Jangan percaya role dari frontend.
- Jangan buat public route untuk promote admin.
- Admin pertama dipromote manual via SQL Supabase.
- User non-admin yang membuka `/old-school` mendapat tampilan generic 404-style, bukan pesan yang mengungkap route admin.

## Sub-issues
- Audit RBAC dan model data role.
- Rename backend admin API ke `/api/v1/old-school/*`.
- Buat frontend admin dashboard `/old-school` dengan guard aman.
- Tambah admin management minimal + dokumentasi promote admin pertama.
- Hardening test dan clean-up route lama.

## Acceptance Criteria
- User biasa tidak bisa akses admin API maupun page.
- Admin valid bisa akses `/old-school` dan endpoint admin baru.
- Route `/admin`, `/api/admin/*`, `/api/v1/admin/*` tidak expose admin dashboard/API.
- `bun test` dan `next build` lolos.
