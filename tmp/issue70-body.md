## Deskripsi Fitur & Perbaikan UX

---

### 1. Quick Order Widget Homepage (`src/components/home/QuickOrderWidget.tsx`)
- [ ] **Strict Provider Filter (Pulsa/Data):**
  - Hanya tampilkan rekomendasi setelah nomor HP valid (>=4 digit prefix terdeteksi).
  - Jika operator terdeteksi (Tri, Telkomsel, XL, Indosat, Axis, Smartfren), filter secara ketat hanya produk provider tersebut.
  - Tampilkan empty state / instruksi jelas jika nomor belum diisi.
- [ ] **Strict Game Filter & Auto Zone:**
  - Filter eksklusif diamond/denom berdasarkan game yang dipilih (MLBB, Free Fire, Magic Chess).
  - Default Zone/Server ID diset ke `ID` (Indonesia) atau disesuaikan per game (misal: Free Fire tidak perlu Zone ID).
- [ ] **Direct Action / Seamless Checkout:**
  - Tombol checkout langsung menuju alur pembayaran yang didukung DOKU Sandbox.

---

### 2. DOKU Sandbox Checkout Page Integration (`src/app/checkout/[productId]/page.tsx`)
- [ ] Pre-populate data dari query parameter (`targetId`, `serverId`, `phone`).
- [ ] Tombol bayar memanggil `/api/v1/payment/create-link` dengan header idempotency dan redirect langsung ke `paymentUrl` DOKU Sandbox.
- [ ] Indikator status loading & error handling yang informatif.

---

### 3. Perbaikan Router Kategori Katalog (`src/app/catalog/page.tsx`)
- [ ] Dukung routing kategori dinamis (`Game`, `Pulsa`, `Data`, `PLN`, `E-Wallet`, `Voucher`).
- [ ] Jika kategori belum memiliki produk aktif di database, tampilkan Empty State UI yang informatif dan tombol kembali ke semua produk.

---

### 4. Custom 404 Page dengan Auto-Redirect 3 Detik (`src/app/not-found.tsx`)
- [ ] Tampilan 404 modern bertema neon cyber WETRI.
- [ ] Countdown timer 3 detik yang otomatis redirect ke homepage (`/`).
- [ ] Tombol manual "Kembali ke Beranda Sekarang".

---

## Acceptance Criteria
1. Quick Order di homepage hanya memunculkan produk provider yang sesuai setelah nomor HP terdeteksi.
2. Pilihan game menampilkan denom game terpilih dengan default server ID.
3. Kategori katalog berfungsi untuk setiap tab; kategori kosong menampilkan empty state.
4. Checkout terhubung ke endpoint payment DOKU.
5. Halaman 404 memiliki countdown 3 detik dan auto-redirect ke home.
6. `bun test` pass 100%.
