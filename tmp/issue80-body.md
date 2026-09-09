## Deskripsi
Bangun komponen UI interaktif pada halaman Admin Dashboard (`src/app/old-school/page.tsx`) untuk kontrol masal status produk (Enable/Disable masal), matrix pengatur margin profit masal, serta monitor & trigger sinkronisasi Digiflazz 00:00 WIB.

---

## Spesifikasi & Requirements

### 1. Panel "Bulk Product Manager & Pricing Matrix" (`src/app/old-school/page.tsx`)
- **Scope Selector**:
  - Dropdown pilihan: `Semua Produk`, atau filter berdasarkan Kategori (`Game`, `Pulsa`, `Data`, `PLN`, `E-Wallet`, `Voucher`), atau Game ID tertentu.
- **Bulk Status Controls**:
  - Tombol aksi *"Aktifkan Semua Terpilih"* (menyetel `isActive = true`).
  - Tombol aksi *"Nonaktifkan Semua Terpilih"* (menyetel `isActive = false`).
  - Indikator feedback jumlah produk yang terpengaruh.
- **Bulk Profit Margin Setter**:
  - Pilihan tipe margin: Radio button `Persentase (%)` atau `Nominal Tetap (Rp)`.
  - Input field nilai margin (contoh: `5` untuk 5% atau `2000` untuk Rp 2.000).
  - Formula preview: `Contoh modal Rp 10.000 -> Harga jual Rp 10.500 (+5%)`.
  - Tombol eksekusi *"Terapkan Margin Masal"*.

### 2. Status Auto-Sync Indicator & Manual Trigger
- Menampilkan card status scheduler:
  - *"Auto-Sync Digiflazz: Terjadwal Pukul 00:00 WIB"*.
  - Menampilkan timestamp sinkronisasi terakhir.
  - Tombol *"Sync Manual Sekarang"* yang memanggil endpoint `POST /api/v1/old-school/products/sync-now`.

### 3. Loading, Feedback & Error Handling
- Menampilkan status loading saat operasi masal sedang berjalan.
- Menampilkan alert / toast sukses dengan jumlah item yang berhasil di-update.

---

## Acceptance Criteria
1. Admin dapat memilih kategori/semua produk dan mengaktifkan/menonaktifkan sekaligus dari UI.
2. Admin dapat menyetel margin persentase/fixed dan melihat feedback perubahan harga jual.
3. Tombol "Sync Manual Sekarang" mengeksekusi sinkronisasi dan memperbarui tampilan UI.
4. UI responsif dan konsisten dengan tema cyberpunk WETRI.
