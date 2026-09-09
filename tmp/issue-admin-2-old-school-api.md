## Tujuan
Pindahkan semua admin API ke prefix tersembunyi `/api/v1/old-school/*`.

## Scope
- Ubah prefix route admin backend dari `/api/admin` atau `/api/v1/admin` menjadi `/api/v1/old-school`.
- Pastikan semua endpoint admin memakai `requireRole('admin')`.
- Pastikan route lama tidak aktif atau return 404.
- Update tests terkait admin route.

## Route Target
- `GET /api/v1/old-school/ping`
- `GET /api/v1/old-school/users` (jika sudah/akan ada)
- Endpoint admin lain mengikuti prefix ini.

## Security Notes
Obfuscation nama route bukan security utama. Security utama tetap RBAC backend. Route lama wajib mati agar tidak memberi sinyal admin surface.

## Acceptance Criteria
- Admin token valid: `/api/v1/old-school/ping` return 200.
- User biasa: `/api/v1/old-school/ping` return 403.
- Tanpa token: `/api/v1/old-school/ping` return 401.
- `/api/admin/ping` return 404.
- `/api/v1/admin/ping` return 404.
- `bun test` lolos.
