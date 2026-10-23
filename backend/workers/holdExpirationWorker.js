import { query, transaction } from '../config/db.js';
import { cacheService } from '../services/cacheService.js';

let workerInterval = null;
let isProcessing = false;

export async function processExpiredHolds() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const nowIso = new Date().toISOString();

    // Query all reservations that have expired but are still marked as HELD
    const expiredRes = await query(
      `SELECT id, event_id, ticket_tier_id, quantity, status, expires_at
       FROM reservations
       WHERE status = 'HELD' AND expires_at <= $1`,
      [nowIso]
    );

    if (expiredRes.rows.length === 0) {
      isProcessing = false;
      return { expiredCount: 0 };
    }

    console.log(`\x1b[33m[BACKGROUND WORKER]\x1b[0m Found ${expiredRes.rows.length} expired ticket hold(s) to release.`);

    let releasedCount = 0;

    for (const hold of expiredRes.rows) {
      try {
        await transaction(async ({ query: txQuery }) => {
          // Re-verify status under row-level lock
          const check = await txQuery(
            'SELECT status, quantity, ticket_tier_id, event_id FROM reservations WHERE id = $1 FOR UPDATE',
            [hold.id]
          );

          if (check.rows.length === 0 || check.rows[0].status !== 'HELD') {
            return;
          }

          // Atomically restore reserved capacity to ticket_tiers
          await txQuery(
            `UPDATE ticket_tiers
             SET reserved_quantity = CASE WHEN reserved_quantity >= $1 THEN reserved_quantity - $1 ELSE 0 END
             WHERE id = $2`,
            [hold.quantity, hold.ticket_tier_id]
          );

          // Mark reservation EXPIRED
          await txQuery(
            "UPDATE reservations SET status = 'EXPIRED' WHERE id = $1",
            [hold.id]
          );

          await cacheService.invalidateEvent(hold.event_id);
          releasedCount++;
          console.log(`\x1b[32m✔ [BACKGROUND WORKER]\x1b[0m Released hold ${hold.id} (${hold.quantity} seats returned to pool).`);
        });
      } catch (err) {
        console.error(`[BACKGROUND WORKER] Failed to release hold ${hold.id}:`, err.message);
      }
    }

    isProcessing = false;
    return { expiredCount: releasedCount };
  } catch (error) {
    console.error('[BACKGROUND WORKER] Error processing expired holds:', error.message);
    isProcessing = false;
    return { error: error.message };
  }
}

export function startHoldExpirationWorker(intervalMs = 10000) {
  if (workerInterval) return;

  console.log(`\x1b[36m[BACKGROUND WORKER] Hold expiration worker scheduled (Interval: ${intervalMs / 1000}s)\x1b[0m`);
  
  // Run once immediately on startup
  processExpiredHolds();

  workerInterval = setInterval(() => {
    processExpiredHolds();
  }, intervalMs);
}

export function stopHoldExpirationWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[BACKGROUND WORKER] Hold expiration worker stopped.');
  }
}
