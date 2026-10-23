import { query, getDbMode, initDatabase } from '../config/db.js';
import { getSeedData } from './seedData.js';

export async function setupDatabase() {
  await initDatabase();
  const mode = getDbMode();

  console.log(`[DB Init] Initializing schema for mode: ${mode}...`);

  if (mode === 'postgresql') {
    // PostgreSQL schema
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255),
        logo_url TEXT,
        currency VARCHAR(10) DEFAULT 'INR',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE SET NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'organizer', 'attendee')),
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        venue VARCHAR(255) NOT NULL,
        banner_url TEXT,
        event_date TIMESTAMP WITH TIME ZONE NOT NULL,
        sales_cutoff_date TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'SOLDOUT', 'CANCELLED')),
        created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ticket_tiers (
        id VARCHAR(64) PRIMARY KEY,
        event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        total_quantity INTEGER NOT NULL,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        sold_quantity INTEGER NOT NULL DEFAULT 0,
        max_per_order INTEGER NOT NULL DEFAULT 4,
        perks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id VARCHAR(64) PRIMARY KEY,
        event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        ticket_tier_id VARCHAR(64) NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(128) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'HELD',
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        event_id VARCHAR(64) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        reservation_id VARCHAR(64) REFERENCES reservations(id) ON DELETE SET NULL,
        order_number VARCHAR(64) UNIQUE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
        attendee_name VARCHAR(255) NOT NULL,
        attendee_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        ticket_tier_id VARCHAR(64) NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
        ticket_code VARCHAR(64) UNIQUE NOT NULL,
        tier_name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        qr_payload TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        transaction_ref VARCHAR(128) UNIQUE NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'CREDIT_CARD',
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(32) NOT NULL,
        failure_reason TEXT,
        idempotency_key VARCHAR(128) UNIQUE,
        gateway_response TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    // SQLite schema
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        domain TEXT,
        logo_url TEXT,
        currency TEXT DEFAULT 'INR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'organizer', 'attendee')),
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        venue TEXT NOT NULL,
        banner_url TEXT,
        event_date DATETIME NOT NULL,
        sales_cutoff_date DATETIME NOT NULL,
        status TEXT NOT NULL DEFAULT 'PUBLISHED',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS ticket_tiers (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        total_quantity INTEGER NOT NULL,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        sold_quantity INTEGER NOT NULL DEFAULT 0,
        max_per_order INTEGER NOT NULL DEFAULT 4,
        perks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        ticket_tier_id TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'HELD',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (ticket_tier_id) REFERENCES ticket_tiers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        user_id TEXT,
        reservation_id TEXT,
        order_number TEXT UNIQUE NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        attendee_name TEXT NOT NULL,
        attendee_email TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        ticket_tier_id TEXT NOT NULL,
        ticket_code TEXT UNIQUE NOT NULL,
        tier_name TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        qr_payload TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (ticket_tier_id) REFERENCES ticket_tiers(id) ON DELETE RESTRICT
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        transaction_ref TEXT UNIQUE NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'CREDIT_CARD',
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT NOT NULL,
        failure_reason TEXT,
        idempotency_key TEXT UNIQUE,
        gateway_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);
  }

  // Check if data is already seeded
  const checkUsers = await query('SELECT COUNT(*) as count FROM users');
  const userCount = parseInt(checkUsers.rows[0]?.count || 0, 10);

  if (userCount === 0) {
    console.log('[DB Init] Seeding sample data (tenants, RBAC users, events, ticket tiers)...');
    const seed = await getSeedData();

    // 1. Tenants
    for (const t of seed.tenants) {
      await query(
        `INSERT INTO tenants (id, name, slug, domain, logo_url, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.id, t.name, t.slug, t.domain, t.logo_url, t.currency]
      );
    }

    // 2. Users
    for (const u of seed.users) {
      await query(
        `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role, u.avatar_url]
      );
    }

    // 3. Events
    for (const ev of seed.events) {
      await query(
        `INSERT INTO events (id, tenant_id, title, description, category, venue, banner_url, event_date, sales_cutoff_date, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [ev.id, ev.tenant_id, ev.title, ev.description, ev.category, ev.venue, ev.banner_url, ev.event_date, ev.sales_cutoff_date, ev.status, ev.created_by]
      );
    }

    // 4. Ticket Tiers
    for (const tt of seed.ticketTiers) {
      await query(
        `INSERT INTO ticket_tiers (id, event_id, name, description, price, total_quantity, reserved_quantity, sold_quantity, max_per_order, perks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [tt.id, tt.event_id, tt.name, tt.description, tt.price, tt.total_quantity, tt.reserved_quantity, tt.sold_quantity, tt.max_per_order, tt.perks]
      );
    }

    // 5. Sample Reservation, Order, Ticket, and Transaction
    const r = seed.sampleReservation;
    await query(
      `INSERT INTO reservations (id, event_id, ticket_tier_id, user_id, session_id, quantity, unit_price, total_amount, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [r.id, r.event_id, r.ticket_tier_id, r.user_id, r.session_id, r.quantity, r.unit_price, r.total_amount, r.status, r.expires_at]
    );

    const o = seed.sampleOrder;
    await query(
      `INSERT INTO orders (id, tenant_id, event_id, user_id, reservation_id, order_number, total_amount, status, attendee_name, attendee_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [o.id, o.tenant_id, o.event_id, o.user_id, o.reservation_id, o.order_number, o.total_amount, o.status, o.attendee_name, o.attendee_email]
    );

    const tk = seed.sampleTicket;
    await query(
      `INSERT INTO order_items (id, order_id, ticket_tier_id, ticket_code, tier_name, price, status, qr_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tk.id, tk.order_id, tk.ticket_tier_id, tk.ticket_code, tk.tier_name, tk.price, tk.status, tk.qr_payload]
    );

    const tx = seed.sampleTransaction;
    await query(
      `INSERT INTO transactions (id, order_id, transaction_ref, payment_method, amount, currency, status, idempotency_key, gateway_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [tx.id, tx.order_id, tx.transaction_ref, tx.payment_method, tx.amount, tx.currency, tx.status, tx.idempotency_key, tx.gateway_response]
    );

    console.log('\x1b[32m✔ [DB Init] Database schema created & seed data successfully inserted.\x1b[0m');
  } else {
    console.log(`[DB Init] Database already initialized with ${userCount} users.`);
  }
}

// Allow standalone CLI execution: node server/db/init.js
if (process.argv[1]?.endsWith('init.js')) {
  setupDatabase().then(() => {
    console.log('Database init script finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('Database init script failed:', err);
    process.exit(1);
  });
}
