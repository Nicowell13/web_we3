## Deskripsi
Sederhanakan homepage (`src/app/page.tsx`) dengan menghapus kategori dan katalog populer agar berfokus 100% pada Transaksi Kilat, tambahkan badge promo di setiap item produk, teks peringatan validasi ID/No HP, serta integrasi realtime inquiry PLN di widget.

---

## Spesifikasi & Requirements

### 1. Simplifikasi Homepage (`src/app/page.tsx`)
- Hapus section Kategori Produk dan Katalog Populer.
- Jadikan Hero Section & QuickOrderWidget (Transaksi Kilat) sebagai elemen utama sentral di atas lipatan layar.
- Pertahankan Banner Benefit Poin Loyalty & Live Ticker.

### 2. Badge Promo & Cyber Visuals (`src/components/home/QuickOrderWidget.tsx`)
- Setiap kartu denominasi yang muncul diberi badge cyberpunk: `🔥 PROMO`, `⚡ INSTANT`, atau `💎 HEMAT`.
- Tampilkan highlight harga jual neon cyan dan coret harga komparasi baseline (strikethrough) untuk meningkatkan daya tarik.
- Filter produk lokal di frontend hanya yang `isActive === true` dan `supplierStatus === 'available'`.

### 3. Peringatan Validasi Input Data
- Di bawah field input Target ID / Nomor HP, tambahkan teks peringatan cyber:
  `⚠️ Pastikan ID / No HP Anda sudah benar. Kesalahan input data di luar tanggung jawab sistem.`

### 4. Realtime Inquiry PLN Box
- Pada tab PLN, saat user selesai mengetik 11-12 digit IDPEL:
  - Tampilkan status memeriksa online.
  - Jika valid: tampilkan box hijau `👤 Nama Pelanggan: BU***SO`.
  - Jika tidak ditemukan/salah: tampilkan box merah `❌ ID Pelanggan tidak terdaftar atau salah. Periksa kembali.`

---

## Acceptance Criteria
1. Homepage bersih dari katalog lama dan berfokus penuh ke Transaksi Kilat.
2. Setiap kartu produk memiliki badge promo dan harga coret komparasi.
3. Muncul teks peringatan di bawah input ID/No HP.
4. Input PLN 11-12 digit otomatis mengecek nama pelanggan dan merender nama termasking.
