# Plan Implementasi Webhook Digiflazz & Token PLN Fulfillment

## 1. Webhook Endpoint Digiflazz
- **Endpoint**: `POST /api/v1/supplier/digiflazz/webhook`
- **Security & Headers**:
  - `X-Hub-Signature`: Validasi HMAC SHA1 (`sha1=...`) menggunakan secret key webhook Digiflazz.
  - `X-Digiflazz-Event`: `create` / `update`.
  - `User-Agent`: `Digiflazz-Hookshot` (Prepaid).

## 2. Status Lifecycle Handling
- **`status: 'Sukses'` & `rc: '00'`**:
  1. Update transaksi: `status = 'SUCCESS'`, `supplierReference = ref_id`, `supplierSn = sn`, `completedAt = now()`.
  2. Ekstrak Serial Number (`sn`) untuk token PLN (contoh SN Token PLN: `1234-5678-9012-3456-7890/NUR ROCHMAH/R1/1300VA/12.5KWH`).
  3. Beri reward loyalty points & referral reward (jika ada).
  4. Simpan log audit `DIGIFLAZZ_WEBHOOK_SUCCESS`.
- **`status: 'Gagal'`**:
  1. Update transaksi: `status = 'FAILED'`, `metadata.lastSupplierError = message`.
  2. Tandai `needsAdminAction` jika order sudah terlanjur dibayar via DOKU agar admin bisa proses refund/repay manual.
  3. Simpan log audit `DIGIFLAZZ_WEBHOOK_FAILED`.
- **`status: 'Pending'`**:
  1. Pertahankan `status = 'PROCESSING'`.
  2. Simpan log audit `DIGIFLAZZ_WEBHOOK_PENDING`.

## 3. Khusus Pembelian Token PLN: Konfirmasi & Tampilan No. Token
- **Format SN Token PLN**:
  - Digiflazz mengembalikan nomor token 20 digit di awal string `sn` (sering dipisah strip `-` atau spasi, contoh: `1234-5678-9012-3456-7890/NUR...`).
  - Buat helper parser `parsePlnToken(sn)` untuk mengekstrak 20 digit token murni dengan format rapi (`XXXX-XXXX-XXXX-XXXX-XXXX`), nama pelanggan, tarif/daya, dan jumlah kWh.
- **Frontend / Dashboard / Order Detail UX**:
  - Tampilkan kartu khusus **Token Listrik PLN**:
    - **No. Token (20 Digit)** dengan tombol `Salin Token`.
    - **No. Meter / IDPEL**: `customer_no`.
    - **Nama Pelanggan**: Nama terverifikasi.
    - **Tarif / Daya & Estimasi kWh**: Ditampilkan jelas.
    - **Petunjuk Pengisian**: Cara memasukkan 20 digit angka ke meteran listrik pelanggan lalu tekan Enter.

---
Plan siap dijadikan GitHub Issue dan dieksekusi.
