## Deskripsi
Implementasikan endpoint backend untuk manipulasi masal (bulk commands) status aktivasi produk dan perubahan profit margin, serta jadwalkan cron auto-sync Digiflazz setiap pukul 00:00 WIB (17:00 UTC).

---

## Spesifikasi & Requirements

### 1. Bulk Commands Endpoint (`src/modules/admin/admin.routes.ts`)
Terproteksi otentikasi role `admin`:
- **POST `/api/v1/old-school/products/bulk-status`**:
  - Request Body:
    ```json
    {
      "isActive": boolean,
      "scope": "all" | "category" | "gameId" | "ids",
      "target": string | string[]
    }
    ```
  - Mengubah kolom `isActive` secara massal sesuai cakupan filter (`all`, kategori tertentu seperti `Game`/`Pulsa`, `gameId`, atau daftar `id`).
  - Mencatat audit trail `ADMIN_BULK_STATUS_UPDATE`.

- **POST `/api/v1/old-school/products/bulk-margin`**:
  - Request Body:
    ```json
    {
      "marginType": "percentage" | "fixed",
      "marginValue": number,
      "scope": "all" | "category" | "gameId" | "ids",
      "target": string | string[]
    }
    ```
  - Mengupdate `marginType` dan `marginValue` lalu seketika menghitung ulang `sellPrice = calculateSellPrice(basePrice, marginType, marginValue)` untuk semua produk terpilih.
  - Mencatat audit trail `ADMIN_BULK_MARGIN_UPDATE`.

### 2. Auto-Sync Scheduler Pukul 00:00 WIB (`server/cron.ts` atau scheduler service)
- Jadwal otomatis berjalan setiap hari pukul **00:00 WIB** (`17:00 UTC`).
- Alur:
  1. Fetch price-list terbaru dari Digiflazz.
  2. Perbarui modal `basePrice` dan ketersediaan stok (`buyer_product_status`/`seller_product_status`).
  3. Hitung ulang `sellPrice` otomatis untuk produk dengan `marginType = 'percentage'`.
  4. Catat ringkasan eksekusi ke `system_configs` dan log `DIGIFLAZZ_MIDNIGHT_SYNC_SUCCESS`.
- Endpoint manual trigger: `POST /api/v1/old-school/products/sync-now`.

### 3. Unit Tests (`tests/bulk-products.test.ts`)
- Uji bulk activate/deactivate dengan scope `all` dan scope `category`.
- Uji bulk margin update dan pastikan `sellPrice` seluruh produk terhitung ulang.

---

## Acceptance Criteria
1. Admin dapat mengaktifkan/menonaktifkan produk masal via endpoint.
2. Admin dapat merubah margin persentase/fixed masal dan `sellPrice` langsung terhitung ulang.
3. Scheduler 00:00 WIB terdaftar dan dapat dijalankan secara aman.
4. Semua unit tests lolos `bun test`.
