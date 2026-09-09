## Deskripsi
Implementasi mekanisme auto-retry 2x ketika fulfillment Digiflazz menghasilkan status `Pending` atau mengalami error transient (timeout), serta pencatatan detail kegagalan ke dalam metadata transaksi.

---

## Spesifikasi & Requirements

### 1. Auto-Retry Loop (Maksimal 2 Kali)
- Lokasi file: `src/modules/transaction/transaction.service.ts` (pada tahap `targetStatus === 'PAID'`).
- Jika pemanggilan `supplier.createOrder` pertama menghasilkan status `Pending` atau melempar error koneksi:
  - Lakukan jeda backoff singkat (misal: 2 detik).
  - Panggil `supplier.checkOrderStatus(orderId)` atau `supplier.createOrder` ulang dengan idempoten.
  - Batasi maksimal percobaan ulang hingga 2 kali (total 3 kali pemanggilan: 1 awal + 2 retry).
- Jika salah satu percobaan menghasilkan status `Sukses`:
  - Update status transaksi menjadi `SUCCESS`.
  - Simpan `supplierSn` (Serial Number/Token) dan catat `completedAt`.
  - Salurkan loyalty points dan reward referral.

### 2. Error Snapshot & Admin Action Flag
- Jika setelah 2 kali retry status tetap `Pending` / `Gagal`:
  - Simpan ringkasan respon supplier terakhir ke kolom `metadata.lastSupplierError` (mencakup: pesan error Digiflazz, kode respon/RC, status terakhir, dan timestamp).
  - Simpan flag `metadata.needsAdminAction = true` pada transaksi.
  - Catat audit trail: `SUPPLIER_RETRY_EXHAUSTED`.
  - Pertahankan status transaksi pada `PAID` atau `PROCESSING` agar dana buyer aman dan transaksi tercatat siap diintervensi oleh admin.

---

## Acceptance Criteria
1. Respons awal Digiflazz `Pending` secara otomatis memicu pengecekan/retry hingga 2 kali.
2. Jika retry berhasil, status transaksi menjadi `SUCCESS` dan poin loyalty tercairkan.
3. Jika retry tetap gagal/pending, metadata transaksi mencatat snapshot error supplier dan status audit `SUPPLIER_RETRY_EXHAUSTED`.
4. Unit test regresi mencakup skenario: retry sukses di percobaan ke-2, dan retry exhausted setelah 2 kali gagal.
