import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HoldCountdownBanner } from './components/HoldCountdownBanner';
import { EventsView } from './components/EventsView';
import { CheckoutView } from './components/CheckoutView';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { ConcurrencyLab } from './components/ConcurrencyLab';
import { MyTicketsView } from './components/MyTicketsView';
import { DocsView } from './components/DocsView';

function AppContent() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Sticky Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Persistent 10-Minute Hold Countdown Banner */}
      <HoldCountdownBanner onProceedCheckout={() => setActiveTab('checkout')} />

      {/* Main Tab View */}
      <main style={{ flex: 1 }}>
        {activeTab === 'events' && (
          <EventsView 
            onHoldCreated={(hold) => {
              setActiveTab('checkout');
            }} 
          />
        )}

        {activeTab === 'checkout' && (
          <CheckoutView 
            onBackToEvents={() => setActiveTab('events')} 
            onOrderCompleted={() => {
              // Stay on confirmation screen or let user navigate
            }}
          />
        )}

        {activeTab === 'organizer' && (
          <OrganizerDashboard />
        )}

        {activeTab === 'concurrency' && (
          <ConcurrencyLab />
        )}

        {activeTab === 'my-tickets' && (
          <MyTicketsView />
        )}

        {activeTab === 'docs' && (
          <DocsView />
        )}
      </main>

      {/* Golden Carnival Luxury Footer */}
      <footer style={{
        backgroundColor: '#0D0D0F',
        borderTop: '1px solid var(--border-gold)',
        padding: '2.5rem 1.5rem',
        marginTop: '4rem'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#D4AF37' }}>
                Royal Carnival & Gala Ticketing
              </span>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>VIP Edition</span>
            </div>
            <div style={{ fontSize: '0.825rem', color: '#A8A295' }}>
              Web Technology Project • Multi-Tenant Carnival & Ticket Reservation Platform
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-gold">VIP Entry Passes</span>
            <span className="badge badge-white">Live QR Vouchers</span>
            <span className="badge badge-dark">10-Min Seat Reservation</span>
            <span className="badge badge-gold">Indian Rupees (₹)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
