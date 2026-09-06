### Latar Belakang Masalah
Pada integrasi Digiflazz API pricelist, produk operator seluler (Telkomsel, Indosat, XL, Axis, Tri, Smartfren) memiliki kategori induk 'Pulsa'. Terdapat miss-logic klasifikasi di mana produk Paket Data (kuota, internet, GB) dan Pulsa Reguler sempat tercampur di tabel `games_catalog`, panel Admin (`/old-school`), maupun widget `QuickOrderWidget.tsx`.

### Solusi & Rencana Kerja
1. **Aturan Klasifikasi Tegas (Backend Sync)**:
   - Jika produk seluler mengandung kata `data`, `kuota`, `internet`, `gb`, `unlimited`, `combo`, `freedom`, `flash` $\rightarrow$ Klasifikasikan sebagai Kategori **`Data`** dengan grup `brand + " Data"` (misal: `telkomsel-data`).
   - Jika tidak mengandung kata-kata tersebut $\rightarrow$ Klasifikasikan sebagai Kategori **`Pulsa`** (misal: `telkomsel`).
2. **Admin UI & Dynamic Catalog Routing**:
   - Memastikan tab Admin `/old-school` memisahkan tab `Pulsa` dan `Data` secara independen dengan dropdown brand yang tepat.
3. **Frontend Transaksi Kilat (`QuickOrderWidget.tsx`)**:
   - Tab **Pulsa**: Eksklusif hanya menampilkan produk pulsa nominal murni (bebas dari paket internet/data).
   - Tab **Paket Data**: Eksklusif menampilkan paket internet/kuota GB.
4. **Unit Test & Regression Guard**:
   - Tambah test case ketat untuk membuktikan pemisahan pulsa vs data 100% konsisten.
