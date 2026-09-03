import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getDicebearAvatarUrl } from '../../lib/cloudinary';

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

  const fallbackAvatar = getDicebearAvatarUrl(payload.id);

  if (existing) {
    // Keep a stable app avatar when Google photo is missing; never overwrite uploaded avatar.
    if (payload.name || !existing.avatarUrl) {
      const [updated] = await db
        .update(users)
        .set({
          name: payload.name ?? existing.name,
          avatarUrl: existing.avatarUrl ?? payload.avatarUrl ?? fallbackAvatar,
          updatedAt: new Date(),
        })
        .where(eq(users.id, payload.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // First login: insert new user row with stable default avatar
  const [created] = await db
    .insert(users)
    .values({
      id: payload.id,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl ?? fallbackAvatar,
      role: 'user',
      points: 0,
      streak: 0,
    })
    .returning();

  return created;
}
