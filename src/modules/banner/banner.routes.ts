import { Elysia } from 'elysia';
import { db } from '../../db';
import { auditTrails, systemConfigs } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../middleware/auth';
import { deleteCloudinaryImage, uploadBannerToCloudinary } from '../../lib/cloudinary';

const keys = ['HOME_BANNER_TITLE', 'HOME_BANNER_SUBTITLE', 'HOME_BANNER_CTA_TEXT', 'HOME_BANNER_CTA_URL', 'HOME_BANNER_IMAGE_URL', 'HOME_BANNER_ACTIVE'] as const;

async function getBannerConfig() {
  const rows = await db.query.systemConfigs.findMany({ where: (table, { inArray }) => inArray(table.key, [...keys]) });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    title: map.HOME_BANNER_TITLE ?? 'LEVEL UP INSTAN.',
    subtitle: map.HOME_BANNER_SUBTITLE ?? 'Layanan top-up game & PPOB tercepat berkecepatan kilat.',
    ctaText: map.HOME_BANNER_CTA_TEXT ?? 'JELAJAHI KATALOG',
    ctaUrl: map.HOME_BANNER_CTA_URL ?? '/catalog',
    imageUrl: map.HOME_BANNER_IMAGE_URL ?? '',
    isActive: map.HOME_BANNER_ACTIVE !== 'false',
  };
}

async function setConfig(key: string, value: string) {
  await db.insert(systemConfigs).values({ key, value }).onConflictDoUpdate({ target: systemConfigs.key, set: { value, updatedAt: new Date() } });
}

export const bannerPublicRoutes = new Elysia({ prefix: '/api/v1' })
  .get('/home-banner', async () => ({ ok: true, banner: await getBannerConfig() }));

export const bannerAdminRoutes = new Elysia({ prefix: '/api/v1/old-school' })
  .use(requireRole('admin'))
  .get('/banners', async () => ({ ok: true, banner: await getBannerConfig() }))
  .post('/banners', async ({ body }) => {
    const input = body as { title?: string; subtitle?: string; ctaText?: string; ctaUrl?: string; isActive?: boolean };
    const pairs = [['HOME_BANNER_TITLE', input.title], ['HOME_BANNER_SUBTITLE', input.subtitle], ['HOME_BANNER_CTA_TEXT', input.ctaText], ['HOME_BANNER_CTA_URL', input.ctaUrl], ['HOME_BANNER_ACTIVE', input.isActive === undefined ? undefined : String(input.isActive)]] as const;
    for (const [key, value] of pairs) if (value !== undefined) await setConfig(key, value);
    await db.insert(auditTrails).values({ eventType: 'BANNER_CHANGE', referenceId: 'home', rawRequest: input });
    return { ok: true, banner: await getBannerConfig() };
  })
  .post('/banners/image', async ({ body, set }) => {
    const { image } = body as { image?: string };
    if (!image) { set.status = 400; return { ok: false, message: 'Image payload is required' }; }
    const current = await getBannerConfig();
    const imageUrl = await uploadBannerToCloudinary(image, `home_${Date.now()}`);
    await setConfig('HOME_BANNER_IMAGE_URL', imageUrl);
    if (current.imageUrl && current.imageUrl !== imageUrl) deleteCloudinaryImage(current.imageUrl).catch(console.error);
    await db.insert(auditTrails).values({ eventType: 'BANNER_IMAGE_CHANGE', referenceId: 'home' });
    return { ok: true, imageUrl };
  });
