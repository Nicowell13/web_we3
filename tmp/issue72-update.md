## Deskripsi
Hubungkan halaman checkout (`src/app/checkout/[productId]/page.tsx`) dan inline dialog order dengan DOKU Sandbox payment gateway, dilengkapi dengan smart contextual login redirect dan post-payment dashboard redirect.

---

## Spesifikasi & Requirements

### 1. Smart Auth Gate saat Checkout
- **Kondisi Belum Login (Guest):**
  - Saat user menekan tombol **"Bayar Sekarang"** / Checkout dan statusnya belum login:
  - Simpan intent transaksi (productId, targetId, serverId, voucher) di query param atau sessionStorage.
  - Alihkan user ke halaman login (`/login?redirect=/checkout/[productId]&targetId=...&serverId=...`).
- **Kondisi Setelah Login Sukses:**
  - Jika ada param `redirect`, sistem otomatis mengarahkan user kembali ke proses checkout yang tertunda.
  - Jika user login biasa (tanpa intent checkout / tanpa param redirect), user diarahkan normal ke `/dashboard`.
- **Kondisi Sudah Login:**
  - Langsung lanjutkan proses pembuatan link pembayaran tanpa redirect login tambahan.

### 2. Integrasi DOKU Payment Gateway Sandbox
- Kirim request `POST /api/v1/payment/create-link` dengan payload:
  ```json
  {
    "productId": "<productId>",
    "targetUserId": "<targetId>",
    "targetServerId": "<serverId>",
    "voucherCode": "<voucherCode (opsional)>"
  }
  ```
  beserta header `Authorization: Bearer <token>` dan `Idempotency-Key`.
- Ambil `paymentUrl` dari DOKU dan arahkan user ke URL pembayaran tersebut.

### 3. Post-Payment Redirect ke Dashboard
- Setelah menyelesaikan pembayaran di DOKU / saat DOKU redirect kembali ke aplikasi:
  - User diarahkan ke `/dashboard` (atau `/dashboard/orders`) agar pembeli dapat langsung memantau status order, nomor resi/SN, dan riwayat transaksi secara real-time.

---

## Acceptance Criteria
1. Buyer yang belum login saat checkout dialihkan ke `/login?redirect=...` untuk mempermudah pelacakan order.
2. Login biasa tanpa redirect tetap masuk ke `/dashboard`.
3. Setelah login via alur checkout, buyer langsung kembali ke checkout/pembayaran tanpa mengisi ulang data.
4. Selesai pembayaran, return URL mengarahkan buyer ke dashboard untuk memantau status pesanan.
5. Endpoint create-link terhubung ke DOKU Sandbox.
