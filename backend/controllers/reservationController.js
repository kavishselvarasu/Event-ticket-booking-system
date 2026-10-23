import { v4 as uuidv4 } from 'uuid';
import { reservationEngine } from '../services/reservationEngine.js';

export const reservationController = {
  /**
   * Places tickets into a 10-minute temporary reservation hold
   */
  async createHold(req, res) {
    try {
      const { eventId, ticketTierId, quantity } = req.body;
      const sessionId = req.headers['x-session-id'] || req.body.sessionId || `sess-${uuidv4().substring(0, 8)}`;
      const userId = req.user?.id || null;

      const result = await reservationEngine.createHold({
        eventId,
        ticketTierId,
        quantity: parseInt(quantity, 10),
        userId,
        sessionId
      });

      return res.status(201).json({
        message: 'Seats reserved successfully on 10-minute hold',
        sessionId,
        data: result
      });
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({
        error: error.code || 'RESERVATION_FAILED',
        message: error.message,
        availableSeats: error.availableSeats
      });
    }
  },

  /**
   * Get hold status and live countdown
   */
  async getHold(req, res) {
    try {
      const { id } = req.params;
      const hold = await reservationEngine.getHold(id);

      if (!hold) {
        return res.status(404).json({ error: 'Reservation hold not found' });
      }

      return res.json({ data: hold });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve reservation hold', message: error.message });
    }
  },

  /**
   * Explicitly cancel a reservation hold early
   */
  async cancelHold(req, res) {
    try {
      const { id } = req.params;
      const sessionId = req.headers['x-session-id'] || req.body.sessionId;

      const result = await reservationEngine.cancelHold(id, sessionId);
      return res.json(result);
    } catch (error) {
      const status = error.statusCode || 500;
      return res.status(status).json({ error: error.message });
    }
  }
};
