## Masalah
Riwayat transaksi dashboard menumpuk pada layar mobile. Semua transaksi juga memakai label umum "Game Top-up", sehingga admin dan pengguna sulit membedakan Game, Pulsa, Paket Data, dan Token PLN.

## Rencana
1. Sertakan kategori katalog, nama layanan, denominasi, metadata, dan SN supplier pada payload dashboard.
2. Buat kartu transaksi khusus mobile dengan hierarki informasi: kategori/layanan, status, target, nominal, waktu, Order ID, lalu hasil/token.
3. Pertahankan tabel ringkas untuk desktop.
4. Gunakan label target menurut kategori: ID Game, Nomor HP, Nomor Paket Data, dan ID Pelanggan/No. Meter PLN.
5. Pastikan token PLN dan aksi salin tetap mudah ditemukan.

## Acceptance criteria
- Layar sempit tidak memakai tabel horizontal atau informasi bertumpuk.
- Setiap transaksi menampilkan kategori benar: Game, Pulsa, Paket Data, atau Token PLN.
- Label target mengikuti kategori transaksi.
- Order ID, status, nominal, waktu, target, dan token/SN tetap tersedia.
- Test lokal dan production build lulus sebelum deployment.
