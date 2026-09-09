## Tujuan
Tambah dokumentasi singkat untuk membuat admin pertama secara aman lewat Supabase SQL, tanpa public endpoint.

## Scope
- Tambah dokumen project, misalnya `docs/admin-access.md` atau bagian README.
- Jelaskan bahwa Firebase Auth hanya login, role aplikasi ada di Supabase `users.role`.
- Jelaskan cara promote admin pertama via SQL.
- Jelaskan cara rollback admin ke user.
- Jelaskan verifikasi akses `/old-school`.

## SQL Contoh
```sql
UPDATE users
SET role = 'admin'
WHERE email = 'email-admin@gmail.com';
```

Lebih aman jika UID diketahui:
```sql
UPDATE users
SET role = 'admin'
WHERE id = 'firebase_uid_admin';
```

Rollback:
```sql
UPDATE users
SET role = 'user'
WHERE id = 'firebase_uid_admin';
```

## Acceptance Criteria
- Tidak ada endpoint public untuk promote admin.
- Dokumen menyebut risiko dan langkah rollback.
- Dokumen tidak menyimpan secret/password.
