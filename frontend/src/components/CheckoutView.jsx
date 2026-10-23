import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import confetti from 'canvas-confetti';
import { 
  CreditCard, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  ArrowLeft,
  Calendar,
  MapPin,
  Sparkles,
  Crown
} from 'lucide-react';

export function CheckoutView({ onBackToEvents, onOrderCompleted }) {
  const { user, activeHold, setActiveHold } = useAuth();

  const [attendeeName, setAttendeeName] = useState(user?.fullName || 'Jordan Lee');
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email || 'attendee@gmail.com');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [simulateOutcome, setSimulateOutcome] = useState('FORCE_SUCCESS');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [processingStep, setProcessingStep] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.fullName) setAttendeeName(user.fullName);
      if (user.email) setAttendeeEmail(user.email);
    }
  }, [user]);

  const formatTimer = (seconds) => {
    if (seconds === undefined || seconds === null) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePayNow = async (e) => {
    e.preventDefault();
    if (!activeHold) return;

    setLoading(true);
    setErrorMsg(null);
    setProcessingStep('Connecting to Payment Gateway...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setProcessingStep('Authorizing Cardholder Payment...');
      
      await new Promise(r => setTimeout(r, 600));
      setProcessingStep('Generating Carnival Entry Passes...');

      const res = await api.orders.checkout({
        holdId: activeHold.holdId,
        attendeeName,
        attendeeEmail,
        paymentMethod: 'CREDIT_CARD',
        cardLast4: '4242',
        simulateOutcome
      });

      setProcessingStep('Payment Approved! Finalizing Order...');
      await new Promise(r => setTimeout(r, 400));

      setCompletedOrder(res.data);
      setActiveHold(null);

      // Gold celebratory confetti
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          colors: ['#D4AF37', '#FFD700', '#FFFFFF', '#C5A059'],
          origin: { y: 0.6 }
        });
      } catch (cErr) {}

      if (onOrderCompleted) onOrderCompleted(res.data);
    } catch (err) {
      console.error('Checkout error:', err);
      const data = err.data || {};
      if (err.status === 402 || data.error === 'PAYMENT_DECLINED') {
        setErrorMsg('Payment was declined by the card issuer. Your 10-minute hold is still intact; please try again.');
      } else if (err.status === 410 || data.error === 'HOLD_EXPIRED') {
        setErrorMsg('Reservation hold expired after 10 minutes. Please select tickets again.');
        setActiveHold(null);
      } else {
        setErrorMsg(err.message || 'Payment processing failed.');
      }
    } finally {
      setLoading(false);
      setProcessingStep(null);
    }
  };

  // If order completed, render rich Ticket confirmation view in Gold & White
  if (completedOrder) {
    return (
      <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '800px' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', border: '1px solid #D4AF37' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)'
          }}>
            <CheckCircle2 size={40} color="#070708" />
          </div>

          <span className="badge badge-gold" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            Payment Approved & Passes Issued
          </span>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>VIP Booking Confirmed!</h2>
          <p style={{ color: '#E8E2D5', marginBottom: '1.75rem' }}>
            Booking Reference <strong>{completedOrder.orderNumber}</strong> has been confirmed for <strong>{completedOrder.attendeeEmail}</strong>.
          </p>

          <div style={{
            backgroundColor: '#161619',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-gold)',
            padding: '1.5rem',
            textAlign: 'left',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-gold-subtle)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#A8A295' }}>Carnival Event</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>{completedOrder.eventTitle}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: '#A8A295' }}>Total Paid</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#D4AF37' }}>
                  ₹{Number(completedOrder.totalAmount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#A8A295' }}>Transaction Ref</div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#D4AF37' }}>
                  {completedOrder.transactionRef}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#A8A295' }}>Gateway Auth Code</div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#FFFFFF' }}>
                  {completedOrder.authCode}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: '#D4AF37' }}>
              Your Issued Carnival Entry Passes ({completedOrder.tickets?.length}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {completedOrder.tickets?.map((t, idx) => (
                <div
                  key={t.id || idx}
                  style={{
                    backgroundColor: '#1C1C21',
                    border: '1px solid var(--border-gold)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.9rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#D4AF37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <QrCode size={22} color="#070708" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>{t.tierName} #{idx + 1}</div>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#D4AF37' }}>{t.ticketCode}</div>
                    </div>
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Pass Active</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onBackToEvents}
            className="btn btn-primary"
            style={{ padding: '0.85rem 2.2rem', fontSize: '1rem' }}
          >
            Explore More Carnival Events
          </button>
        </div>
      </div>
    );
  }

  // If no active hold
  if (!activeHold || activeHold.remainingSeconds <= 0) {
    return (
      <div className="container" style={{ padding: '3rem 1.5rem', maxWidth: '650px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem', border: '1px solid var(--border-gold)' }}>
          <Clock size={48} color="#D4AF37" style={{ margin: '0 auto 1.25rem auto' }} />
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>No Active Ticket Hold</h2>
          <p style={{ color: '#E8E2D5', marginBottom: '1.75rem' }}>
            You do not currently have passes reserved. Browse the carnival catalog to pick passes and begin checkout.
          </p>
          <button onClick={onBackToEvents} className="btn btn-primary">
            <ArrowLeft size={16} />
            Browse Carnival Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1000px' }}>
      <button
        onClick={onBackToEvents}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} />
        Back to Event Details
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Order Summary & Countdown */}
        <div>
          <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} />
                Hold Time Remaining: {formatTimer(activeHold.remainingSeconds)}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 600 }}>RESERVED</span>
            </div>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>{activeHold.eventTitle}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#E8E2D5', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              <MapPin size={14} color="#D4AF37" />
              <span>{activeHold.venue}</span>
            </div>

            <div style={{
              borderTop: '1px solid var(--border-gold-subtle)',
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#A8A295' }}>Tier</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{activeHold.tierName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#A8A295' }}>Quantity</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{activeHold.quantity} Ticket(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: '#A8A295' }}>Price per Ticket</span>
                <span style={{ fontWeight: 700, color: '#D4AF37' }}>
                  ₹{Number(activeHold.unitPrice).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.25rem',
                fontWeight: 800,
                borderTop: '1px solid var(--border-gold)',
                paddingTop: '0.75rem',
                marginTop: '0.25rem'
              }}>
                <span style={{ color: '#FFFFFF' }}>Total Due</span>
                <span style={{ color: '#D4AF37' }}>
                  ₹{Number(activeHold.totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Exclusive Reservation Assurance */}
          <div style={{
            backgroundColor: '#161512',
            border: '1px solid var(--border-gold)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            fontSize: '0.85rem',
            color: '#E8E2D5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#D4AF37', marginBottom: '0.35rem' }}>
              <Crown size={16} color="#D4AF37" />
              Guaranteed VIP Ticket Hold
            </div>
            Your passes are temporarily reserved solely for you. Complete your payment within 10 minutes to finalize entry.
          </div>
        </div>

        {/* Right Column: Checkout Form in Gold & White */}
        <div>
          <form onSubmit={handlePayNow} className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--border-gold)' }}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFFFFF' }}>
              <CreditCard size={20} color="#D4AF37" />
              Complete Payment
            </h3>

            {errorMsg && (
              <div style={{
                backgroundColor: '#261517',
                border: '1px solid #D4AF37',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem',
                marginBottom: '1.25rem',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} color="#FFD700" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Attendee Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder="Jordan Lee"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ticket Delivery Email</label>
              <input
                type="email"
                required
                className="form-input"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="attendee@gmail.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Number (Simulated)</label>
              <input
                type="text"
                className="form-input"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
            </div>

            {/* Evaluator Simulation Control */}
            <div style={{
              backgroundColor: '#161512',
              border: '1px solid var(--border-gold)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <label className="form-label" style={{ color: '#D4AF37', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} />
                Payment Gateway Simulator Mode
              </label>
              <select
                className="form-select"
                value={simulateOutcome}
                onChange={(e) => setSimulateOutcome(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="FORCE_SUCCESS">✔ Force Approve (Instant 201 Success)</option>
                <option value="FORCE_DECLINE">✖ Force Decline (Issuer Rejection - 402)</option>
                <option value="INSUFFICIENT_FUNDS">✖ Force Insufficient Funds (Hold Retained - 402)</option>
                <option value="RANDOM">🎲 Realistic Random (90% Success / 10% Decline)</option>
              </select>
              <div style={{ fontSize: '0.725rem', color: '#A8A295', marginTop: '0.4rem' }}>
                Tip: Choose "Force Decline" to verify that failed payments leave the 10-minute hold active for retry!
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.95rem', fontSize: '1rem', fontWeight: 800 }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #070708', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span>{processingStep || 'Processing Payment...'}</span>
                </div>
              ) : (
                `Pay ₹${Number(activeHold.totalAmount).toLocaleString('en-IN')}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
