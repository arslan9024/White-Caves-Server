// @ts-nocheck
import express from 'express';
import User from '../../models/User.js';
import Lead from '../../models/Lead.js';
const router = express.Router();
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, kycStatus, search } = req.query;
    
    const query = { isActive: true };
    if (role) query.role = role;
    if (kycStatus) query.kycStatus = kycStatus;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/users/stats', async (req, res) => {
  try {
    const roleStats = await User.getRoleStats();
    const kycStats = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$kycStatus', count: { $sum: 1 } } }
    ]);
    const total = await User.countDocuments({ isActive: true });
    
    res.json({ success: true, data: { roleStats, kycStats, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leads', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, source, stage, minScore, search } = req.query;
    
    const query = { isActive: true };
    if (status) query.status = status;
    if (source) query.source = source;
    if (stage) query.stage = stage;
    if (minScore) query.score = { $gte: Number(minScore) };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ score: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
      Lead.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: leads,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leads/stats', async (req, res) => {
  try {
    const [byStatus, bySource, byStage, avgScore, total] = await Promise.all([
      Lead.getLeadsByStatus(),
      Lead.getLeadsBySource(),
      Lead.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$stage', count: { $sum: 1 } } }
      ]),
      Lead.getAverageScore(),
      Lead.countDocuments({ isActive: true })
    ]);
    
    const conversionRate = await Lead.getConversionRate();
    
    res.json({ success: true, data: { byStatus, bySource, byStage, avgScore: avgScore[0]?.avgScore || 0, conversionRate, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('propertyInterest');
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/leads', async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/leads/:id/interaction', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    
    lead.interactions.push({
      ...req.body,
      date: new Date()
    });
    lead.lastContactDate = new Date();
    await lead.save();
    
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
