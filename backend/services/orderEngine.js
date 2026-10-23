import { v4 as uuidv4 } from 'uuid';
import { query, transaction, getDbMode } from '../config/db.js';
import { paymentService } from './paymentService.js';
import { cacheService } from './cacheService.js';

export const orderEngine = {
  /**
   * Finalizes checkout for a temporary 10-minute reservation hold
   */
  async checkoutHold({
    holdId,
    sessionId,
    userId = null,
    attendeeName,
    attendeeEmail,
    paymentMethod = 'CREDIT_CARD',
    cardLast4 = '4242',
    simulateOutcome = 'FORCE_SUCCESS',
    idempotencyKey = null
  }) {
    if (!holdId || !attendeeName || !attendeeEmail) {
      const err = new Error('Hold ID, Attendee Name, and Attendee Email are required for checkout.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch hold and verify expiration
    const holdRes = await query(
      `SELECT r.*, e.title as event_title, e.tenant_id, e.venue, e.event_date,
              tt.name as tier_name
       FROM reservations r
       JOIN events e ON r.event_id = e.id
       JOIN ticket_tiers tt ON r.ticket_tier_id = tt.id
       WHERE r.id = $1`,
      [holdId]
    );

    if (holdRes.rows.length === 0) {
      const err = new Error('Reservation hold not found.');
      err.statusCode = 404;
      throw err;
    }

    const hold = holdRes.rows[0];

    // Session validation
    if (sessionId && hold.session_id !== sessionId) {
      const err = new Error('Unauthorized session for this reservation hold.');
      err.statusCode = 403;
      throw err;
    }

    // Hold status check
    if (hold.status === 'COMPLETED') {
      const err = new Error('This reservation hold has already been completed.');
      err.statusCode = 400;
      throw err;
    }

    if (hold.status !== 'HELD') {
      const err = new Error(`Reservation hold is no longer active (Status: ${hold.status}).`);
      err.statusCode = 400;
      throw err;
    }

    // Hold expiry check (10-minute window)
    const now = new Date();
    const expireTime = new Date(hold.expires_at);
    if (now >= expireTime) {
      // Auto-expire
      await transaction(async ({ query: txQuery }) => {
        await txQuery(
          `UPDATE ticket_tiers
           SET reserved_quantity = CASE WHEN reserved_quantity >= $1 THEN reserved_quantity - $1 ELSE 0 END
           WHERE id = $2`,
          [hold.quantity, hold.ticket_tier_id]
        );
        await txQuery("UPDATE reservations SET status = 'EXPIRED' WHERE id = $1", [holdId]);
        await cacheService.invalidateEvent(hold.event_id);
      });

      const err = new Error('Reservation hold expired after 10 minutes. Please select tickets again.');
      err.statusCode = 410; // Gone / Expired
      err.code = 'HOLD_EXPIRED';
      throw err;
    }

    // 2. Call Mock Payment Gateway (asynchronous authorization)
    const paymentResult = await paymentService.simulatePayment({
      amount: hold.total_amount,
      currency: 'INR',
      paymentMethod,
      cardLast4,
      simulateOutcome,
      delayMs: 800
    });

    const orderId = `ord-${uuidv4().substring(0, 8)}`;
    const orderNumber = `ORD-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    if (paymentResult.status !== 'SUCCEEDED') {
      // Payment Failed: Record failed transaction attempt, keep hold for retry if time permits
      const txId = `txn-${uuidv4().substring(0, 8)}`;
      // Create a pending/failed order shell to record transaction
      await query(
        `INSERT INTO transactions (id, order_id, transaction_ref, payment_method, amount, currency, status, failure_reason, idempotency_key, gateway_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          txId,
          null, // Unattached order
          paymentResult.transactionRef,
          paymentMethod,
          hold.total_amount,
          'INR',
          'FAILED',
          paymentResult.failureReason,
          idempotencyKey || `idem-${uuidv4().substring(0, 8)}`,
          JSON.stringify(paymentResult.gatewayResponse)
        ]
      );

      const remainingSeconds = Math.max(0, Math.floor((expireTime.getTime() - Date.now()) / 1000));
      return {
        success: false,
        paymentStatus: 'FAILED',
        error: paymentResult.failureReason,
        message: 'Payment simulation declined the transaction. Hold is still active; you may retry before expiration.',
        holdRemainingSeconds: remainingSeconds
      };
    }

    // 3. Payment Succeeded -> Complete transaction in DB
    return await transaction(async ({ query: txQuery }) => {
      // Re-verify and lock hold under transaction
      const lockRes = await txQuery(
        'SELECT status, expires_at FROM reservations WHERE id = $1 FOR UPDATE',
        [holdId]
      );

      if (lockRes.rows.length === 0 || lockRes.rows[0].status !== 'HELD') {
        const err = new Error('Hold state changed concurrently. Unable to complete order.');
        err.statusCode = 409;
        throw err;
      }

      // 4. Update Ticket Tiers: Move from reserved_quantity to sold_quantity
      await txQuery(
        `UPDATE ticket_tiers
         SET reserved_quantity = CASE WHEN reserved_quantity >= $1 THEN reserved_quantity - $1 ELSE 0 END,
             sold_quantity = sold_quantity + $1
         WHERE id = $2`,
        [hold.quantity, hold.ticket_tier_id]
      );

      // 5. Mark Hold Completed
      await txQuery(
        "UPDATE reservations SET status = 'COMPLETED' WHERE id = $1",
        [holdId]
      );

      // 6. Create Order
      await txQuery(
        `INSERT INTO orders (id, tenant_id, event_id, user_id, reservation_id, order_number, total_amount, status, attendee_name, attendee_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          orderId,
          hold.tenant_id,
          hold.event_id,
          userId,
          holdId,
          orderNumber,
          hold.total_amount,
          'CONFIRMED',
          attendeeName,
          attendeeEmail
        ]
      );

      // 7. Generate Individual Tickets with QR Payloads
      const issuedTickets = [];
      for (let i = 0; i < hold.quantity; i++) {
        const ticketId = `tkt-${uuidv4().substring(0, 8)}`;
        const ticketCode = `TKT-${hold.tier_name.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const qrPayload = JSON.stringify({
          ticketCode,
          orderNumber,
          eventId: hold.event_id,
          attendee: attendeeName,
          tier: hold.tier_name,
          issuedAt: new Date().toISOString()
        });

        await txQuery(
          `INSERT INTO order_items (id, order_id, ticket_tier_id, ticket_code, tier_name, price, status, qr_payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [ticketId, orderId, hold.ticket_tier_id, ticketCode, hold.tier_name, hold.unit_price, 'ACTIVE', qrPayload]
        );

        issuedTickets.push({
          id: ticketId,
          ticketCode,
          tierName: hold.tier_name,
          price: hold.unit_price,
          status: 'ACTIVE',
          qrPayload
        });
      }

      // 8. Record Succeeded Transaction
      const txnId = `txn-${uuidv4().substring(0, 8)}`;
      await txQuery(
        `INSERT INTO transactions (id, order_id, transaction_ref, payment_method, amount, currency, status, idempotency_key, gateway_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          txnId,
          orderId,
          paymentResult.transactionRef,
          paymentMethod,
          hold.total_amount,
          'INR',
          'SUCCEEDED',
          idempotencyKey || `idem-${uuidv4().substring(0, 8)}`,
          JSON.stringify(paymentResult.gatewayResponse)
        ]
      );

      // 9. Invalidate event cache
      await cacheService.invalidateEvent(hold.event_id);

      console.log(
        `\x1b[32m✔ [CHECKOUT COMPLETED]\x1b[0m Order: ${orderNumber} | Tickets: ${issuedTickets.length} | Amount: $${hold.total_amount}`
      );

      return {
        success: true,
        orderId,
        orderNumber,
        eventTitle: hold.event_title,
        venue: hold.venue,
        eventDate: hold.event_date,
        attendeeName,
        attendeeEmail,
        totalAmount: hold.total_amount,
        status: 'CONFIRMED',
        transactionRef: paymentResult.transactionRef,
        authCode: paymentResult.authCode,
        tickets: issuedTickets
      };
    });
  }
};
