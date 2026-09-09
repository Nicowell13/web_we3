## Deskripsi
Implementasi tipe voucher kompensasi khusus (`compensation`) yang dibuat oleh admin untuk pengguna tertentu yang mengalami kendala transaksi. Voucher ini terkunci khusus untuk user target dan hanya dapat digunakan tepat satu kali.

---

## Spesifikasi & Requirements

### 1. Perubahan Skema Database (`src/db/schema.ts`)
- Tambahkan kolom `targetUserId` (tipe `text`, foreign key ke `users.id`, nullable) pada tabel `vouchers`.
- Pastikan enum atau tipe `voucherType` mendukung nilai `compensation`.

### 2. Validasi Ketat Voucher Kompensasi (`src/modules/voucher/voucher.routes.ts`)
- Di fungsi `validateVoucherEligibility(voucher, userId)`:
  - Jika `voucher.voucherType === 'compensation'` atau `voucher.targetUserId` terisi:
    - Wajib memeriksa apakah `userId === voucher.targetUserId`.
    - Jika user yang login bukan target penerima voucher, tolak dengan error: *"Voucher kompensasi ini khusus untuk akun penerima tertentu."*
    - Pastikan kuota pemakaian dibatasi tepat 1 kali (`quota: 1`).
    - Pastikan voucher tidak dapat digunakan kembali jika status pada `userVouchers.isUsed` sudah bernilai `true`.

### 3. Endpoint Admin Pembuatan Voucher Kompensasi
- Route: `POST /api/v1/old-school/vouchers/create-compensation` (Admin only).
- Request Payload:
  ```json
  {
    "targetUserId": "user_uid_123",
    "discountType": "fixed", // atau "percentage"
    "discountValue": "50000",
    "minPurchase": "0",
    "expiryDays": 30,
    "reason": "Kompensasi gangguan transaksi order WETRI-20260906-XXXX"
  }
  ```
- **Logika Endpoint:**
  - Generate kode voucher unik (contoh: `COMP-WETRI-XXXXXX`).
  - Simpan voucher dengan `voucherType: 'compensation'`, `targetUserId`, `quota: 1`, `isPublic: false`.
  - Otomatis masukkan voucher ke tabel `userVouchers` agar langsung muncul di akun user penerima.
  - Catat event `COMPENSATION_VOUCHER_CREATED` pada tabel `auditTrails`.

---

## Acceptance Criteria
1. Voucher bertipe `compensation` hanya bisa divalidasi dan digunakan oleh `targetUserId` yang ditentukan.
2. User lain yang mencoba memakai kode voucher kompensasi tersebut akan ditolak.
3. Voucher kompensasi hanya dapat digunakan tepat 1 kali.
4. Admin dapat membuat voucher kompensasi langsung dari API admin.
5. Unit test komprehensif menguji: akses user sah vs user tidak sah, proteksi 1x pakai, dan pencatatan audit.
