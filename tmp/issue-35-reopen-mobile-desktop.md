Reopening for follow-up scope: desktop and mobile banner variants.

New requirements:
- Store separate homepage banner images for desktop and mobile.
- Admin dashboard must upload/replace both variants independently.
- Public banner API should return both URLs:
  - `desktopImageUrl`
  - `mobileImageUrl`
- Homepage should render desktop image on larger screens and mobile image on small screens.
- Recommended image targets:
  - desktop: wide promo banner, e.g. 1200x480 WebP
  - mobile: portrait/compact banner, e.g. 720x720 or 720x960 WebP
- Replacing one variant must not delete the other variant.
- Cleanup rule stays safe: upload new image, persist DB/config, then delete old Cloudinary image only for the replaced variant.
- Fallback: if mobile image is empty, use desktop image; if desktop image is empty, show text-only hero.

Done when:
- Admin can manage desktop and mobile banner images separately from `/old-school`.
- Homepage displays correct responsive banner image.
- `bun test` and `bun run build` pass.
