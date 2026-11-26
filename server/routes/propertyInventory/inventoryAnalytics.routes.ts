// @ts-nocheck
import express from 'express';
import AnalyticsService from '../../services/AnalyticsService.js';

const router = express.Router();

function registerAnalyticsEndpoint(path, errorLabel, fetcher) {
  router.get(path, async (req, res) => {
    try {
      const data = await fetcher(req);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error(`Error ${errorLabel}:`, error);
      res.status(500).json({ success: false, error: `Failed to ${errorLabel}` });
    }
  });
}

registerAnalyticsEndpoint('/analytics/dashboard', 'fetch analytics dashboard', () =>
  AnalyticsService.getOverallStats()
);
registerAnalyticsEndpoint('/analytics/stats', 'fetch key metrics', () =>
  AnalyticsService.getKeyMetrics()
);
registerAnalyticsEndpoint('/analytics/distribution', 'fetch property distribution', () =>
  AnalyticsService.getPropertyDistribution()
);
registerAnalyticsEndpoint('/analytics/pricing', 'fetch pricing analytics', () =>
  AnalyticsService.getPricingAnalytics()
);
registerAnalyticsEndpoint('/analytics/occupancy', 'fetch occupancy metrics', () =>
  AnalyticsService.getOccupancyMetrics()
);
registerAnalyticsEndpoint('/analytics/areas', 'fetch area analytics', () =>
  AnalyticsService.getAllAreaAnalytics()
);
registerAnalyticsEndpoint('/analytics/area/:area', 'fetch area analytics', req =>
  AnalyticsService.getAreaAnalytics(req.params.area)
);
registerAnalyticsEndpoint('/analytics/trends', 'fetch trend data', req =>
  AnalyticsService.getTrendData(req.query.startDate, req.query.endDate)
);
registerAnalyticsEndpoint('/analytics/export', 'export dashboard data', () =>
  AnalyticsService.exportDashboardData()
);

export default router;
