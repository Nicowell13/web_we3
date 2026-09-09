## Goal
Allow admins to manage homepage promo banner from `/old-school`, with images stored in Cloudinary.

## Requirements
- Add DB-backed banner/promo model or system config keys for:
  - title
  - subtitle/description
  - CTA text
  - CTA URL
  - banner image URL
  - active flag
  - display order if multiple banners are supported
- Add admin endpoints under `/api/v1/old-school/banners`:
  - list banners
  - create/update banner content
  - upload/replace banner image via Cloudinary
  - activate/deactivate banner
- Public homepage must load active banner data from backend/config instead of hardcoded content.
- Replacing a banner image should upload new image first, persist DB update, then delete old Cloudinary image if different.
- Keep image limits sane, e.g. JPG/PNG/WEBP, max 3MB.

## Security
- Admin-only mutation endpoints.
- Public endpoint exposes only active banner content.
- Do not expose Cloudinary credentials.

## Tests
- Public homepage config returns active banner.
- Non-admin cannot mutate banners.
- Admin can update banner and image URL.

## Done when
- Admin can update homepage promo banner without deploy.
- `bun test` and `bun run build` pass.

## Parent epic
https://github.com/Nicowell13/web_we3/issues/34

