# Plan Arsitektur Sync Digiflazz Admin

## 1. Price Sync (Setiap 4 Jam)
- **Tujuan**: Memperbarui harga modal (`basePrice`), menghitung ulang harga jual (`sellPrice`) berdasarkan margin aktif, dan sinkronisasi produk baru/seller status.
- **Trigger**: Scheduler interval 4 jam (`setInterval` 4 * 3600 * 1000) & manual button di `/old-school`.
- **Logic**:
  1. Fetch `cmd: 'prepaid'` dari Digiflazz API (`/price-list`).
  2. Map dan klasifikasi produk (`Game`, `Pulsa`, `Data`, `PLN`, `E-Wallet`, `Voucher`, `Other`).
  3. Update `basePrice` jika berubah.
  4. Hitung ulang `sellPrice` jika ada margin rule (`fixed` / `percentage`).
  5. Catat audit trail `DIGIFLAZZ_PRICE_SYNC_SUCCESS`.

## 2. Product/Status Check (Setiap 1 Jam)
- **Tujuan**: Sinkronisasi status ketersediaan produk (`available` vs `off`), gangguan, atau stok kosong dari seller.
- **Trigger**: Scheduler interval 1 jam (`setInterval` 1 * 3600 * 1000).
- **Logic**:
  1. Fetch lightweight status / price-list.
  2. Bandingkan `buyer_product_status` & `seller_product_status`.
  3. Jika supplier status menjadi `off` / gangguan, set `supplierStatus = 'off'` dan nonaktifkan checkout (`isActive = false` untuk safety).
  4. Jika supplier pulih kembali, set `supplierStatus = 'available'`.
  5. Catat audit log perubahan status produk.

## 3. Transaction Validation (Setiap Transaksi / Pre-Fulfillment)
- **Tujuan**: Mencegah kerugian akibat lonjakan harga supplier mendadak antara waktu checkout dan pembayaran.
- **Trigger**: Hook di `advanceTransaction` saat status transisi dari `PAID` ke `PROCESSING` (sebelum hit `/transaction`).
- **Logic**:
  1. Ambil `max_price` atau cek harga modal produk terbaru di DB/cache.
  2. Validasi: `sellPrice >= currentBasePrice` (memastikan margin tidak negatif/rugi).
  3. Kirim parameter order ke Digiflazz `/transaction` dengan `max_price` (jika didukung) atau validasi batas atas harga modal.
  4. Jika harga modal melonjak melebihi harga jual, hentikan auto-order, set status transaksi `NEEDS_ADMIN_ACTION`, dan buat notifikasi refund/audit.

---
Plan siap dieksekusi setelah disetujui.
