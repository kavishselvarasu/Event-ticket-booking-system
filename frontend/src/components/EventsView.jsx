import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SeatTierSelector } from './SeatTierSelector';
import { 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Building2, 
  Sparkles, 
  Crown,
  PartyPopper
} from 'lucide-react';

export function EventsView({ onHoldCreated }) {
  const [events, setEvents] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        const [evRes, tRes] = await Promise.all([
          api.events.getAll(selectedTenant === 'all' ? null : selectedTenant),
          api.events.getTenants()
        ]);
        setEvents(evRes.data || []);
        setTenants(tRes.data || []);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, [selectedTenant]);

  useEffect(() => {
    if (!selectedEventId) {
      setEventDetail(null);
      return;
    }

    async function loadDetail() {
      try {
        const res = await api.events.getById(selectedEventId);
        setEventDetail(res.data);
      } catch (err) {
        console.error('Failed to load event detail:', err);
      }
    }
    loadDetail();
  }, [selectedEventId]);

  const categories = ['all', ...new Set(events.map(e => e.category))];

  const filteredEvents = events.filter(e => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // If viewing single event detail
  if (selectedEventId && eventDetail) {
    return (
      <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
        <button
          onClick={() => setSelectedEventId(null)}
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '1.5rem', color: '#D4AF37' }}
        >
          &larr; Back to Carnival Events
        </button>

        {/* Hero Banner with Gold Border */}
        <div style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '2rem',
          height: '350px',
          border: '1px solid var(--border-gold)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <img
            src={eventDetail.banner_url}
            alt={eventDetail.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(7, 7, 8, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '2.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
              <span className="badge badge-gold">{eventDetail.tenant_name}</span>
              <span className="badge badge-white">{eventDetail.category}</span>
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>{eventDetail.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', color: '#E8E2D5', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} color="#D4AF37" />
                <span>{formatDate(eventDetail.event_date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="#D4AF37" />
                <span>{eventDetail.venue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Description */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--border-gold)' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#D4AF37' }}>Carnival Experience & Highlights</h3>
          <p style={{ color: '#E8E2D5', fontSize: '1rem', lineHeight: 1.7 }}>
            {eventDetail.description}
          </p>
        </div>

        {/* Seat Tier Selection Section */}
        <SeatTierSelector
          event={eventDetail}
          onHoldSuccess={(hold) => {
            if (onHoldCreated) onHoldCreated(hold);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Hero Welcome Header */}
      <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3rem auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: '#1C1B17',
          border: '1px solid #D4AF37',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#FFD700'
        }}>
          <Crown size={15} color="#D4AF37" />
          <span>The Grand Golden Carnival & Luxury Party Portal</span>
        </div>

        <h1 style={{ fontSize: '3.1rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem', color: '#FFFFFF' }}>
          Celebrate Life at the Most Exclusive <span style={{ color: '#D4AF37' }}>Carnivals & Grand Galas</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#E8E2D5', lineHeight: 1.6 }}>
          Reserve VIP tables, masquerade passes, and festival entry tickets. Enjoy an exclusive <strong>10-minute hold window</strong> to secure your party tickets.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{
        padding: '1rem 1.5rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        border: '1px solid var(--border-gold)'
      }}>
        {/* Tenant Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={16} color="#D4AF37" />
          <span style={{ fontSize: '0.85rem', color: '#D4AF37', fontWeight: 700 }}>Organizer:</span>
          <select
            className="form-select"
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.85rem' }}
          >
            <option value="all">All Party Organizers</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#E8E2D5' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid #D4AF37', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
          <div>Loading carnival events...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#A8A295' }}>
          No carnival events found for this filter.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '2rem'
        }}>
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                border: '1px solid var(--border-gold)'
              }}
            >
              {/* Event Poster Image */}
              <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                <img
                  src={ev.banner_url}
                  alt={ev.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  display: 'flex',
                  gap: '0.4rem'
                }}>
                  <span className="badge badge-gold">{ev.tenant_name}</span>
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  right: '12px'
                }}>
                  <span className="badge badge-white">{ev.category}</span>
                </div>
              </div>

              {/* Event Content Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#D4AF37', marginBottom: '0.4rem', fontWeight: 700 }}>
                  <Calendar size={14} color="#D4AF37" />
                  <span>{formatDate(ev.event_date)}</span>
                </div>

                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', lineHeight: 1.3, color: '#FFFFFF' }}>
                  {ev.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#E8E2D5', marginBottom: '1.25rem' }}>
                  <MapPin size={14} color="#D4AF37" />
                  <span>{ev.venue}</span>
                </div>

                {/* Capacity & Price Footer in Rupees */}
                <div style={{
                  marginTop: 'auto',
                  borderTop: '1px solid var(--border-gold-subtle)',
                  paddingTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.725rem', color: '#A8A295' }}>Passes from</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#D4AF37' }}>
                      ₹{Number(ev.min_price).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedEventId(ev.id)}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '0.4rem' }}
                  >
                    View Passes
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
