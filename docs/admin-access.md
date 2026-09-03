# Admin Access & RBAC Guide

## 1. Arsitektur Role & Keamanan

WETRI menggunakan pemisahan tanggung jawab antara autentikasi identitas dan otorisasi aplikasi:
- **Firebase Auth**: Bertindak sebagai identity provider (Google Sign-In, verifikasi token JWT). Custom claims pada token Firebase **tidak** dipercaya untuk hak akses server.
- **Supabase PostgreSQL (`users.role`)**: Sumber kebenaran tunggal (*single source of truth*) untuk role aplikasi (`'user'` atau `'admin'`).
- **Route Obfuscation**: Dashboard admin diakses melalui route `/old-school` dan API `/api/v1/old-school/*`. Non-admin yang mencoba mengakses akan menerima respon generic 404 (Not Found) untuk menyembunyikan keberadaan portal admin.

Tidak ada endpoint publik untuk pendaftaran atau peningkatan role menjadi admin.

---

## 2. Cara Promosi Akun Menjadi Admin Pertama

Admin pertama dibuat secara langsung melalui query SQL di Dashboard Supabase.

### Langkah-langkah:
1. Pastikan akun sudah login minimal satu kali di website (agar data tersinkronisasi ke tabel `users`).
2. Buka **Supabase Dashboard** → Pilih Project Anda → Menu **SQL Editor**.
3. Jalankan query berikut:

```sql
-- Opsi 1: Berdasarkan Email Google Akun Admin
UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE email = 'admin-email@gmail.com';
```

Jika mengetahui Firebase UID akun:
```sql
-- Opsi 2: Berdasarkan Firebase UID (Lebih Presisi)
UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE id = 'FIREBASE_UID_ANDA';
```

---

## 3. Verifikasi Akses Admin

1. Buka browser dan login menggunakan akun yang baru dipromosikan di **http://localhost:3000**.
2. Kunjungi halaman tersembunyi:
   ```text
   http://localhost:3000/old-school
   ```
3. Dashboard **Old School Control** akan terbuka dan menampilkan metrik omset, system configs, serta live audit logs.

---

## 4. Cara Rollback / Cabut Hak Akses Admin

Untuk menurunkan status admin kembali menjadi user biasa:

```sql
UPDATE users
SET role = 'user', updated_at = NOW()
WHERE email = 'admin-email@gmail.com';
```

Perubahan berlaku seketika pada request backend berikutnya karena setiap request membaca role langsung dari database Supabase.
