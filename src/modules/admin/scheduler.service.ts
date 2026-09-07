import { db } from '../../db';
import { auditTrails } from '../../db/schema';
import { startMidnightSyncScheduler } from '../product/scheduler.service';
import { runPriceSync } from './price-sync.service';
import { runStatusCheck } from './status-check.service';

/**
 * Central scheduler for Digiflazz admin sync tasks.
 *   • Midnight price‑list sync (existing).
 *   • Price sync every 4 h.
 *   • Status check every 1 h.
 */
export function startAllSyncs() {
  // Existing midnight scheduler (already started from server start elsewhere)
  startMidnightSyncScheduler();

  // Price sync every 4 hours
  const priceInterval = setInterval(() => {
    runPriceSync().catch(err => console.error('[PRICE_SYNC] failed', err));
  }, 4 * 60 * 60 * 1000);

  // Status check every hour
  const statusInterval = setInterval(() => {
    runStatusCheck().catch(err => console.error('[STATUS_CHECK] failed', err));
  }, 60 * 60 * 1000);

  // Store handles for graceful shutdown if needed (not used now)
  return { priceInterval, statusInterval };
}
