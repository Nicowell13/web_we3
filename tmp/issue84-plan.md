### Ringkasan Permintaan
Optimasi UI & Tata Letak Transaksi Kilat (Quick Order) dengan fokus utama Mobile View & Gaming:
1. **Urutan Tab Transaksi Kilat**:
   - Urutan baru: `Top-up Game` (1), `Paket Data` (2), `Token PLN` (3), `Pulsa` (4).
   - Default tab aktif saat pertama buka: `Top-up Game` (Game first).
2. **Perbedaan Icon Kategori (Mobile Usability)**:
   - Ganti icon `Paket Data` menjadi `Globe` / `Wifi` (lucide icon) agar tidak tertukar/kembar dengan icon `Token PLN` (`Zap`).
3. **Card Produk Mobile-First & Informatif (High Legibility)**:
   - Tampilkan informasi kuota/diamond/nominal pulsa secara jelas dan kontras tinggi tanpa terpotong text clamp.
   - Breakdown isi paket (misal: "XX GB", "XX Diamonds", "Token Rp XX.000") dalam chip/badge terpisah yang mencolok.
   - Pindahkan badge promo dan harga coret agar tidak menutupi nama & detail kuota pada layar HP sempit (viewport < 400px).
   - Pastikan touch area ramah jempol untuk mobile device.

### Rencana File
- `src/components/home/QuickOrderWidget.tsx`
