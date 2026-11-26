// @ts-nocheck
import express from 'express';
import Employee from '../../models/Employee.js';
import Lead from '../../models/Lead.js';
import InventoryProperty from '../../models/InventoryProperty.js';
import TenancyDeal from '../../models/TenancyDeal.js';
import SalesDeal from '../../models/SalesDeal.js';
import Service from '../../models/Service.js';
const router = express.Router();
router.get('/employees', async (req, res) => {
  try {
    const { page = 1, limit = 50, department, level, status, search } = req.query;
    
    const query = {};
    if (department) query.department = department;
    if (level) query.level = level;
    if (status) query['employment.status'] = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [employees, total] = await Promise.all([
      Employee.find(query).populate('department').sort({ order: 1, name: 1 }).skip(skip).limit(Number(limit)),
      Employee.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: employees,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/employees/stats', async (req, res) => {
  try {
    const [byDepartment, byLevel, total] = await Promise.all([
      Employee.aggregate([
        { $match: { 'employment.status': 'active' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      Employee.aggregate([
        { $match: { 'employment.status': 'active' } },
        { $group: { _id: '$level', count: { $sum: 1 } } }
      ]),
      Employee.countDocuments({ 'employment.status': 'active' })
    ]);
    
    res.json({ success: true, data: { byDepartment, byLevel, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('department reportsTo');
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const employee = new Employee(req.body);
    await employee.save();
    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { 'employment.status': 'terminated', 'employment.terminationDate': new Date() },
      { new: true }
    );
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, message: 'Employee terminated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/services', async (req, res) => {
  try {
    const { category, status } = req.query;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    
    const services = await Service.find(query).populate('department aiAssistant').sort({ category: 1, name: 1 });
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('department aiAssistant');
    if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dashboard/overview', async (req, res) => {
  try {
    const [
      totalProperties,
      availableProperties,
      totalLeads,
      hotLeads,
      totalUsers,
      activeTenancies,
      activeSales,
      totalEmployees
    ] = await Promise.all([
      InventoryProperty.countDocuments({ isActive: true }),
      InventoryProperty.countDocuments({ isActive: true, status: 'available' }),
      Lead.countDocuments({ isActive: true }),
      Lead.countDocuments({ isActive: true, score: { $gte: 80 } }),
      User.countDocuments({ isActive: true }),
      TenancyDeal.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      SalesDeal.countDocuments({ status: { $nin: ['completed', 'cancelled'] } }),
      Employee.countDocuments({ 'employment.status': 'active' })
    ]);
    
    const propertyValue = await InventoryProperty.aggregate([
      { $match: { isActive: true, status: 'available' } },
      { $group: { _id: null, total: { $sum: '$askingPrice' } } }
    ]);
    
    const recentLeads = await Lead.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email status score source createdAt');
    
    const recentProperties = await InventoryProperty.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('pNumber area project propertyType status askingPrice');
    
    res.json({
      success: true,
      data: {
        stats: {
          totalProperties,
          availableProperties,
          totalLeads,
          hotLeads,
          totalUsers,
          activeTenancies,
          activeSales,
          totalEmployees,
          portfolioValue: propertyValue[0]?.total || 0
        },
        recentLeads,
        recentProperties
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
