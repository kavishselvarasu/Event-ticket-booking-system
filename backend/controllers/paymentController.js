import { paymentService } from '../services/paymentService.js';

export const paymentController = {
  /**
   * Standalone mock payment gateway test endpoint
   */
  async simulate(req, res) {
    try {
      const {
        amount = 1000,
        currency = 'INR',
        paymentMethod = 'CREDIT_CARD',
        cardLast4 = '4242',
        simulateOutcome = 'FORCE_SUCCESS',
        delayMs = 1000
      } = req.body;

      const result = await paymentService.simulatePayment({
        amount,
        currency,
        paymentMethod,
        cardLast4,
        simulateOutcome,
        delayMs
      });

      return res.json({
        message: 'Mock Payment Gateway simulation completed',
        data: result
      });
    } catch (error) {
      return res.status(500).json({ error: 'Payment simulation error', message: error.message });
    }
  }
};
