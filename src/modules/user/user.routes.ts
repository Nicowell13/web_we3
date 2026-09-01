import { Elysia, t } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { uploadAvatarToCloudinary } from '../../lib/cloudinary';

export const userRoutes = new Elysia({ prefix: '/api/v1/user' })
  .use(authenticate)
  .get('/profile', async ({ user }) => {
    const record = await db.query.users.findFirst({
      where: eq(users.id, user.uid),
    });
    if (!record) {
      return { ok: false, message: 'User not found' };
    }
    return { ok: true, user: record };
  })
  .post(
    '/avatar',
    async ({ user, body, set }) => {
      try {
        const { image } = body as { image: File | string };
        if (!image) {
          set.status = 400;
          return { ok: false, message: 'Image payload is required' };
        }

        let avatarUrl: string;

        if (typeof image === 'string') {
          // Base64 or direct data URL
          avatarUrl = await uploadAvatarToCloudinary(image, `user_${user.uid}`);
        } else if (image instanceof File || (image as any).arrayBuffer) {
          const buffer = Buffer.from(await (image as File).arrayBuffer());
          avatarUrl = await uploadAvatarToCloudinary(buffer, `user_${user.uid}`);
        } else {
          set.status = 400;
          return { ok: false, message: 'Invalid file format' };
        }

        // Update user avatar in DB
        await db
          .update(users)
          .set({ avatarUrl, updatedAt: new Date() })
          .where(eq(users.id, user.uid));

        return { ok: true, avatarUrl };
      } catch (err: any) {
        set.status = 500;
        return { ok: false, message: err.message || 'Avatar upload failed' };
      }
    }
  );
