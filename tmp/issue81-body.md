## Deskripsi
Tambahkan endpoint inquiry realtime PLN pada backend dengan fitur masking privasi (2 huruf depan + `***` + 2 huruf belakang) dan pastikan query endpoint publik produk `/api/v1/products` memfilter secara ketat hanya produk dengan `isActive = true` DAN `supplierStatus = 'available'`.

---

## Spesifikasi & Requirements

### 1. Filter Ketat Ketersediaan Produk (`src/modules/product/product.routes.ts`)
- Query publik `GET /api/v1/products` hanya mengembalikan produk dengan:
  - `isActive = true`
  - `supplierStatus = 'available'`
- Produk yang sudah dihapus/gangguan/out-of-stock di Digiflazz otomatis tidak ikut terkirim ke frontend.

### 2. Privacy Masking Helper (`src/modules/suppliers/pln-inquiry.service.ts`)
- Fungsi `maskPlnCustomerName(name: string): string`:
  - Jika panjang $\le 4$ karakter: `char[0] + '***' + char[last]`.
  - Jika panjang $> 4$ karakter: `chars[0..1] + '***' + chars[-2..-1]`.
  - Contoh: `"BUDI SANTOSO"` -> `"BU***SO"`, `"SITI NURHALIZA"` -> `"SI***ZA"`.

### 3. Realtime PLN Inquiry Endpoint (`src/modules/suppliers/supplier.routes.ts`)
- `POST /api/v1/supplier/inquire-pln` (publik/auth-optional):
  - Request body: `{ customerNo: string }`
  - Validasi panjang $11-12$ digit angka.
  - Memanggil adapter supplier untuk cek nomor meter / IDPEL.
  - Response sukses: `{ ok: true, customerNo: string, customerName: string, maskedName: string }`
  - Response jika salah / tidak ditemukan: `{ ok: false, message: 'ID Pelanggan PLN tidak ditemukan atau nomor meter salah' }`

### 4. Unit Tests (`tests/pln-inquiry.test.ts`)
- Uji masking nama pelanggan (nama panjang, nama pendek).
- Uji validasi nomor meter PLN (panjang digit, karakter).

---

## Acceptance Criteria
1. Query katalog hanya memuat produk aktif dan supplier available.
2. Endpoint PLN inquiry mengembalikan nama ter-masking sesuai format privasi `BU***SO`.
3. Unit test lolos `bun test`.
