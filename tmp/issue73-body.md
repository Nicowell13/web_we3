## Deskripsi
Perbaiki sinkronisasi routing kategori pada katalog publik (`src/app/catalog/page.tsx`) dan lengkapi dengan Empty State UI informatif.

---

## Spesifikasi & Requirements

### 1. Kategori Routing Tab
- Dukung kategori publik:
  - `Semua`
  - `Game`
  - `Pulsa`
  - `Data`
  - `PLN`
  - `E-Wallet`
  - `Voucher`
- URL filter mendukung query param `?category=<categoryName>` (contoh: `/catalog?category=Data`).
- Active tab state tersinkronisasi otomatis saat user berpindah tab atau mengakses URL langsung.

### 2. Empty State UI
- Jika kategori yang dipilih belum memiliki produk aktif di database:
  - Tampilkan ilustrasi / icon yang sesuai (contoh: `Inbox` / `PackageX`).
  - Judul: *"Belum Ada Produk Tersedia"*
  - Deskripsi: *"Produk untuk kategori **[Nama Kategori]** sedang dalam proses penyiapan. Silakan cek kategori lainnya."*
  - Action button: *"Lihat Semua Produk"* (reset filter ke semua).

---

## Acceptance Criteria
1. Klik tab `Data` memfilter hanya produk berkategori Data.
2. Klik tab yang kosong menampilkan Empty State UI dan tidak halaman putih / error.
3. Tombol "Lihat Semua Produk" pada empty state mengembalikan view ke seluruh katalog.
