## Deskripsi
Buat halaman 404 (Not Found) kustom bertema neon cyber WETRI dengan fitur auto-redirect 3 detik menuju homepage (`/`).

---

## Spesifikasi & Requirements

### 1. Desain & Struktur Halaman (`src/app/not-found.tsx`)
- Tampilan modern konsisten dengan tema WETRI (glassmorphism, gradient text neon cyan/pink).
- Headline: `404 - HALAMAN TIDAK DITEMUKAN`.
- Deskripsi: *"Halaman yang kamu tuju tidak tersedia atau telah dipindahkan."*

### 2. Auto-Redirect & Countdown Timer
- Countdown timer berjalan mulai dari `3` detik hingga `0`.
- Teks dinamis: *"Mengalihkan ke beranda dalam **{countdown}** detik..."*
- Begitu countdown mencapai 0, otomatis redirect via `router.push('/')`.
- Cleanup timer saat komponen di-unmount agar tidak terjadi memory leak.

### 3. Manual Fallback Action
- Tombol CTA: *"Kembali ke Beranda Sekarang"* yang langsung membawa user ke `/`.

---

## Acceptance Criteria
1. Mengakses rute non-eksisten (misal: `/halaman-ngasal`) memunculkan halaman 404 WETRI.
2. Countdown 3 detik berjalan dan mengalihkan browser ke `/`.
3. Tombol manual berfungsi instan tanpa menunggu countdown.
