import { analyticsService } from '../services/analyticsService.js';

export const analyticsController = {
  /**
   * Organizer Dashboard Analytics (real-time revenue, conversion rates, tier breakdowns)
   */
  async getOrganizerAnalytics(req, res) {
    try {
      const tenantId = req.tenant?.id || req.user?.tenant_id || req.query.tenantId || 'tenant-apex';
      const data = await analyticsService.getOrganizerAnalytics(tenantId);
      return res.json({ data });
    } catch (error) {
      console.error('getOrganizerAnalytics error:', error);
      return res.status(500).json({ error: 'Failed to generate analytics', message: error.message });
    }
  },

  /**
   * Super Admin platform overview
   */
  async getAdminPlatformAnalytics(req, res) {
    try {
      const data = await analyticsService.getAdminPlatformAnalytics();
      return res.json({ data });
    } catch (error) {
      console.error('getAdminPlatformAnalytics error:', error);
      return res.status(500).json({ error: 'Failed to generate admin analytics', message: error.message });
    }
  }
};
