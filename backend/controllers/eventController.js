import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/db.js';
import { cacheService } from '../services/cacheService.js';

export const eventController = {
  /**
   * List all published events (optionally filtered by tenant)
   */
  async getEvents(req, res) {
    try {
      const tenantId = req.tenant?.id || req.query.tenantId || null;
      const result = await cacheService.getEventsList(tenantId);
      return res.json(result);
    } catch (error) {
      console.error('getEvents error:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  },

  /**
   * Get single event by ID with active ticket tiers & capacity (Cached in Redis)
   */
  async getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = await cacheService.getEvent(id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.json({ data: event });
    } catch (error) {
      console.error('getEventById error:', error);
      return res.status(500).json({ error: 'Failed to fetch event details' });
    }
  },

  /**
   * Create new event with ticket tiers (Organizer or Admin)
   */
  async createEvent(req, res) {
    try {
      const {
        title,
        description,
        category = 'General',
        venue,
        bannerUrl,
        eventDate,
        salesCutoffDate,
        ticketTiers = []
      } = req.body;

      if (!title || !venue || !eventDate || !salesCutoffDate) {
        return res.status(400).json({ error: 'Title, venue, eventDate, and salesCutoffDate are required' });
      }

      // Determine tenant
      const tenantId = req.user.role === 'admin'
        ? (req.body.tenantId || req.tenant?.id || 'tenant-apex')
        : (req.user.tenant_id || req.tenant?.id);

      if (!tenantId) {
        return res.status(400).json({ error: 'A valid tenant must be associated with the event' });
      }

      const eventId = `event-${uuidv4().substring(0, 8)}`;
      const defaultBanner = bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80';

      await transaction(async ({ query: txQuery }) => {
        // 1. Insert Event
        await txQuery(
          `INSERT INTO events (id, tenant_id, title, description, category, venue, banner_url, event_date, sales_cutoff_date, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [eventId, tenantId, title, description, category, venue, defaultBanner, eventDate, salesCutoffDate, 'PUBLISHED', req.user.id]
        );

        // 2. Insert Ticket Tiers
        for (const tier of ticketTiers) {
          const tierId = `tier-${uuidv4().substring(0, 8)}`;
          await txQuery(
            `INSERT INTO ticket_tiers (id, event_id, name, description, price, total_quantity, reserved_quantity, sold_quantity, max_per_order, perks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              tierId,
              eventId,
              tier.name || 'General Admission',
              tier.description || '',
              parseFloat(tier.price) || 0,
              parseInt(tier.totalQuantity || 100, 10),
              0,
              0,
              parseInt(tier.maxPerOrder || 4, 10),
              tier.perks || ''
            ]
          );
        }
      });

      // Clear list caches
      await cacheService.invalidateEvent(eventId);

      const createdEvent = await cacheService.getEvent(eventId);
      return res.status(201).json({
        message: 'Event created successfully',
        data: createdEvent
      });
    } catch (error) {
      console.error('createEvent error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create event' });
    }
  },

  /**
   * List all tenants
   */
  async getTenants(req, res) {
    try {
      const result = await query('SELECT * FROM tenants ORDER BY name ASC');
      return res.json({ data: result.rows });
    } catch (error) {
      console.error('getTenants error:', error);
      return res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }
};
