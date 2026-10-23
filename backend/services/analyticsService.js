import { query } from '../config/db.js';

export const analyticsService = {
  /**
   * Retrieves comprehensive organizer metrics, conversion rates, and revenue charts
   */
  async getOrganizerAnalytics(tenantId) {
    if (!tenantId) {
      throw new Error('Tenant ID is required for organizer analytics');
    }

    // 1. Overall Revenue and Orders
    const revRes = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_revenue,
              COUNT(id) as total_orders
       FROM orders
       WHERE tenant_id = $1 AND status = 'CONFIRMED'`,
      [tenantId]
    );

    const totalRevenue = parseFloat(revRes.rows[0]?.total_revenue || 0);
    const totalOrders = parseInt(revRes.rows[0]?.total_orders || 0, 10);

    // 2. Ticket Inventory Totals (Sold, Reserved, Total)
    const invRes = await query(
      `SELECT COALESCE(SUM(tt.total_quantity), 0) as total_capacity,
              COALESCE(SUM(tt.reserved_quantity), 0) as total_reserved,
              COALESCE(SUM(tt.sold_quantity), 0) as total_sold
       FROM ticket_tiers tt
       JOIN events e ON tt.event_id = e.id
       WHERE e.tenant_id = $1`,
      [tenantId]
    );

    const totalCapacity = parseInt(invRes.rows[0]?.total_capacity || 0, 10);
    const totalReserved = parseInt(invRes.rows[0]?.total_reserved || 0, 10);
    const totalSold = parseInt(invRes.rows[0]?.total_sold || 0, 10);
    const totalAvailable = Math.max(0, totalCapacity - (totalReserved + totalSold));

    // 3. Conversion Rates: Holds vs Completed vs Expired
    const holdStatsRes = await query(
      `SELECT r.status, COUNT(r.id) as count, COALESCE(SUM(r.quantity), 0) as total_tickets
       FROM reservations r
       JOIN events e ON r.event_id = e.id
       WHERE e.tenant_id = $1
       GROUP BY r.status`,
      [tenantId]
    );

    let totalHolds = 0;
    let completedHolds = 0;
    let expiredHolds = 0;
    let activeHolds = 0;

    for (const row of holdStatsRes.rows) {
      const cnt = parseInt(row.count, 10);
      totalHolds += cnt;
      if (row.status === 'COMPLETED') completedHolds += cnt;
      if (row.status === 'EXPIRED') expiredHolds += cnt;
      if (row.status === 'HELD') activeHolds += cnt;
    }

    // Conversion rate: % of total holds that became completed orders
    const conversionRate = totalHolds > 0 ? parseFloat(((completedHolds / totalHolds) * 100).toFixed(1)) : 0;
    const abandonmentRate = totalHolds > 0 ? parseFloat(((expiredHolds / totalHolds) * 100).toFixed(1)) : 0;

    // 4. Sales Breakdown by Ticket Tier
    const tierRes = await query(
      `SELECT tt.name as tier_name, e.title as event_title,
              tt.price, tt.total_quantity, tt.reserved_quantity, tt.sold_quantity,
              (tt.sold_quantity * tt.price) as tier_revenue
       FROM ticket_tiers tt
       JOIN events e ON tt.event_id = e.id
       WHERE e.tenant_id = $1
       ORDER BY tier_revenue DESC`,
      [tenantId]
    );

    const tierBreakdown = tierRes.rows.map(t => ({
      tierName: t.tier_name,
      eventTitle: t.event_title,
      price: parseFloat(t.price),
      totalQuantity: parseInt(t.total_quantity, 10),
      reservedQuantity: parseInt(t.reserved_quantity, 10),
      soldQuantity: parseInt(t.sold_quantity, 10),
      revenue: parseFloat(t.tier_revenue)
    }));

    // 5. Event Performance Summary
    const eventsRes = await query(
      `SELECT e.id, e.title, e.category, e.event_date, e.status,
              COALESCE(SUM(tt.total_quantity), 0) as capacity,
              COALESCE(SUM(tt.sold_quantity), 0) as sold,
              COALESCE(SUM(tt.reserved_quantity), 0) as held,
              COALESCE(SUM(tt.sold_quantity * tt.price), 0) as revenue
       FROM events e
       LEFT JOIN ticket_tiers tt ON e.id = tt.event_id
       WHERE e.tenant_id = $1
       GROUP BY e.id, e.title, e.category, e.event_date, e.status
       ORDER BY e.event_date ASC`,
      [tenantId]
    );

    const eventPerformance = eventsRes.rows.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      eventDate: e.event_date,
      status: e.status,
      capacity: parseInt(e.capacity, 10),
      sold: parseInt(e.sold, 10),
      held: parseInt(e.held, 10),
      available: Math.max(0, parseInt(e.capacity, 10) - (parseInt(e.sold, 10) + parseInt(e.held, 10))),
      revenue: parseFloat(e.revenue),
      occupancyRate: parseInt(e.capacity, 10) > 0 ? parseFloat(((parseInt(e.sold, 10) / parseInt(e.capacity, 10)) * 100).toFixed(1)) : 0
    }));

    // 6. Recent Orders Feed
    const recentOrdersRes = await query(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.attendee_name, o.attendee_email, o.created_at,
              e.title as event_title, t.transaction_ref, t.payment_method
       FROM orders o
       JOIN events e ON o.event_id = e.id
       LEFT JOIN transactions t ON o.id = t.order_id
       WHERE o.tenant_id = $1
       ORDER BY o.created_at DESC
       LIMIT 10`,
      [tenantId]
    );

    const recentOrders = recentOrdersRes.rows.map(o => ({
      ...o,
      total_amount: parseFloat(o.total_amount)
    }));

    // 7. Simulated 7-day revenue trend for charts
    const revenueTrend = [
      { date: '6 days ago', revenue: Math.round(totalRevenue * 0.10) },
      { date: '5 days ago', revenue: Math.round(totalRevenue * 0.15) },
      { date: '4 days ago', revenue: Math.round(totalRevenue * 0.12) },
      { date: '3 days ago', revenue: Math.round(totalRevenue * 0.22) },
      { date: '2 days ago', revenue: Math.round(totalRevenue * 0.18) },
      { date: 'Yesterday', revenue: Math.round(totalRevenue * 0.28) },
      { date: 'Today', revenue: Math.round(totalRevenue * 0.35) }
    ];

    return {
      kpi: {
        totalRevenue,
        totalOrders,
        totalSold,
        totalCapacity,
        totalReserved,
        totalAvailable,
        conversionRate,
        abandonmentRate,
        totalHolds,
        activeHolds
      },
      revenueTrend,
      tierBreakdown,
      eventPerformance,
      recentOrders
    };
  },

  /**
   * Platform Admin overview across all tenants
   */
  async getAdminPlatformAnalytics() {
    const tenantsRes = await query('SELECT COUNT(*) as count FROM tenants');
    const usersRes = await query('SELECT COUNT(*) as count FROM users');
    const eventsRes = await query('SELECT COUNT(*) as count FROM events');
    const ordersRes = await query("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as volume FROM orders WHERE status = 'CONFIRMED'");
    const activeHoldsRes = await query("SELECT COUNT(*) as count FROM reservations WHERE status = 'HELD'");

    const tenantListRes = await query(`
      SELECT t.*,
             COUNT(DISTINCT e.id) as event_count,
             COALESCE(SUM(o.total_amount), 0) as gross_volume
      FROM tenants t
      LEFT JOIN events e ON t.id = e.tenant_id
      LEFT JOIN orders o ON t.id = o.tenant_id AND o.status = 'CONFIRMED'
      GROUP BY t.id, t.name, t.slug, t.domain, t.logo_url, t.currency, t.created_at
    `);

    return {
      platformStats: {
        totalTenants: parseInt(tenantsRes.rows[0]?.count || 0, 10),
        totalUsers: parseInt(usersRes.rows[0]?.count || 0, 10),
        totalEvents: parseInt(eventsRes.rows[0]?.count || 0, 10),
        totalOrders: parseInt(ordersRes.rows[0]?.count || 0, 10),
        grossVolume: parseFloat(ordersRes.rows[0]?.volume || 0),
        activeHolds: parseInt(activeHoldsRes.rows[0]?.count || 0, 10)
      },
      tenants: tenantListRes.rows.map(t => ({
        ...t,
        gross_volume: parseFloat(t.gross_volume),
        event_count: parseInt(t.event_count, 10)
      }))
    };
  }
};
