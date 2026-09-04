# OpenClaw Article Publisher

OpenClaw dapat membuat artikel SEO sebagai `draft` untuk review editor atau `scheduled` untuk publish otomatis.

## Payload

Kirim JSON ke `POST /api/v1/edt-school/automated-publish` menggunakan Firebase Bearer token milik user ber-role `editor` atau `admin`.

```json
{
  "title": "Panduan Top Up Game 2026",
  "slug": "panduan-top-up-game-2026",
  "category": "Tips Game",
  "focusKeyword": "top up game 2026",
  "metaDescription": "Panduan top up game 2026 yang cepat dan aman di WETRI.",
  "contentHtml": "<p>Artikel lengkap...</p><h2>Langkah top up</h2>",
  "coverImageUrl": "https://res.cloudinary.com/example/image/upload/wetri/articles/cover.webp",
  "faqItems": [{ "question": "Bagaimana cara top up?", "answer": "Pilih game lalu ikuti checkout." }],
  "status": "draft",
  "publishAt": null
}
```

## Mode

- `draft`: tersimpan untuk review di `/edt-school`.
- `scheduled`: wajib punya `publishAt`; operator/server perlu menjalankan job yang memindahkan artikel ke `published` saat waktunya tiba.

Endpoint memaksa `generatedBy: "openclaw"`. Backend tetap memvalidasi slug, metadata SEO, FAQ, status, dan akses role.

## Scheduler

Gunakan OpenClaw Automations untuk memanggil workflow pada jadwal wall-clock yang dibutuhkan. Workflow harus:

1. Generate title, slug, focus keyword, meta description <= 160 karakter, content HTML, dan FAQ valid.
2. Upload cover/inline image lewat `/api/v1/edt-school/upload-image`.
3. Kirim artikel sebagai `draft` untuk human review atau `scheduled` dengan `publishAt`.
4. Laporkan response HTTP dan ID artikel; jangan log token.

Contoh instruksi agent:

> Buat artikel SEO kategori Tips Game. Pastikan title, slug kebab-case, focusKeyword, metaDescription maksimal 160 karakter, contentHtml dengan H2/H3, dan minimal 3 FAQ. Kirim sebagai draft ke endpoint OpenClaw article publisher. Jangan mempublikasikan tanpa review editor.

## Security

- Jangan simpan Firebase token, Cloudinary secret, atau API key di source control, prompt, URL, atau log.
- Endpoint tetap memakai Firebase auth + role DB; payload `generatedBy` dari client tidak dipercaya.
- Review `draft` di `/edt-school` sebelum publish.
