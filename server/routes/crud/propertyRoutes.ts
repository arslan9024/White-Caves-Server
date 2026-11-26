// @ts-nocheck
import express from 'express';
import InventoryProperty from '../../models/InventoryProperty.js';
const router = express.Router();
router.get('/properties', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      area, 
      propertyType, 
      purpose,
      minPrice,
      maxPrice,
      minRooms,
      maxRooms,
      featured,
      search
    } = req.query;
    
    const query = { isActive: true };
    
    if (status) query.status = status;
    if (area) query.area = { $regex: area, $options: 'i' };
    if (propertyType) query.propertyType = propertyType;
    if (purpose) query.purpose = purpose;
    if (featured === 'true') query.featured = true;
    if (minPrice || maxPrice) {
      query.askingPrice = {};
      if (minPrice) query.askingPrice.$gte = Number(minPrice);
      if (maxPrice) query.askingPrice.$lte = Number(maxPrice);
    }
    if (minRooms || maxRooms) {
      query.rooms = {};
      if (minRooms) query.rooms.$gte = Number(minRooms);
      if (maxRooms) query.rooms.$lte = Number(maxRooms);
    }
    if (search) {
      query.$or = [
        { area: { $regex: search, $options: 'i' } },
        { project: { $regex: search, $options: 'i' } },
        { pNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [properties, total] = await Promise.all([
      InventoryProperty.find(query)
        .sort({ featured: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      InventoryProperty.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/properties/featured', async (req, res) => {
  try {
    const properties = await InventoryProperty.find({ featured: true, isActive: true })
      .sort({ askingPrice: -1 })
      .limit(12);
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/properties/stats', async (req, res) => {
  try {
    const [byStatus, byArea, byType, total] = await Promise.all([
      InventoryProperty.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      InventoryProperty.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$area', count: { $sum: 1 }, avgPrice: { $avg: '$askingPrice' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      InventoryProperty.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } }
      ]),
      InventoryProperty.countDocuments({ isActive: true })
    ]);
    
    res.json({ success: true, data: { byStatus, byArea, byType, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/properties/:id', async (req, res) => {
  try {
    const property = await InventoryProperty.findById(req.params.id).populate('owners primaryOwner');
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    await InventoryProperty.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/properties', async (req, res) => {
  try {
    // Schema validation enforced for payload
    const property = new InventoryProperty({
      ...req.body,
      source: 'manual',
      isActive: true
    });
    await property.save();
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/properties/:id', async (req, res) => {
  try {
    const property = await InventoryProperty.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: 'system' },
      { new: true, runValidators: true }
    );
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/properties/:id', async (req, res) => {
  try {
    const property = await InventoryProperty.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
