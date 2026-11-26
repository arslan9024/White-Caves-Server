// @ts-nocheck
import express from 'express';
import PropertyInventory from '../../models/PropertyInventory.js';
import InventoryProperty from '../../models/InventoryProperty.js';
import FilterService from '../../services/FilterService.js';

const router = express.Router();

async function queryEnrichedProperties(mongoQuery, filters, pagination, sort) {
  const properties = await InventoryProperty.find(mongoQuery)
    .populate('owners', 'name phone email')
    .populate('primaryOwner', 'name phone email')
    .sort(sort)
    .skip(pagination.skip)
    .limit(pagination.limit);

  const total = await InventoryProperty.countDocuments(mongoQuery);

  const inventoryData = await PropertyInventory.find({
    propertyId: { $in: properties.map(p => p._id) },
  }).populate('assignedAgents.agentId', 'name email');

  // O(1) hash lookup map instead of O(n) scans
  const inventoryMap = new Map();
  for (const inv of inventoryData) {
    if (inv && inv.propertyId) {
      inventoryMap.set(inv.propertyId.toString(), inv);
    }
  }

  const enrichedProperties = properties.map(prop => ({
    ...prop.toObject(),
    inventory: inventoryMap.get(prop._id.toString()) || null,
  }));

  return FilterService.buildResponse(enrichedProperties, filters, pagination, total);
}

router.get('/dashboard/areas-summary', async (req, res) => {
  try {
    const areaSummary = await InventoryProperty.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$area',
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
          rented: { $sum: { $cond: [{ $eq: ['$status', 'rented'] }, 1, 0] } },
          sold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
          reserved: { $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          availabilityRate: { $multiply: [{ $divide: ['$available', '$total'] }, 100] },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: areaSummary, count: areaSummary.length });
  } catch (error) {
    console.error('Error fetching area summary:', error);
    res.status(500).json({ error: 'Failed to fetch area summary' });
  }
});

router.get('/dashboard/properties-by-area/:area', async (req, res) => {
  try {
    const { area } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    const filters = FilterService.extractFiltersFromQuery(req.query);
    const validation = FilterService.validateFilters(filters);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameters',
        details: validation.errors,
      });
    }

    const mongoQuery = FilterService.buildMongoQuery(filters);
    mongoQuery.area = area;
    mongoQuery.isActive = true;

    const response = await queryEnrichedProperties(
      mongoQuery,
      filters,
      FilterService.getPagination(page, limit),
      FilterService.getSort(sortBy, sortOrder)
    );
    res.json(response);
  } catch (error) {
    console.error('Error fetching properties by area:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.get('/dashboard/search', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    const filters = FilterService.extractFiltersFromQuery(req.query);
    const validation = FilterService.validateFilters(filters);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameters',
        details: validation.errors,
      });
    }

    const mongoQuery = FilterService.buildMongoQuery(filters);
    mongoQuery.isActive = true;
    if (filters.areas && filters.areas.length > 0) {
      mongoQuery.area = { $in: filters.areas };
    }

    const response = await queryEnrichedProperties(
      mongoQuery,
      filters,
      FilterService.getPagination(page, limit),
      FilterService.getSort(sortBy, sortOrder)
    );
    res.json(response);
  } catch (error) {
    console.error('Error searching properties:', error);
    res.status(500).json({ error: 'Failed to search properties' });
  }
});

router.get('/dashboard/stats', async (req, res) => {
  try {
    const statusBreakdown = await InventoryProperty.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const tenancyBreakdown = await PropertyInventory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const totalProperties = await InventoryProperty.countDocuments({ isActive: true });
    const totalInventory = await PropertyInventory.countDocuments();
    const availableCount = statusBreakdown.find(s => s._id === 'available')?.count || 0;
    const rentedCount = statusBreakdown.find(s => s._id === 'rented')?.count || 0;
    const occupancyRate = ((rentedCount / totalProperties) * 100).toFixed(1);
    const availabilityRate = ((availableCount / totalProperties) * 100).toFixed(1);
    const maryVisibleCount = await PropertyInventory.countDocuments({ 'visibleTo.mary': true });

    const areaDistribution = await InventoryProperty.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$area', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const withAgentsCount = await PropertyInventory.countDocuments({
      'assignedAgents.0': { $exists: true },
    });

    res.json({
      success: true,
      data: {
        totalProperties,
        totalInventory,
        maryVisibleCount,
        availabilityRate: parseFloat(availabilityRate),
        occupancyRate: parseFloat(occupancyRate),
        statusBreakdown,
        tenancyBreakdown,
        areaDistribution,
        agentAssignmentCount: withAgentsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
