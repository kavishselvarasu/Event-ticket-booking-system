import { v4 as uuidv4 } from 'uuid';
import { query, transaction, getDbMode } from '../config/db.js';
import { cacheService } from './cacheService.js';

const HOLD_DURATION_MINUTES = 10;
const HOLD_DURATION_SECONDS = HOLD_DURATION_MINUTES * 60;

export const reservationEngine = {
  /**
   * Places tickets into a 10-minute temporary reservation hold with atomic concurrency lock
   */
  async createHold({ eventId, ticketTierId, quantity, userId = null, sessionId }) {
    if (!eventId || !ticketTierId || !quantity || quantity <= 0) {
      const err = new Error('Invalid reservation parameters. Event, Tier, and Quantity > 0 are required.');
      err.statusCode = 400;
      throw err;
    }

    if (!sessionId) {
      const err = new Error('Session identifier (X-Session-ID) is required to track reservation hold.');
      err.statusCode = 400;
      throw err;
    }

    const holdId = `res-${uuidv4().substring(0, 8)}`;
    const expiresAt = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();

    // Execute within atomic database transaction
    return await transaction(async ({ query: txQuery }) => {
      // 1. Check Event Status and Sales Cutoff
      const eventRes = await txQuery(
        'SELECT id, status, sales_cutoff_date, title FROM events WHERE id = $1',
        [eventId]
      );

      if (eventRes.rows.length === 0) {
        const err = new Error('Event not found.');
        err.statusCode = 404;
        throw err;
      }

      const event = eventRes.rows[0];
      if (event.status !== 'PUBLISHED') {
        const err = new Error(`Event is not open for reservations (Status: ${event.status}).`);
        err.statusCode = 400;
        throw err;
      }

      const cutoff = new Date(event.sales_cutoff_date);
      if (cutoff <= new Date()) {
        const err = new Error('Ticket sales for this event have closed.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Select Ticket Tier with Row-Level Lock (SELECT FOR UPDATE in PostgreSQL)
      const lockQuery = `
        SELECT id, name, price, total_quantity, reserved_quantity, sold_quantity, max_per_order
        FROM ticket_tiers
        WHERE id = $1 AND event_id = $2
        FOR UPDATE
      `;

      const tierRes = await txQuery(lockQuery, [ticketTierId, eventId]);

      if (tierRes.rows.length === 0) {
        const err = new Error('Ticket tier not found for this event.');
        err.statusCode = 404;
        throw err;
      }

      const tier = tierRes.rows[0];
      const maxOrder = parseInt(tier.max_per_order, 10) || 4;

      if (quantity > maxOrder) {
        const err = new Error(`Quantity exceeds maximum allowed per booking (${maxOrder} tickets).`);
        err.statusCode = 400;
        throw err;
      }

      const totalQty = parseInt(tier.total_quantity, 10);
      const reservedQty = parseInt(tier.reserved_quantity, 10);
      const soldQty = parseInt(tier.sold_quantity, 10);
      const available = totalQty - (reservedQty + soldQty);

      // Race condition check: ensure requested quantity does not exceed available seats
      if (available < quantity) {
        const err = new Error(
          `Insufficient inventory. Requested ${quantity} seat(s), but only ${Math.max(0, available)} seat(s) remain available.`
        );
        err.statusCode = 409; // Conflict
        err.code = 'INSUFFICIENT_INVENTORY';
        err.availableSeats = Math.max(0, available);
        throw err;
      }

      const unitPrice = parseFloat(tier.price);
      const totalAmount = parseFloat((unitPrice * quantity).toFixed(2));

      // 3. Atomically Reserve Seats in Ticket Tiers
      await txQuery(
        `UPDATE ticket_tiers
         SET reserved_quantity = reserved_quantity + $1
         WHERE id = $2`,
        [quantity, ticketTierId]
      );

      // 4. Create Temporary Reservation Record (10-minute hold)
      await txQuery(
        `INSERT INTO reservations (id, event_id, ticket_tier_id, user_id, session_id, quantity, unit_price, total_amount, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [holdId, eventId, ticketTierId, userId, sessionId, quantity, unitPrice, totalAmount, 'HELD', expiresAt]
      );

      // Invalidate event cache so other users see updated remaining seats
      await cacheService.invalidateEvent(eventId);

      console.log(
        `\x1b[35m[RESERVATION HOLD CREATED]\x1b[0m ID: ${holdId} | Tier: ${tier.name} | Qty: ${quantity} | Expires in: 10 mins (${expiresAt}) | DB Mode: ${getDbMode()}`
      );

      return {
        holdId,
        eventId,
        ticketTierId,
        tierName: tier.name,
        quantity,
        unitPrice,
        totalAmount,
        status: 'HELD',
        expiresAt,
        remainingSeconds: HOLD_DURATION_SECONDS,
        dbConcurrencyMode: getDbMode() === 'postgresql' ? 'PostgreSQL SELECT FOR UPDATE (Pessimistic Row Lock)' : 'SQLite WAL (Immediate Atomic Transaction Lock)'
      };
    });
  },

  /**
   * Retrieves reservation details and computes live countdown
   */
  async getHold(holdId) {
    const res = await query(
      `SELECT r.*, e.title as event_title, e.banner_url, e.venue, e.event_date,
              tt.name as tier_name, tt.perks
       FROM reservations r
       JOIN events e ON r.event_id = e.id
       JOIN ticket_tiers tt ON r.ticket_tier_id = tt.id
       WHERE r.id = $1`,
      [holdId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const hold = res.rows[0];
    const now = Date.now();
    const expireTime = new Date(hold.expires_at).getTime();
    const remainingSeconds = Math.max(0, Math.floor((expireTime - now) / 1000));

    // If hold has expired in status HELD, trigger immediate release
    if (hold.status === 'HELD' && remainingSeconds <= 0) {
      await this.releaseExpiredHold(hold.id);
      hold.status = 'EXPIRED';
      hold.remainingSeconds = 0;
    } else {
      hold.remainingSeconds = remainingSeconds;
    }

    return hold;
  },

  /**
   * Releases an expired hold and returns inventory to ticket_tiers pool
   */
  async releaseExpiredHold(holdId) {
    return await transaction(async ({ query: txQuery }) => {
      const res = await txQuery(
        'SELECT id, event_id, ticket_tier_id, quantity, status FROM reservations WHERE id = $1 FOR UPDATE',
        [holdId]
      );

      if (res.rows.length === 0) return null;

      const hold = res.rows[0];
      if (hold.status !== 'HELD') return hold;

      // Reclaim reserved capacity
      await txQuery(
        `UPDATE ticket_tiers
         SET reserved_quantity = CASE WHEN reserved_quantity >= $1 THEN reserved_quantity - $1 ELSE 0 END
         WHERE id = $2`,
        [hold.quantity, hold.ticket_tier_id]
      );

      await txQuery(
        "UPDATE reservations SET status = 'EXPIRED' WHERE id = $1",
        [holdId]
      );

      await cacheService.invalidateEvent(hold.event_id);
      console.log(`\x1b[33m[HOLD EXPIRED & RELEASED]\x1b[0m ID: ${holdId} | Reclaimed ${hold.quantity} seat(s)`);
      return { ...hold, status: 'EXPIRED' };
    });
  },

  /**
   * Manually cancels a reservation hold (e.g., user leaves checkout)
   */
  async cancelHold(holdId, sessionId) {
    return await transaction(async ({ query: txQuery }) => {
      const res = await txQuery(
        'SELECT id, event_id, ticket_tier_id, quantity, status FROM reservations WHERE id = $1 AND session_id = $2 FOR UPDATE',
        [holdId, sessionId]
      );

      if (res.rows.length === 0) {
        const err = new Error('Reservation hold not found or unauthorized session.');
        err.statusCode = 404;
        throw err;
      }

      const hold = res.rows[0];
      if (hold.status !== 'HELD') {
        return { message: `Hold is already ${hold.status}`, status: hold.status };
      }

      await txQuery(
        `UPDATE ticket_tiers
         SET reserved_quantity = CASE WHEN reserved_quantity >= $1 THEN reserved_quantity - $1 ELSE 0 END
         WHERE id = $2`,
        [hold.quantity, hold.ticket_tier_id]
      );

      await txQuery(
        "UPDATE reservations SET status = 'CANCELLED' WHERE id = $1",
        [holdId]
      );

      await cacheService.invalidateEvent(hold.event_id);
      return { message: 'Reservation hold cancelled and seats returned to inventory', status: 'CANCELLED' };
    });
  }
};
