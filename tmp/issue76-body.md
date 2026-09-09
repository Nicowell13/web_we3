## Deskripsi
Sediakan endpoint dan antarmuka admin untuk melakukan intervensi terhadap pesanan yang gagal di supplier, meliputi eksekusi pembelian ulang (Repay) dan opsi pengalihan ke SKU supplier alternatif (Switch SKU) jika terjadi stok habis atau gangguan provider.

---

## Spesifikasi & Requirements

### 1. Endpoint Admin Repay & Switch SKU
- Route: `POST /api/v1/old-school/orders/:orderId/repay` (Memerlukan role `admin`).
- Request Body (Opsional):
  ```json
  {
    "overrideSupplierSku": "MLBB86_ALT", // Jika ingin mengganti ke SKU supplier lain
    "adminNotes": "Dialihkan ke supplier alternatif karena SKU utama gangguan"
  }
  ```
- **Logika Eksekusi:**
  - Validasi transaksi: hanya transaksi dengan status `PAID` atau `PROCESSING` yang dapat diintervensi.
  - Tentukan SKU supplier: gunakan `overrideSupplierSku` jika dikirimkan admin; jika tidak ada, gunakan `supplierProductCode` asli dari transaksi.
  - Generate reference ID unik untuk percobaan baru (misal: `${orderId}-R${attemptCount}`).
  - Panggil `supplier.createOrder(targetSku, customerNo, amount, newRefId)`.
  - Jika respon Digiflazz `Sukses`:
    - Update transaksi ke `SUCCESS`, simpan `supplierSn`, update `completedAt`.
    - Cairkan loyalty points dan catat audit `ADMIN_REPAY_SUCCESS`.
  - Jika respon Digiflazz `Gagal`/`Pending`:
    - Update `metadata.lastSupplierError` dengan error terbaru dan kembalikan pesan detail ke admin.

### 2. Admin UI: Panel Intervensi Transaksi Gagal
- Lokasi: `src/app/old-school/page.tsx`.
- Tambahkan filter / tab khusus pesanan yang membutuhkan tindakan admin (`needsAdminAction: true` atau status `PAID` tanpa SN).
- Tampilkan detail error dari supplier:
  - Pesan error Digiflazz terakhir (contoh: *"Stok habis"*, *"Harga berubah"*).
  - Tombol **"Coba Lagi (Repay SKU Asli)"**.
  - Dropdown pilihan SKU alternatif dan tombol **"Pindah SKU & Eksekusi Pembelian"**.

---

## Acceptance Criteria
1. Admin dapat memicu pembelian ulang manual via endpoint `/repay`.
2. Admin dapat mengalihkan pembelian ke SKU alternatif jika supplier utama kehabisan stok.
3. Transaksi yang berhasil di-repay berubah menjadi `SUCCESS` dan nomor resi/SN tercatat.
4. Seluruh aksi admin dicatat di audit log.
