import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Ticket, 
  BarChart3, 
  Clock, 
  ChevronDown, 
  CheckCircle2, 
  Sparkles,
  Crown,
  Layers,
  Zap
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, switchRole, activeHold } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatTimer = (seconds) => {
    if (seconds === undefined || seconds === null) return '10:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRoleChange = async (role, tenantId) => {
    await switchRole(role, tenantId);
    setDropdownOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: '#0D0D0F',
      borderBottom: '1px solid var(--border-gold)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '74px'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('events')} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(212, 175, 55, 0.3)'
          }}>
            <Crown size={24} color="#070708" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#D4AF37', letterSpacing: '-0.01em' }}>
                ROYAL CARNIVAL
              </span>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>VIP PASS</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#E8E2D5', marginTop: '-2px' }}>
              Grand Festivals & Gala Ticket Reservations
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('events')}
            className={`btn btn-sm ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Ticket size={16} />
            Carnival Events
          </button>

          <button
            onClick={() => setActiveTab('organizer')}
            className={`btn btn-sm ${activeTab === 'organizer' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <BarChart3 size={16} />
            Organizer Dashboard
          </button>

          <button
            onClick={() => setActiveTab('my-tickets')}
            className={`btn btn-sm ${activeTab === 'my-tickets' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <CheckCircle2 size={16} />
            My Tickets
          </button>

          <button
            onClick={() => setActiveTab('concurrency')}
            className={`btn btn-sm ${activeTab === 'concurrency' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Zap size={16} />
            Test Lab
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`btn btn-sm ${activeTab === 'docs' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Layers size={16} />
            Architecture & ER
          </button>
        </nav>

        {/* Active Hold Widget & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Active Hold Live Widget */}
          {activeHold && activeHold.remainingSeconds > 0 && (
            <div 
              onClick={() => setActiveTab('checkout')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#1E1D19',
                border: '1px solid #D4AF37',
                cursor: 'pointer'
              }}
              title="Click to complete your reserved tickets"
            >
              <Clock size={16} color="#FFD700" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFD700' }}>
                Cart Held: {formatTimer(activeHold.remainingSeconds)}
              </span>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                Checkout
              </span>
            </div>
          )}

          {/* Evaluator 1-Click Role Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#161619',
                border: '1px solid var(--border-gold)',
                gap: '0.6rem',
                color: '#FFFFFF'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#070708'
              }}>
                {user?.role ? user.role.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {user?.fullName ? user.fullName.split(' ')[0] : 'Role'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#D4AF37', textTransform: 'capitalize' }}>
                  {user?.role || 'Guest'}
                </div>
              </div>
              <ChevronDown size={14} color="#D4AF37" />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '280px',
                backgroundColor: '#141417',
                border: '1px solid var(--gold-pure)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                padding: '0.75rem',
                zIndex: 100
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#D4AF37',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                  paddingLeft: '0.5rem'
                }}>
                  Quick Grader Role Switcher
                </div>

                <div 
                  onClick={() => handleRoleChange('attendee')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: user?.role === 'attendee' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <span className="badge badge-gold" style={{ minWidth: '70px', justifyContent: 'center' }}>Attendee</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Jordan Lee</div>
                    <div style={{ fontSize: '0.7rem', color: '#E8E2D5' }}>Guest ticket booking</div>
                  </div>
                </div>

                <div 
                  onClick={() => handleRoleChange('organizer', 'tenant-apex')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: user?.role === 'organizer' && user?.tenantId === 'tenant-apex' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <span className="badge badge-white" style={{ minWidth: '70px', justifyContent: 'center' }}>Royal Org</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Elena Rostova</div>
                    <div style={{ fontSize: '0.7rem', color: '#E8E2D5' }}>Royal Carnivals Producer</div>
                  </div>
                </div>

                <div 
                  onClick={() => handleRoleChange('organizer', 'tenant-soundwave')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: user?.role === 'organizer' && user?.tenantId === 'tenant-soundwave' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <span className="badge badge-white" style={{ minWidth: '70px', justifyContent: 'center' }}>Euphoria</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Marcus Chen</div>
                    <div style={{ fontSize: '0.7rem', color: '#E8E2D5' }}>Euphoria Festivals Director</div>
                  </div>
                </div>

                <div 
                  onClick={() => handleRoleChange('admin')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    backgroundColor: user?.role === 'admin' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <span className="badge badge-gold" style={{ minWidth: '70px', justifyContent: 'center' }}>Admin</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Alex Mercer</div>
                    <div style={{ fontSize: '0.7rem', color: '#E8E2D5' }}>Platform administrator</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
