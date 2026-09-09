## Tujuan
Audit dan rapikan dasar role user/admin sebelum fitur admin dashboard ditambah.

## Scope
- Review `src/middleware/auth.ts`, `src/modules/auth/*`, `src/db/schema.ts`, dan route yang memakai admin access.
- Pastikan Firebase ID token hanya dipakai untuk identity (`uid`, `email`, `name`, `picture`).
- Pastikan authority aplikasi selalu dari Supabase Postgres `users.role`.
- Pastikan `syncUserFromFirebase` membuat user baru dengan role default `user`.
- Pastikan tidak ada endpoint publik yang bisa mengubah role user menjadi admin.

## Implementation Notes
- Jangan tambah dependency.
- Jangan ubah schema kalau `users.role` sudah cukup.
- Jika ada route admin yang belum memakai `requireRole('admin')`, tandai dan perbaiki.

## Acceptance Criteria
- Semua admin-only backend path terlindungi `authenticate` + `requireRole('admin')`.
- User baru hasil Google login tetap `role = 'user'`.
- Tidak ada public self-promote admin route.
- Tests auth/RBAC mencakup 401 tanpa token dan 403 untuk user biasa.
