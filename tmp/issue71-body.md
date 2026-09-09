## Deskripsi
Implementasi strict operator matching & filtering di QuickOrderWidget pada homepage (`src/components/home/QuickOrderWidget.tsx`).

---

## Spesifikasi & Requirements

### 1. Pulsa & Paket Data
- **State Awal (Empty/Incomplete Input):**
  - Jika nomor HP `< 4 digit` atau belum diinput, **jangan tampilkan produk provider secara acak / campur**.
  - Tampilkan petunjuk UI: *"Masukkan nomor handphone (minimal 4 digit) untuk melihat daftar nominal & paket data."*
- **Auto-Detection Operator:**
  - `0895, 0896, 0897, 0898, 0899` -> **Tri / Three**
  - `0811, 0812, 0813, 0821, 0822, 0852, 0853, 0823` -> **Telkomsel**
  - `0814, 0815, 0816, 0855, 0856, 0857, 0858` -> **Indosat / IM3**
  - `0817, 0818, 0819, 0859, 0877, 0878` -> **XL**
  - `0831, 0832, 0833, 0838` -> **Axis**
  - `0881, 0882, 0883, 0884, 0885, 0886, 0887, 0888, 0889` -> **Smartfren**
  - `0851` -> **by.U / Telkomsel**
- **Strict Filtering Produk:**
  - Saat operator terdeteksi (contoh: **Tri**), daftar rekomendasi **hanya** menampilkan produk Pulsa / Data dari brand **Tri** (`brand: 'TRI'` / `brand: 'THREE'`).
  - Produk dari provider lain (Telkomsel, XL, dll) dilarang muncul.

### 2. Game Top-Up
- **Pilihan Game:**
  - Mobile Legends, Free Fire, Magic Chess (serta game terdaftar lainnya).
- **Strict Game Filtering:**
  - Menampilkan daftar denom/diamond eksklusif game yang dipilih (`gameId` / `brand` match).
- **Default Server / Zone ID:**
  - Mobile Legends: field Zone ID default terisi `ID` atau placeholder `(Zone ID)`.
  - Free Fire: sembunyikan input Server ID (karena FF hanya butuh User ID).
  - Magic Chess: field Server ID default `ID`.

### 3. Action Buttons
- Kartu nominal memiliki tombol/interaksi langsung untuk memilih nominal dan tombol "Lanjut Checkout / Bayar Sekarang".

---

## Acceptance Criteria
1. Input nomor HP 0896 hanya menampilkan pulsa/data Tri.
2. Sebelum nomor diinput, widget tidak menampilkan produk acak.
3. Pemilihan game hanya menampilkan denom diamond game terkait.
4. Unit test / component sanity lolos.
