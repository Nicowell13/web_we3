## Problem
Admin dashboard hero banner form saves successfully, but homepage hero banner does not change immediately after save.

## Expected
After admin updates title/subtitle/CTA/banner image in `/old-school`, homepage `/` should render latest banner from `/api/v1/home-banner`.

## Suspected cause
Homepage server component fetch uses `cache: 'no-store'`, but route may still be treated as static/cached by Next.js in production. Need force dynamic rendering for homepage.

## Scope
- Keep existing banner DB/config flow.
- Minimal fix first: force dynamic homepage render.
- Test locally before deploy.
