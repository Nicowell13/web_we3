## Scope
Perbaiki admin banner homepage, voucher management, voucher khusus user untuk komplain, dan navbar logo text.

## Banner
- Admin dapat mengubah title, subtitle, CTA text, CTA URL, status aktif, desktop image, dan mobile image.
- Perubahan tersimpan ke `system_configs` dan langsung dibaca homepage via `/api/v1/home-banner` tanpa deploy ulang.
- Preview admin menampilkan state terbaru setelah save/upload.

## Voucher
- Voucher yang dibuat admin langsung tampil di admin UI.
- Voucher aktif dan eligible tampil di dashboard user bagian voucher.
- User dashboard hanya menampilkan voucher sesuai aturan jenis voucher, periode aktif, kuota, poin, dan target user.
- Voucher yang sudah diklaim user tidak tampil lagi sebagai voucher tersedia.

## Voucher khusus user
- Admin create voucher memiliki pilihan compensation / khusus user.
- Admin dapat memilih user target.
- Voucher khusus user disimpan `voucherType=compensation`, `isPublic=false`, dan `targetUserId=<user>`.
- Hanya user target yang bisa melihat/klaim voucher tersebut.

## Navbar
- Text/logo navbar yang masih `wetri.com` diganti menjadi `wetri.shop`.

## Checks
- `bun test`
- `bun run build`
- deploy production via GitHub pull, build, restart services.
