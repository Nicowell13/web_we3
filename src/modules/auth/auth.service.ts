import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { createDefaultAvatar } from '../../lib/cloudinary';

export type UpsertUserPayload = {
  id: string;       // Firebase UID
  email: string;
  name?: string;
  avatarUrl?: string;
};

/**
 * Upsert a user row on first login from Firebase.
 * Returns the user row. Updates name/avatar on every call if provided.
 */
export async function syncUserFromFirebase(payload: UpsertUserPayload) {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, payload.id),
  });

  if (existing) {
    // Preserve user-uploaded avatar; migrate empty/legacy DiceBear URL to persistent Cloudinary image.
    const needsDefaultAvatar = !existing.avatarUrl || !existing.avatarUrl.includes('res.cloudinary.com');
    if (payload.name || needsDefaultAvatar) {
      const avatarUrl = needsDefaultAvatar
        ? await createDefaultAvatar(payload.id)
        : existing.avatarUrl;
      const [updated] = await db
        .update(users)
        .set({
          name: payload.name ?? existing.name,
          avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, payload.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // First login: generate one random avatar and persist its Cloudinary URL.
  const avatarUrl = await createDefaultAvatar(payload.id);
  const [created] = await db
    .insert(users)
    .values({
      id: payload.id,
      email: payload.email,
      name: payload.name,
      avatarUrl,
      role: 'user',
      points: 0,
      streak: 0,
    })
    .returning();

  return created;
}
