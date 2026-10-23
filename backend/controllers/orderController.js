import { orderEngine } from '../services/orderEngine.js';
import { query } from '../config/db.js';

export const orderController = {
  /**
   * Finalizes checkout for a temporary 10-minute reservation hold
   */
  async checkout(req, res) {
    try {
      const {
        holdId,
        attendeeName,
        attendeeEmail,
        paymentMethod = 'CREDIT_CARD',
        cardLast4 = '4242',
        simulateOutcome = 'FORCE_SUCCESS',
        idempotencyKey = null
      } = req.body;

      const sessionId = req.headers['x-session-id'] || req.body.sessionId;
      const userId = req.user?.id || null;

      const result = await orderEngine.checkoutHold({
        holdId,
        sessionId,
        userId,
        attendeeName,
        attendeeEmail,
        paymentMethod,
        cardLast4,
        simulateOutcome,
        idempotencyKey
      });

      if (!result.success && result.paymentStatus === 'FAILED') {
        return res.status(402).json({
          error: 'PAYMENT_DECLINED',
          message: result.message,
          failureReason: result.error,
          holdRemainingSeconds: result.holdRemainingSeconds
        });
      }

      return res.status(201).json({
        message: 'Order placed and tickets issued successfully!',
        data: result
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.code || 'CHECKOUT_FAILED',
        message: error.message
      });
    }
  },

  /**
   * Retrieves order by ID with tickets and payment receipt
   */
  async getOrder(req, res) {
    try {
      const { id } = req.params;

      const orderRes = await query(
        `SELECT o.*, e.title as event_title, e.venue, e.event_date, e.banner_url,
                t.name as tenant_name, t.currency
         FROM orders o
         JOIN events e ON o.event_id = e.id
         JOIN tenants t ON o.tenant_id = t.id
         WHERE o.id = $1 OR o.order_number = $1`,
        [id]
      );

      if (orderRes.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderRes.rows[0];

      // Load tickets
      const ticketsRes = await query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );

      // Load transaction
      const txnRes = await query(
        'SELECT * FROM transactions WHERE order_id = $1',
        [order.id]
      );

      return res.json({
        data: {
          ...order,
          tickets: ticketsRes.rows,
          transaction: txnRes.rows[0] || null
        }
      });
    } catch (error) {
      console.error('getOrder error:', error);
      return res.status(500).json({ error: 'Failed to retrieve order' });
    }
  },

  /**
   * Retrieve attendee tickets (authenticated user or by email query)
   */
  async getMyTickets(req, res) {
    try {
      const userId = req.user?.id;
      const email = req.query.email || req.user?.email;

      if (!userId && !email) {
        return res.json({ data: [] });
      }

      const ordersRes = await query(
        `SELECT o.*, e.title as event_title, e.venue, e.event_date, e.banner_url
         FROM orders o
         JOIN events e ON o.event_id = e.id
         WHERE o.user_id = $1 OR o.attendee_email = $2
         ORDER BY o.created_at DESC`,
        [userId || 'none', email || 'none']
      );

      const enrichedOrders = [];
      for (const ord of ordersRes.rows) {
        const tickets = await query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
        enrichedOrders.push({
          ...ord,
          tickets: tickets.rows
        });
      }

      return res.json({ data: enrichedOrders });
    } catch (error) {
      console.error('getMyTickets error:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }
};
