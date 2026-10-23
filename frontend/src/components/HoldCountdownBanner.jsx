import React from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Clock, ArrowRight, XCircle, Sparkles } from 'lucide-react';

export function HoldCountdownBanner({ onProceedCheckout }) {
  const { activeHold, setActiveHold } = useAuth();

  if (!activeHold || activeHold.remainingSeconds <= 0) return null;

  const totalDuration = 600; // 10 minutes
  const progressPercent = Math.max(0, Math.min(100, (activeHold.remainingSeconds / totalDuration) * 100));

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRelease = async () => {
    if (window.confirm('Do you want to release these reserved tickets?')) {
      try {
        await api.reservations.cancelHold(activeHold.holdId);
      } catch (e) {
        console.warn('Hold cancel error:', e);
      } finally {
        setActiveHold(null);
      }
    }
  };

  return (
    <div style={{
      maxWidth: '1240px',
      margin: '1.5rem auto 0 auto',
      padding: '0 1.5rem'
    }}>
      <div className="hold-banner" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#D4AF37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} color="#070708" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFD700' }}>
                  Your Carnival Tickets Are Reserved
                </span>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                  {formatTimer(activeHold.remainingSeconds)} Remaining
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#FDFBF7', marginTop: '2px' }}>
                Holding <strong>{activeHold.quantity}x {activeHold.tierName || 'Passes'}</strong> for <strong>₹{Number(activeHold.totalAmount).toLocaleString('en-IN')}</strong>. Complete your checkout before the timer runs out!
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleRelease}
              className="btn btn-secondary btn-sm"
              style={{ color: '#E8E2D5', borderColor: 'var(--border-gold)' }}
            >
              <XCircle size={15} />
              Release Passes
            </button>
            <button
              onClick={onProceedCheckout}
              className="btn btn-primary btn-sm"
              style={{
                backgroundColor: '#D4AF37',
                color: '#070708',
                fontWeight: 800
              }}
            >
              Complete Booking
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Progress Bar in Solid Gold */}
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#26262B',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: '#D4AF37',
            transition: 'width 1s linear'
          }} />
        </div>
      </div>
    </div>
  );
}
