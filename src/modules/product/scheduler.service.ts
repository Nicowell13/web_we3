import { syncDigiflazzProducts } from './sync.service';
import { db } from '../../db';
import { systemConfigs, auditTrails } from '../../db/schema';
import { eq } from 'drizzle-orm';

let syncIntervalHandle: NodeJS.Timeout | null = null;

export function getMillisecondsUntilMidnightWIB(): number {
  const now = new Date();
  // WIB is UTC+7
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const nowWIB = new Date(utc + 7 * 3600000);

  const nextMidnightWIB = new Date(nowWIB);
  nextMidnightWIB.setHours(24, 0, 0, 0); // 00:00:00 next day

  const diffMs = nextMidnightWIB.getTime() - nowWIB.getTime();
  return diffMs > 0 ? diffMs : 86400000;
}

export async function runScheduledMidnightSync(): Promise<void> {
  console.log('[AUTO-SYNC] Running midnight Digiflazz price-list sync...');
  try {
    const result = await syncDigiflazzProducts();
    const now = new Date();
    await db
      .insert(systemConfigs)
      .values({
        key: 'DIGIFLAZZ_LAST_AUTO_SYNC',
        value: now.toISOString(),
        description: JSON.stringify(result),
        isActive: true,
      })
      .onConflictDoUpdate({
        target: systemConfigs.key,
        set: {
          value: now.toISOString(),
          description: JSON.stringify(result),
          updatedAt: now,
        },
      });

    await db.insert(auditTrails).values({
      eventType: 'DIGIFLAZZ_MIDNIGHT_SYNC_SUCCESS',
      rawResponse: result,
    });
    console.log('[AUTO-SYNC] Midnight sync completed successfully:', result);
  } catch (err: any) {
    console.error('[AUTO-SYNC] Midnight sync failed:', err?.message);
    await db.insert(auditTrails).values({
      eventType: 'DIGIFLAZZ_MIDNIGHT_SYNC_FAILED',
      rawResponse: { error: err?.message || 'Unknown auto-sync error' },
    });
  }
}

export function startMidnightSyncScheduler(): void {
  if (syncIntervalHandle) return;

  const initialDelay = getMillisecondsUntilMidnightWIB();
  console.log(`[AUTO-SYNC] Scheduled next midnight sync in ${(initialDelay / 3600000).toFixed(2)} hours`);

  setTimeout(() => {
    runScheduledMidnightSync();
    // Then run every 24 hours
    syncIntervalHandle = setInterval(runScheduledMidnightSync, 24 * 60 * 60 * 1000);
  }, initialDelay);
}
