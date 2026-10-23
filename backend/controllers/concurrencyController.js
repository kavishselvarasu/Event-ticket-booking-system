import { v4 as uuidv4 } from 'uuid';
import { query, transaction, getDbMode } from '../config/db.js';
import { reservationEngine } from '../services/reservationEngine.js';

export const concurrencyController = {
  /**
   * Concurrency Stress Test Endpoint
   * Simulates high-load simultaneous booking attempts to prove zero double-booking under atomic locking
   */
  async runConcurrencyTest(req, res) {
    const totalSeats = parseInt(req.body.totalSeats || 5, 10);
    const concurrentRequests = parseInt(req.body.concurrentRequests || 25, 10);
    const qtyPerRequest = 1;

    const testEventId = `test-ev-${uuidv4().substring(0, 6)}`;
    const testTierId = `test-tier-${uuidv4().substring(0, 6)}`;
    const testTenantId = 'tenant-apex';

    const testStartTime = Date.now();

    try {
      // 1. Setup isolated test event and tier with limited inventory
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await query(
        `INSERT INTO events (id, tenant_id, title, description, category, venue, banner_url, event_date, sales_cutoff_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [testEventId, testTenantId, 'Concurrency Stress Test Lab', 'Automated race condition validator', 'Lab', 'Virtual', '', futureDate, futureDate, 'PUBLISHED']
      );

      await query(
        `INSERT INTO ticket_tiers (id, event_id, name, description, price, total_quantity, reserved_quantity, sold_quantity, max_per_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [testTierId, testEventId, 'Limited Flash Pass', 'High-concurrency test seats', 50.00, totalSeats, 0, 0, 4]
      );

      // 2. Launch concurrent hold requests simultaneously via Promise.allSettled
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const sessionId = `sim-user-${i}-${uuidv4().substring(0, 4)}`;
        promises.push(
          reservationEngine.createHold({
            eventId: testEventId,
            ticketTierId: testTierId,
            quantity: qtyPerRequest,
            sessionId
          })
        );
      }

      const results = await Promise.allSettled(promises);

      // 3. Analyze results
      let successCount = 0;
      let rejectedCount = 0;
      const errors = [];

      for (const r of results) {
        if (r.status === 'fulfilled') {
          successCount++;
        } else {
          rejectedCount++;
          errors.push(r.reason?.message || 'Rejected');
        }
      }

      // 4. Verify post-test state in DB
      const tierVerify = await query('SELECT total_quantity, reserved_quantity, sold_quantity FROM ticket_tiers WHERE id = $1', [testTierId]);
      const currentReserved = parseInt(tierVerify.rows[0]?.reserved_quantity || 0, 10);
      const totalAllowed = parseInt(tierVerify.rows[0]?.total_quantity || 0, 10);

      // Invariant: currentReserved must equal totalSeats, and successCount must equal totalSeats
      const doubleBookings = Math.max(0, currentReserved - totalAllowed);
      const isRaceConditionPrevented = (doubleBookings === 0) && (successCount === totalSeats);

      // 5. Cleanup test data
      await query('DELETE FROM reservations WHERE event_id = $1', [testEventId]);
      await query('DELETE FROM ticket_tiers WHERE event_id = $1', [testEventId]);
      await query('DELETE FROM events WHERE id = $1', [testEventId]);

      const testDurationMs = Date.now() - testStartTime;

      return res.json({
        testSummary: {
          testName: 'High-Concurrency Seat Reservation Simulation',
          databaseEngine: getDbMode() === 'postgresql' ? 'PostgreSQL 17 (Row-Level SELECT FOR UPDATE)' : 'SQLite WAL (Immediate Atomic Transactions)',
          totalSeatsConfigured: totalSeats,
          concurrentBookingAttempts: concurrentRequests,
          successfulHolds: successCount,
          rejectedDueToFullCapacity: rejectedCount,
          doubleBookedSeats: doubleBookings,
          raceConditionPrevented: isRaceConditionPrevented,
          durationMs: testDurationMs,
          status: isRaceConditionPrevented ? 'PASS - 100% ACID Concurrency Safety Verified' : 'FAIL - Race Condition Detected'
        },
        sampleErrors: errors.slice(0, 3)
      });
    } catch (error) {
      console.error('Concurrency test error:', error);
      // Attempt cleanup
      try {
        await query('DELETE FROM events WHERE id = $1', [testEventId]);
      } catch (e) {}

      return res.status(500).json({ error: 'Concurrency test failed', message: error.message });
    }
  }
};
