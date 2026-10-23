import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Check, 
  Crown, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Plus, 
  Minus,
  CheckCircle2,
  Ticket
} from 'lucide-react';

export function SeatTierSelector({ event, onHoldSuccess }) {
  const { setActiveHold } = useAuth();
  const [selectedTierId, setSelectedTierId] = useState(event.ticket_tiers?.[0]?.id || null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const selectedTier = event.ticket_tiers?.find(t => t.id === selectedTierId) || event.ticket_tiers?.[0];

  const handleSelectTier = (tier) => {
    if (tier.available_quantity <= 0) return;
    setSelectedTierId(tier.id);
    setQuantity(1);
    setErrorMsg(null);
  };

  const handleHoldBooking = async () => {
    if (!selectedTier) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.reservations.createHold(event.id, selectedTier.id, quantity);
      
      const holdPayload = {
        ...res.data,
        eventTitle: event.title,
        venue: event.venue,
        eventDate: event.event_date,
        bannerUrl: event.banner_url
      };

      setActiveHold(holdPayload);
      if (onHoldSuccess) onHoldSuccess(holdPayload);
    } catch (err) {
      console.error('Reservation hold error:', err);
      const data = err.data || {};
      if (err.status === 409 || data.error === 'INSUFFICIENT_INVENTORY') {
        setErrorMsg('Selected tickets are no longer available. Please choose a different tier or fewer passes.');
      } else {
        setErrorMsg(err.message || 'Unable to place reservation hold.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--border-gold)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Crown size={22} color="#D4AF37" />
            <h3 style={{ fontSize: '1.45rem', color: '#FFFFFF' }}>Select Carnival Ticket Tier</h3>
          </div>
          <p style={{ color: '#E8E2D5', fontSize: '0.9rem' }}>
            Choose your party experience. Your selected tickets will be placed in a <strong>10-minute private hold</strong> so you can complete payment.
          </p>
        </div>
        <div className="badge badge-gold" style={{ fontSize: '0.75rem', padding: '0.35rem 0.8rem' }}>
          Official Pass Reservation
        </div>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: '#261517',
          border: '1px solid #D4AF37',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#FFFFFF'
        }}>
          <AlertCircle size={20} color="#FFD700" />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{errorMsg}</div>
        </div>
      )}

      {/* Tiers Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {event.ticket_tiers?.map((tier) => {
          const isSelected = selectedTierId === tier.id;
          const isSoldOut = tier.available_quantity <= 0;
          const isLowStock = tier.available_quantity > 0 && tier.available_quantity <= 5;
          const perksList = tier.perks ? tier.perks.split(',').map(p => p.trim()) : [];

          return (
            <div
              key={tier.id}
              onClick={() => handleSelectTier(tier)}
              style={{
                backgroundColor: isSelected ? '#222019' : isSoldOut ? '#101012' : '#17171B',
                border: isSelected 
                  ? '2px solid #D4AF37' 
                  : isSoldOut ? '1px dashed #3A3A40' : '1px solid var(--border-gold)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                cursor: isSoldOut ? 'not-allowed' : 'pointer',
                opacity: isSoldOut ? 0.5 : 1,
                position: 'relative',
                transition: 'var(--transition)',
                boxShadow: isSelected ? '0 4px 20px rgba(212, 175, 55, 0.25)' : 'none'
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#D4AF37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={14} color="#070708" strokeWidth={3} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <h4 style={{ fontSize: '1.2rem', color: isSelected ? '#FFD700' : '#FFFFFF' }}>{tier.name}</h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#D4AF37' }}>
                  ₹{Number(tier.price).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#A8A295' }}>/ person</span>
              </div>

              {/* Capacity Status */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#A8A295' }}>Pass Availability</span>
                  {isSoldOut ? (
                    <span className="badge badge-dark" style={{ color: '#E8E2D5', border: '1px solid #555' }}>Sold Out</span>
                  ) : isLowStock ? (
                    <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Only {tier.available_quantity} Left!</span>
                  ) : (
                    <span style={{ color: '#D4AF37', fontWeight: 700 }}>{tier.available_quantity} available</span>
                  )}
                </div>

                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#26262B',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (tier.sold_quantity / tier.total_quantity) * 100)}%`,
                    backgroundColor: '#D4AF37'
                  }} />
                </div>
              </div>

              {/* Perks */}
              {perksList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-gold-subtle)', paddingTop: '0.85rem' }}>
                  {perksList.map((perk, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#E8E2D5' }}>
                      <CheckCircle2 size={13} color="#D4AF37" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quantity & CTA Bar */}
      {selectedTier && selectedTier.available_quantity > 0 && (
        <div style={{
          backgroundColor: '#17171B',
          border: '1px solid #D4AF37',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#D4AF37', textTransform: 'uppercase', fontWeight: 700 }}>
              Number of Passes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="btn btn-secondary btn-sm"
                style={{ width: '36px', height: '36px', padding: 0 }}
              >
                <Minus size={16} />
              </button>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, minWidth: '24px', textAlign: 'center', color: '#FFFFFF' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(selectedTier.max_per_order, selectedTier.available_quantity, quantity + 1))}
                disabled={quantity >= Math.min(selectedTier.max_per_order, selectedTier.available_quantity)}
                className="btn btn-secondary btn-sm"
                style={{ width: '36px', height: '36px', padding: 0 }}
              >
                <Plus size={16} />
              </button>
              <span style={{ fontSize: '0.8rem', color: '#A8A295' }}>
                (Max {selectedTier.max_per_order} per order)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#A8A295' }}>Total Price</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D4AF37' }}>
                ₹{Number(selectedTier.price * quantity).toLocaleString('en-IN')}
              </div>
            </div>

            <button
              onClick={handleHoldBooking}
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 1.85rem',
                fontSize: '1rem',
                fontWeight: 800,
                gap: '0.65rem'
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #070708', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Securing Tickets...
                </>
              ) : (
                <>
                  <Ticket size={18} />
                  Reserve on 10-Min Hold
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
