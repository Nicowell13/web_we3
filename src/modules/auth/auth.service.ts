import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

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
    // Update profile fields if provided
    if (payload.name || payload.avatarUrl) {
      const [updated] = await db
        .update(users)
        .set({
          name: payload.name ?? existing.name,
          avatarUrl: payload.avatarUrl ?? existing.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, payload.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // First login: insert new user row
  const [created] = await db
    .insert(users)
    .values({
      id: payload.id,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
      role: 'user',
      points: 0,
      streak: 0,
    })
    .returning();

  return created;
}
