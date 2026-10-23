import React from 'react';
import { 
  Database, 
  Layers, 
  Clock, 
  CheckCircle2, 
  FileText,
  Crown,
  Server
} from 'lucide-react';

export function DocsView() {
  const entities = [
    {
      name: 'Tenants (Carnival Organizers)',
      description: 'Isolates event catalogs, staff, and revenue streams per organizer.',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'Unique tenant key (e.g. tenant-apex)' },
        { name: 'name', type: 'VARCHAR(255)', desc: 'Organization display title' },
        { name: 'slug', type: 'VARCHAR(100)', key: 'UK', desc: 'URL slug (royal-carnivals, euphoria-parties)' },
        { name: 'currency', type: 'VARCHAR(10)', desc: 'Settlement currency (INR ₹)' }
      ]
    },
    {
      name: 'Users (RBAC)',
      description: 'System roles: admin (platform), organizer (tenant admin), attendee.',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'User UUID' },
        { name: 'tenant_id', type: 'VARCHAR(64)', key: 'FK', desc: 'Scoping to tenants.id' },
        { name: 'email', type: 'VARCHAR(255)', key: 'UK', desc: 'Unique login email' },
        { name: 'role', type: 'VARCHAR(32)', desc: 'admin | organizer | attendee' }
      ]
    },
    {
      name: 'Carnival Events',
      description: 'Multi-tenant hosted galas with sales cut-off deadlines and status.',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'Event UUID' },
        { name: 'tenant_id', type: 'VARCHAR(64)', key: 'FK', desc: 'References tenants.id' },
        { name: 'title', type: 'VARCHAR(255)', desc: 'Event Title' },
        { name: 'sales_cutoff_date', type: 'TIMESTAMP', desc: 'Cut-off for purchasing' },
        { name: 'status', type: 'VARCHAR(32)', desc: 'PUBLISHED | DRAFT | SOLDOUT' }
      ]
    },
    {
      name: 'Ticket Tiers',
      description: 'Inventory quotas with atomic capacity invariants in Rupees (₹).',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'Tier UUID' },
        { name: 'event_id', type: 'VARCHAR(64)', key: 'FK', desc: 'References events.id' },
        { name: 'price', type: 'DECIMAL(10,2)', desc: 'Price in Rupees (₹)' },
        { name: 'total_quantity', type: 'INTEGER', desc: 'Total seats capacity' },
        { name: 'reserved_quantity', type: 'INTEGER', desc: 'Under 10-minute hold' },
        { name: 'sold_quantity', type: 'INTEGER', desc: 'Confirmed paid seats' }
      ]
    },
    {
      name: 'Reservations (10-Min Holds)',
      description: 'Temporary seat locks reserved prior to payment settlement.',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'Hold identifier (res-xxx)' },
        { name: 'session_id', type: 'VARCHAR(128)', desc: 'Client session tracking' },
        { name: 'quantity', type: 'INTEGER', desc: 'Seats temporarily locked' },
        { name: 'status', type: 'VARCHAR(32)', desc: 'HELD | COMPLETED | EXPIRED' },
        { name: 'expires_at', type: 'TIMESTAMP', desc: 'Creation time + 10 Minutes' }
      ]
    },
    {
      name: 'Orders & Order Items',
      description: 'Confirmed ticket transactions, attendee receipts, and QR vouchers.',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'Order UUID' },
        { name: 'order_number', type: 'VARCHAR(64)', key: 'UK', desc: 'ORD-2026-XXXXX' },
        { name: 'ticket_code', type: 'VARCHAR(64)', key: 'UK', desc: 'Unique QR voucher voucher' },
        { name: 'total_amount', type: 'DECIMAL(10,2)', desc: 'Total charged sum (₹)' }
      ]
    },
    {
      name: 'Transactions',
      description: 'Payment gateway audit logs with idempotency and simulated responses.',
      fields: [
        { name: 'id', type: 'VARCHAR(64)', key: 'PK', desc: 'Transaction UUID' },
        { name: 'order_id', type: 'VARCHAR(64)', key: 'FK', desc: 'References orders.id' },
        { name: 'transaction_ref', type: 'VARCHAR(128)', key: 'UK', desc: 'Gateway reference' },
        { name: 'currency', type: 'VARCHAR(10)', desc: 'INR (₹)' },
        { name: 'status', type: 'VARCHAR(32)', desc: 'SUCCEEDED | FAILED' }
      ]
    }
  ];

  return (
    <div className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Crown size={22} color="#D4AF37" />
          <h2 style={{ fontSize: '2rem', color: '#FFFFFF' }}>Data Model & Architectural Deliverables</h2>
        </div>
        <p style={{ color: '#E8E2D5', fontSize: '0.95rem' }}>
          Academic evaluation reference for Web Technology assignment: Entity Relationships, Database Invariants, and Background Workers.
        </p>
      </div>

      {/* Architecture Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ border: '1px solid var(--border-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Database size={18} color="#D4AF37" />
            <h4 style={{ fontSize: '1rem', color: '#FFFFFF' }}>Transaction Safety</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#E8E2D5' }}>
            Uses database transactions with row-level locks to prevent double-booking during concurrent checkouts.
          </p>
        </div>

        <div className="glass-card" style={{ border: '1px solid var(--border-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Server size={18} color="#D4AF37" />
            <h4 style={{ fontSize: '1rem', color: '#FFFFFF' }}>High-Speed Read Caching</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#E8E2D5' }}>
            Active event details and tier capacities are cached in-memory and in Redis with automatic invalidation.
          </p>
        </div>

        <div className="glass-card" style={{ border: '1px solid var(--border-gold)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Clock size={18} color="#D4AF37" />
            <h4 style={{ fontSize: '1rem', color: '#FFFFFF' }}>10-Minute Hold Worker</h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#E8E2D5' }}>
            A background scheduled worker runs every 10 seconds to detect expired holds and automatically returns held passes to the public inventory pool.
          </p>
        </div>
      </div>

      {/* Entity Relationship Schema Cards */}
      <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', color: '#D4AF37' }}>Database Schema Entities</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {entities.map((e, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h4 style={{ fontSize: '1.15rem', color: '#D4AF37' }}>{e.name}</h4>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Table</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#E8E2D5', marginBottom: '1rem' }}>{e.description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {e.fields.map((f, fIdx) => (
                <div key={fIdx} style={{
                  backgroundColor: '#1E1E24',
                  border: '1px solid var(--border-gold-subtle)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#FFFFFF' }}>{f.name}</span>
                    <span style={{ color: '#A8A295', marginLeft: '0.5rem' }}>({f.type})</span>
                  </div>
                  {f.key && (
                    <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '0.1rem 0.45rem' }}>
                      {f.key}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Postman Collection & Deliverables Note */}
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid var(--border-gold)' }}>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#FFFFFF' }}>
          <FileText size={20} color="#D4AF37" />
          Submission Deliverables Checklist
        </h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.925rem', color: '#E8E2D5' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} color="#D4AF37" />
            <span><strong>ER Diagram</strong>: Available in <code>docs/ER_DIAGRAM.md</code> with full Mermaid diagram and cardinalities.</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} color="#D4AF37" />
            <span><strong>Postman Collection</strong>: Ready in <code>postman/Event_Ticket_Reservation_System.postman_collection.json</code> with tests for concurrent bookings and expired sessions.</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckCircle2 size={18} color="#D4AF37" />
            <span><strong>Deployment Configs</strong>: Includes <code>Dockerfile</code> and <code>docker-compose.yml</code> for instant Render, Railway, or Docker deployment.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
