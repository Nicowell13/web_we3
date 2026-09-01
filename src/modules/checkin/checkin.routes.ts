import { Elysia } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { computeCheckIn } from './checkin.service';
import { auditTrails } from '../../db/schema';

/**
 * POST /api/v1/checkin
 * Authenticated; checks in the user for today.
 * Returns streak, points awarded, bonus, and next eligible time.
 */
export const checkinRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authenticate)
  .post('/checkin', async ({ user }) => {
    const uid = user.uid;

    // Load user row
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, uid) });
    if (!dbUser) {
      return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    }

    const now    = new Date();
    const result = computeCheckIn(now, dbUser.lastCheckinAt ?? null, dbUser.streak ?? 0);

    if (!result.success) {
      return { ok: false, reason: result.reason, streak: result.streak };
    }

    const totalPoints = result.pointsAwarded + result.bonusAwarded;

    // Persist: update streak, lastCheckinAt, points atomically
    await db
      .update(users)
      .set({
        streak:       result.streak,
        lastCheckinAt: now,
        points:       sql`${users.points} + ${totalPoints}`,
        updatedAt:    now,
      })
      .where(eq(users.id, uid));

    // Audit trail
    await db.insert(auditTrails).values({
      eventType:   'DAILY_CHECKIN',
      referenceId: uid,
      rawRequest:  null,
      rawResponse: { streak: result.streak, points: totalPoints, bonus: result.bonusAwarded } as any,
    });

    return {
      ok:            true,
      streak:        result.streak,
      pointsAwarded: result.pointsAwarded,
      bonusAwarded:  result.bonusAwarded,
      totalPoints,
    };
  })

  /**
   * GET /api/v1/checkin/status
   * Returns today's check-in status for the current user.
   */
  .get('/checkin/status', async ({ user }) => {
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.uid) });
    if (!dbUser) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });

    const now    = new Date();
    const result = computeCheckIn(now, dbUser.lastCheckinAt ?? null, dbUser.streak ?? 0);

    return {
      ok:              true,
      alreadyCheckedIn: !result.success,
      streak:          dbUser.streak,
      points:          dbUser.points,
      lastCheckinAt:   dbUser.lastCheckinAt,
    };
  });
