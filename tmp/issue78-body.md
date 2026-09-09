## Deskripsi
Tambahkan dukungan kolom aturan margin pada skema tabel `products` dan integrasikan formula kalkulasi harga jual dinamis (`sellPrice`) yang otomatis menghitung ulang harga jual saat harga modal supplier (`basePrice`) diperbarui.

---

## Spesifikasi & Requirements

### 1. Database Schema (`src/db/schema.ts`)
- Tambahkan kolom pada tabel `products`:
  - `marginType`: `text('margin_type').default('percentage').notNull()` (nilai: `'percentage' | 'fixed'`).
  - `marginValue`: `numeric('margin_value', { precision: 10, scale: 2 }).default('5.00').notNull()` (contoh: 5.00 untuk 5% atau 1500.00 untuk Rp 1.500).

### 2. Dynamic Pricing Engine (`src/modules/product/pricing.service.ts`)
- Buat fungsi murni `calculateSellPrice(basePrice: number, marginType: 'percentage' | 'fixed', marginValue: number): number`:
  - Jika `marginType === 'percentage'`:
    $$\text{sellPrice} = \lceil \text{basePrice} \times (1 + \frac{\text{marginValue}}{100}) \rceil$$
  - Jika `marginType === 'fixed'`:
    $$\text{sellPrice} = \lceil \text{basePrice} + \text{marginValue} \rceil$$
- Integrasikan ke dalam service sinkronisasi produk (`src/modules/suppliers/supplier-sync.service.ts` / handler sync Digiflazz):
  - Saat `basePrice` baru didapatkan dari Digiflazz, perbarui `sellPrice` berdasarkan `marginType` dan `marginValue` produk tersebut.

### 3. Unit Tests (`tests/dynamic-pricing.test.ts`)
- Uji perhitungan margin persentase dan margin fixed.
- Uji pembulatan harga ke atas (ceiling).
- Uji bahwa perubahan `basePrice` memperbarui `sellPrice` secara proporsional.

---

## Acceptance Criteria
1. Skema `products` menyimpan `marginType` dan `marginValue`.
2. Fungsi kalkulasi harga mengembalikan nilai integer bulat ke atas.
3. Seluruh unit tests lolos `bun test`.
