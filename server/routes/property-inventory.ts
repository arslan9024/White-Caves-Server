// @ts-nocheck
/**
 * property-inventory.ts — Thin Express aggregator for Property Inventory sub-routers (< 350 lines, AEG-042)
 */
import express from 'express';
import inventoryDashboardRoutes from './propertyInventory/inventoryDashboard.routes.js';
import inventoryAnalyticsRoutes from './propertyInventory/inventoryAnalytics.routes.js';
import inventoryStatusRoutes from './propertyInventory/inventoryStatus.routes.js';

const router = express.Router();

router.use('/', inventoryDashboardRoutes);
router.use('/', inventoryAnalyticsRoutes);
router.use('/', inventoryStatusRoutes);

export default router;
