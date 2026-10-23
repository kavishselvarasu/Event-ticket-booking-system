import { v4 as uuidv4 } from 'uuid';

export const paymentService = {
  /**
   * Mock payment gateway endpoint simulating real-world asynchronous credit card/gateway processing
   */
  async simulatePayment({
    amount,
    currency = 'INR',
    paymentMethod = 'CREDIT_CARD',
    cardLast4 = '4242',
    simulateOutcome = 'FORCE_SUCCESS', // 'FORCE_SUCCESS' | 'FORCE_DECLINE' | 'INSUFFICIENT_FUNDS' | 'RANDOM'
    delayMs = 1200
  }) {
    // Simulate real gateway async network latency
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 5000)));
    }

    const transactionRef = `TXN-MOCK-${Date.now().toString().slice(-6)}-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Determine outcome
    let isSuccess = true;
    let failureReason = null;

    if (simulateOutcome === 'FORCE_DECLINE') {
      isSuccess = false;
      failureReason = 'CARD_DECLINED_BY_ISSUER';
    } else if (simulateOutcome === 'INSUFFICIENT_FUNDS') {
      isSuccess = false;
      failureReason = 'INSUFFICIENT_ACCOUNT_FUNDS';
    } else if (simulateOutcome === 'RANDOM') {
      // 90% success rate
      isSuccess = Math.random() < 0.90;
      if (!isSuccess) failureReason = 'ISSUER_TEMPORARY_NETWORK_ERROR';
    }

    const authCode = isSuccess ? `AUTH-${Math.floor(100000 + Math.random() * 900000)}` : null;

    return {
      transactionRef,
      paymentMethod,
      amount: parseFloat(amount),
      currency,
      status: isSuccess ? 'SUCCEEDED' : 'FAILED',
      authCode,
      failureReason,
      gatewayResponse: {
        gateway: 'MockStripeSimulator_v2',
        riskLevel: 'normal',
        captured: isSuccess,
        networkStatus: 'approved_by_network',
        card: {
          brand: 'Visa',
          last4: cardLast4,
          expMonth: 12,
          expYear: 2028
        },
        processedAt: new Date().toISOString()
      }
    };
  }
};
