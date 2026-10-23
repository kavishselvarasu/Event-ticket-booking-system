import { getRedis, getRedisMode } from '../config/redis.js';
import { query } from '../config/db.js';

const EVENT_CACHE_TTL = 60; // 60 seconds TTL

export const cacheService = {
  /**
   * Retrieves active event details with ticket tiers from Redis cache or DB
   */
  async getEvent(eventId) {
    const redis = getRedis();
    const cacheKey = `event:${eventId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...parsed, _source: `cache (${getRedisMode()})` };
      }
    } catch (err) {
      console.warn(`[CACHE] Read error for key ${cacheKey}:`, err.message);
    }

    // Cache miss - load fresh from database
    const eventRes = await query(
      `SELECT e.*, t.name as tenant_name, t.slug as tenant_slug, t.currency
       FROM events e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE e.id = $1`,
      [eventId]
    );

    if (eventRes.rows.length === 0) {
      return null;
    }

    const event = eventRes.rows[0];

    // Load ticket tiers
    const tiersRes = await query(
      `SELECT id, name, description, price, total_quantity, reserved_quantity, sold_quantity, max_per_order, perks,
              (total_quantity - (reserved_quantity + sold_quantity)) as available_quantity
       FROM ticket_tiers
       WHERE event_id = $1
       ORDER BY price DESC`,
      [eventId]
    );

    event.ticket_tiers = tiersRes.rows.map(tier => ({
      ...tier,
      price: parseFloat(tier.price),
      available_quantity: Math.max(0, parseInt(tier.available_quantity, 10))
    }));

    // Save to Redis cache
    try {
      const redis = getRedis();
      await redis.setex(cacheKey, EVENT_CACHE_TTL, JSON.stringify(event));
    } catch (err) {
      console.warn(`[CACHE] Write error for key ${cacheKey}:`, err.message);
    }

    return { ...event, _source: 'database (cache updated)' };
  },

  /**
   * Invalidates cached event when holds or updates occur
   */
  async invalidateEvent(eventId) {
    const redis = getRedis();
    const cacheKey = `event:${eventId}`;
    try {
      await redis.del(cacheKey);
      // Invalidate general event list caches
      const keys = await redis.keys('events_list:*');
      for (const k of keys) {
        await redis.del(k);
      }
    } catch (err) {
      console.warn(`[CACHE] Invalidate error for ${cacheKey}:`, err.message);
    }
  },

  /**
   * Retrieves list of published events with cache
   */
  async getEventsList(tenantId = null) {
    const redis = getRedis();
    const cacheKey = `events_list:${tenantId || 'all'}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return { data: JSON.parse(cached), _source: `cache (${getRedisMode()})` };
      }
    } catch (err) {
      console.warn(`[CACHE] Read error for ${cacheKey}:`, err.message);
    }

    let sql = `
      SELECT e.*, t.name as tenant_name, t.slug as tenant_slug, t.currency,
             COUNT(tt.id) as tier_count,
             MIN(tt.price) as min_price,
             MAX(tt.price) as max_price,
             SUM(tt.total_quantity - (tt.reserved_quantity + tt.sold_quantity)) as total_available_seats
      FROM events e
      JOIN tenants t ON e.tenant_id = t.id
      LEFT JOIN ticket_tiers tt ON e.id = tt.event_id
    `;
    const params = [];

    if (tenantId) {
      sql += ' WHERE e.tenant_id = $1 AND e.status = $2';
      params.push(tenantId, 'PUBLISHED');
    } else {
      sql += ' WHERE e.status = $1';
      params.push('PUBLISHED');
    }

    sql += ' GROUP BY e.id, t.name, t.slug, t.currency ORDER BY e.event_date ASC';

    const res = await query(sql, params);

    const formatted = res.rows.map(r => ({
      ...r,
      min_price: r.min_price ? parseFloat(r.min_price) : 0,
      max_price: r.max_price ? parseFloat(r.max_price) : 0,
      total_available_seats: r.total_available_seats ? Math.max(0, parseInt(r.total_available_seats, 10)) : 0
    }));

    try {
      const redis = getRedis();
      await redis.setex(cacheKey, 30, JSON.stringify(formatted)); // 30 sec cache
    } catch (err) {
      console.warn(`[CACHE] Write error for ${cacheKey}:`, err.message);
    }

    return { data: formatted, _source: 'database (cache updated)' };
  }
};
