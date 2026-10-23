import bcrypt from 'bcryptjs';

export async function getSeedData() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const now = new Date();
  const futureDays = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const pastHours = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

  const tenants = [
    {
      id: 'tenant-apex',
      name: 'Royal Grand Carnivals & Luxury Galas',
      slug: 'royal-carnivals',
      domain: 'royalcarnivals.in',
      logo_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
      currency: 'INR'
    },
    {
      id: 'tenant-soundwave',
      name: 'Euphoria Live Festivals & Party Nights',
      slug: 'euphoria-parties',
      domain: 'euphoriaparties.in',
      logo_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=80',
      currency: 'INR'
    }
  ];

  const users = [
    {
      id: 'user-admin-1',
      tenant_id: null,
      email: 'admin@eventsystem.com',
      password_hash: passwordHash,
      full_name: 'Alex Mercer (Platform Admin)',
      role: 'admin',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'user-org-apex',
      tenant_id: 'tenant-apex',
      email: 'organizer@royalcarnivals.in',
      password_hash: passwordHash,
      full_name: 'Elena Rostova (Royal Carnival Producer)',
      role: 'organizer',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'user-org-soundwave',
      tenant_id: 'tenant-soundwave',
      email: 'organizer@euphoriaparties.in',
      password_hash: passwordHash,
      full_name: 'Marcus Chen (Euphoria Event Director)',
      role: 'organizer',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    },
    {
      id: 'user-attendee-1',
      tenant_id: null,
      email: 'attendee@gmail.com',
      password_hash: passwordHash,
      full_name: 'Jordan Lee (Attendee)',
      role: 'attendee',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const events = [
    {
      id: 'event-royal-carnival',
      tenant_id: 'tenant-apex',
      title: 'The Grand Royal Carnival & Masquerade 2026',
      description: 'An enchanting evening of golden masquerade balls, royal carnival performances, artisan wine tastings, live orchestral brass bands, and dazzling fireworks under the starlit sky.',
      category: 'Carnival & Gala',
      venue: 'Palace Grounds & Grand Ballroom, Bengaluru',
      banner_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
      event_date: futureDays(14),
      sales_cutoff_date: futureDays(12),
      status: 'PUBLISHED',
      created_by: 'user-org-apex'
    },
    {
      id: 'event-golden-coast',
      tenant_id: 'tenant-soundwave',
      title: 'Golden Sunset Beach Party & DJ Carnival',
      description: 'The ultimate coastal party experience featuring world-famous headlining DJs, tropical tiki lounges, golden fire dancers, laser projections over the ocean waves, and non-stop music.',
      category: 'Beach Carnival',
      venue: 'Vagator Beachfront Arena, North Goa',
      banner_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
      event_date: futureDays(21),
      sales_cutoff_date: futureDays(19),
      status: 'PUBLISHED',
      created_by: 'user-org-soundwave'
    },
    {
      id: 'event-imperial-gala',
      tenant_id: 'tenant-apex',
      title: 'Imperial Golden Gala & Bollywood Musical Extravaganza',
      description: 'A lavish celebration of rhythm, dance, and cinema featuring high-energy live celebrity acts, royal culinary feasts, champagne lounges, and an electrifying dance floor.',
      category: 'Bollywood Gala',
      venue: 'The Grand Hyatt Crystal Ballroom, Mumbai',
      banner_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
      event_date: futureDays(28),
      sales_cutoff_date: futureDays(27),
      status: 'PUBLISHED',
      created_by: 'user-org-apex'
    },
    {
      id: 'event-midnight-carnival',
      tenant_id: 'tenant-soundwave',
      title: 'Midnight Mirage Electronic Carnival & Light Show',
      description: 'An immersive sensory wonderland featuring 360-degree LED visual art domes, carnival acrobats, artisan cocktail bars, and international EDM beats rocking through the night.',
      category: 'Nightlife & Carnival',
      venue: 'Cyber Hub Open Arena, Gurugram',
      banner_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80',
      event_date: futureDays(9),
      sales_cutoff_date: futureDays(8),
      status: 'PUBLISHED',
      created_by: 'user-org-soundwave'
    }
  ];

  const ticketTiers = [
    // Royal Carnival Tiers (INR Rupees)
    {
      id: 'tier-royal-vip',
      event_id: 'event-royal-carnival',
      name: 'Royal Golden VIP Table Pass',
      description: 'Private reserved golden lounge table, complimentary champagne bottle, chef culinary appetizers, and red carpet priority entry.',
      price: 9999.00,
      total_quantity: 40,
      reserved_quantity: 2,
      sold_quantity: 18,
      max_per_order: 4,
      perks: 'Reserved Gold Table, Champagne Bottle, Chef Canapés, VIP Priority Entry'
    },
    {
      id: 'tier-royal-allaccess',
      event_id: 'event-royal-carnival',
      name: 'Golden Circle All-Access Pass',
      description: 'Full carnival entry, golden stage viewing area, masquerade mask pack, and 2 premium craft beverages.',
      price: 4999.00,
      total_quantity: 150,
      reserved_quantity: 4,
      sold_quantity: 82,
      max_per_order: 6,
      perks: 'Golden Stage Circle, Masquerade Pack, 2 Premium Drinks'
    },
    {
      id: 'tier-royal-general',
      event_id: 'event-royal-carnival',
      name: 'Carnival General Entry Pass',
      description: 'Full festival floor access, carnival games arena, live fireworks viewing, and food festival lane.',
      price: 1999.00,
      total_quantity: 250,
      reserved_quantity: 0,
      sold_quantity: 120,
      max_per_order: 6,
      perks: 'Carnival Arena, Fireworks Viewing, Food Lane Access'
    },

    // Golden Coast Beach Carnival Tiers
    {
      id: 'tier-coast-vip',
      event_id: 'event-golden-coast',
      name: 'VIP Sunset Cabana Pass',
      description: 'Beachfront luxury cabana, dedicated mixologist, fruit platter, express festival entry, and sunset viewing deck.',
      price: 7999.00,
      total_quantity: 30,
      reserved_quantity: 3,
      sold_quantity: 12,
      max_per_order: 4,
      perks: 'Beachfront Cabana, Dedicated Bartender, Express Entry, Sunset Deck'
    },
    {
      id: 'tier-coast-gold',
      event_id: 'event-golden-coast',
      name: 'Gold Party Stage Pass',
      description: 'Mainstage golden arena access, beach party merchandise kit, and welcome tropical cooler.',
      price: 3499.00,
      total_quantity: 300,
      reserved_quantity: 8,
      sold_quantity: 145,
      max_per_order: 8,
      perks: 'Mainstage Gold Area, Beach Merch Kit, Welcome Drink'
    },
    {
      id: 'tier-coast-early',
      event_id: 'event-golden-coast',
      name: 'Early Bird Party Pass',
      description: 'Discounted party pass for early carnival arrivals.',
      price: 1499.00,
      total_quantity: 100,
      reserved_quantity: 0,
      sold_quantity: 100, // Sold Out
      max_per_order: 4,
      perks: 'General Beach Entry'
    },

    // Imperial Bollywood Gala Tiers
    {
      id: 'tier-imperial-vip',
      event_id: 'event-imperial-gala',
      name: 'Emperor Royal Table (Table of 2)',
      description: 'Front-row royal banquet table, five-course royal dinner, luxury gift hamper, and personal attendant.',
      price: 11999.00,
      total_quantity: 25,
      reserved_quantity: 1,
      sold_quantity: 14,
      max_per_order: 2,
      perks: 'Front Row Royal Table, 5-Course Dinner, Luxury Hamper'
    },
    {
      id: 'tier-imperial-gold',
      event_id: 'event-imperial-gala',
      name: 'Gold Gala Pass',
      description: 'Cocktail lounge access, dance floor admission, and royal dinner buffet.',
      price: 3999.00,
      total_quantity: 150,
      reserved_quantity: 0,
      sold_quantity: 75,
      max_per_order: 6,
      perks: 'Cocktail Lounge, Dance Floor, Royal Buffet'
    },

    // Midnight Mirage Electronic Carnival Tiers
    {
      id: 'tier-mirage-vip',
      event_id: 'event-midnight-carnival',
      name: 'VIP Skybox Lounge Pass',
      description: 'Elevated golden balcony viewing, private bar, signature molecular cocktails, and express festival entrance.',
      price: 6999.00,
      total_quantity: 20,
      reserved_quantity: 1,
      sold_quantity: 8,
      max_per_order: 4,
      perks: 'Skybox Balcony, Private Bar, Molecular Drinks, Express Entry'
    },
    {
      id: 'tier-mirage-general',
      event_id: 'event-midnight-carnival',
      name: 'Carnival Arena Pass',
      description: 'Admission to the main carnival arena, laser dome, and interactive light installations.',
      price: 1299.00,
      total_quantity: 300,
      reserved_quantity: 5,
      sold_quantity: 180,
      max_per_order: 6,
      perks: 'Arena Admission, Laser Dome, Interactive Art'
    }
  ];

  // Sample Completed Order and Reservation
  const sampleOrderId = 'ord-seed-001';
  const sampleResId = 'res-seed-001';

  const sampleReservation = {
    id: sampleResId,
    event_id: 'event-royal-carnival',
    ticket_tier_id: 'tier-royal-vip',
    user_id: 'user-attendee-1',
    session_id: 'sess-seed-completed',
    quantity: 1,
    unit_price: 9999.00,
    total_amount: 9999.00,
    status: 'COMPLETED',
    expires_at: pastHours(2),
    created_at: pastHours(3)
  };

  const sampleOrder = {
    id: sampleOrderId,
    tenant_id: 'tenant-apex',
    event_id: 'event-royal-carnival',
    user_id: 'user-attendee-1',
    reservation_id: sampleResId,
    order_number: 'ORD-2026-98214',
    total_amount: 9999.00,
    status: 'CONFIRMED',
    attendee_name: 'Jordan Lee',
    attendee_email: 'attendee@gmail.com',
    created_at: pastHours(3)
  };

  const sampleTicket = {
    id: 'tkt-seed-001',
    order_id: sampleOrderId,
    ticket_tier_id: 'tier-royal-vip',
    ticket_code: 'TKT-VIP-2026-8912',
    tier_name: 'Royal Golden VIP Table Pass',
    price: 9999.00,
    status: 'ACTIVE',
    qr_payload: 'https://royalcarnivals.in/verify/TKT-VIP-2026-8912'
  };

  const sampleTransaction = {
    id: 'txn-seed-001',
    order_id: sampleOrderId,
    transaction_ref: 'TXN-MOCK-89124-SUCCESS',
    payment_method: 'CREDIT_CARD',
    amount: 9999.00,
    currency: 'INR',
    status: 'SUCCEEDED',
    idempotency_key: 'idem-seed-001',
    gateway_response: JSON.stringify({ status: 'approved', authCode: 'AUTH-99321', method: 'VISA-4242' }),
    created_at: pastHours(3)
  };

  return {
    tenants,
    users,
    events,
    ticketTiers,
    sampleReservation,
    sampleOrder,
    sampleTicket,
    sampleTransaction
  };
}
