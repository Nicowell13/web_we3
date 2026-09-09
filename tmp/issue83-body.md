## Deskripsi
Implementasikan alur checkout pintar dari Transaksi Kilat: jika user belum login arahkan ke `/login?redirect=...` dengan parameter checkout lengkap, jika sudah login tampilkan dialogbox pembayaran DOKU langsung, dialogbox status memproses, dan popup sukses perolehan poin royalti.

---

## Spesifikasi & Requirements

### 1. Contextual Login Routing Guard
- Saat user mengklik *"Beli Sekarang"* di Transaksi Kilat:
  - **Jika Guest / Belum Login**:
    - Redirect otomatis ke `/login?redirect=/checkout/{productId}?targetId={...}&serverId={...}&phone={...}`
    - Setelah login sukses, user kembali langsung ke halaman checkout dengan data terisi tanpa mengetik ulang.
  - **Jika Sudah Login**:
    - Langsung buka Checkout/Payment Modal DOKU atau proses pembayaran instan.

### 2. DOKU Payment Modal & Processing Status Dialogbox
- Menampilkan dialogbox checkout WETRI:
  - Ringkasan pesanan & estimasi Poin Royalti yang akan didapatkan.
  - Memanggil `POST /api/v1/payment/create-link` dan me-load `paymentUrl` DOKU Sandbox.
- Menampilkan dialogbox status **"Sedang Memproses Pengisian..."** dengan cyber loading spinner saat status transaksi `PAID` atau `PROCESSING`.

### 3. Success Pop-up & Notifikasi Poin Royalti
- Saat polling status transaksi mendeteksi `SUCCESS`:
  - Buka popup perayaan neon cyber:
    `🎉 Transaksi Berhasil!`
    `✨ Selamat! Anda mendapatkan +{earnedPoints} Poin Royalti WETRI!`
  - Rumus poin: `Math.floor(amount / 1000)` (contoh: Belanja Rp 25.000 -> +25 Poin).
  - Tampilkan Nomor SN / Token PLN hasil pengisian.

---

## Acceptance Criteria
1. Guest diarahkan ke login dengan state checkout tersimpan.
2. User terautentikasi dapat melakukan pembayaran DOKU dan melihat dialogbox status pemrosesan.
3. Transaksi sukses memunculkan notifikasi perolehan poin royalti sesuai nominal belanja beserta nomor SN.
