import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Ticket, 
  QrCode, 
  Calendar, 
  MapPin, 
  Crown,
  Sparkles
} from 'lucide-react';

export function MyTicketsView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      setLoading(true);
      try {
        const res = await api.orders.getMyTickets();
        setOrders(res.data || []);
      } catch (err) {
        console.error('Failed to load tickets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Crown size={22} color="#D4AF37" />
          <h2 style={{ fontSize: '1.9rem', color: '#FFFFFF' }}>My Carnival & Gala Passes</h2>
        </div>
        <p style={{ color: '#E8E2D5', fontSize: '0.95rem' }}>
          Your digital entry passes and verified QR vouchers. Present your pass at the entrance gate or VIP lounge.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#E8E2D5' }}>
          <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
          Loading your festival passes...
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px solid var(--border-gold)' }}>
          <Ticket size={48} color="#D4AF37" style={{ margin: '0 auto 1rem auto', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>No Passes Issued Yet</h3>
          <p style={{ color: '#E8E2D5', fontSize: '0.9rem' }}>
            Browse the carnival events catalog to reserve your passes and complete checkout.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {orders.map((order) => (
            <div key={order.id} className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--border-gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-gold-subtle)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>VIP Order Confirmed</span>
                  <h3 style={{ fontSize: '1.45rem', color: '#FFFFFF' }}>{order.event_title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#E8E2D5', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} color="#D4AF37" />
                      <span>{formatDate(order.event_date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} color="#D4AF37" />
                      <span>{order.venue}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#A8A295' }}>Pass Order Ref</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'monospace', color: '#D4AF37' }}>
                    {order.order_number}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#E8E2D5', marginTop: '2px' }}>
                    Total: <strong style={{ color: '#D4AF37' }}>₹{Number(order.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Individual Tickets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {order.tickets?.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    style={{
                      backgroundColor: '#19191D',
                      border: '1px solid var(--border-gold)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-gold">{t.tier_name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#FFD700', fontWeight: 700 }}>Pass Active</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      backgroundColor: '#222227',
                      border: '1px solid var(--border-gold-subtle)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <QrCode size={36} color="#000" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#A8A295', textTransform: 'uppercase' }}>QR Voucher Code</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', color: '#D4AF37' }}>
                          {t.ticket_code}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#A8A295', marginTop: 'auto' }}>
                      <span>Holder: {order.attendee_name}</span>
                      <span>Pass #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
