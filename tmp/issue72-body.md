## Deskripsi
Hubungkan halaman checkout (`src/app/checkout/[productId]/page.tsx`) dan inline dialog order dengan DOKU Sandbox payment gateway.

---

## Spesifikasi & Requirements

### 1. Pre-population Data Transaksi
- Tangkap query param dari URL/Widget:
  - `phone` atau `targetId` (Nomor HP, ID Pelanggan PLN, atau User ID Game).
  - `serverId` atau `zoneId` (Server ID untuk game yang memerlukan).
- Tampilkan ringkasan pesanan:
  - Nama Produk & Denominasi.
  - Target Tujuan (No HP / ID Game).
  - Rincian Biaya & Total Pembayaran.
  - Estimasi perolehan Loyalty Points.

### 2. Integrasi DOKU Payment Gateway
- Saat tombol **"Bayar Sekarang"** diklik:
  - Lakukan validasi input (target ID wajib diisi).
  - Generate/reuse `Idempotency-Key` (UUIDv4).
  - Kirim request `POST /api/v1/payment/create-link` dengan payload:
    ```json
    {
      "productId": "<productId>",
      "targetUserId": "<targetId>",
      "targetServerId": "<serverId>",
      "voucherCode": "<voucherCode (opsional)>"
    }
    ```
  - Terima respons yang berisi `paymentUrl` (DOKU Checkout URL).
  - Redirect browser user langsung ke `paymentUrl`.

### 3. Error Handling & State UI
- State `submitting` (disable tombol bayar, tampilkan spinner).
- Tangani error dari API (contoh: saldo poin tidak cukup, voucher expired, atau koneksi timeout).
- Dukungan DOKU Sandbox mode untuk environment lokal/staging.

---

## Acceptance Criteria
1. Klik tombol checkout pada produk valid mengarahkan ke form pembayaran.
2. Endpoint `POST /api/v1/payment/create-link` berhasil menerima payload dan mengembalikan URL DOKU Sandbox.
3. User berhasil diredirect ke link pembayaran DOKU.
4. Error request ditampilkan jelas tanpa crash.
