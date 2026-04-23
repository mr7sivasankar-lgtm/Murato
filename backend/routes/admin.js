const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ad = require('../models/Ad');
const Shop = require('../models/Shop');
const Chat = require('../models/Chat');
const { adminProtect } = require('../middleware/auth');

// @GET /api/admin/stats
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const [users, ads, shops, chats, flaggedAds, pendingShops] = await Promise.all([
      User.countDocuments(),
      Ad.countDocuments({ status: 'active' }),
      Shop.countDocuments({ status: 'approved' }),
      Chat.countDocuments(),
      Ad.countDocuments({ isFlagged: true }),
      Shop.countDocuments({ status: 'pending' }),
    ]);
    res.json({ users, ads, shops, chats, flaggedAds, pendingShops });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== USERS =====================

// @GET /api/admin/users
router.get('/users', adminProtect, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { phone: new RegExp(q, 'i') }];

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ users, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/admin/users/:id/ban
router.put('/users/:id/ban', adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: req.body.isBanned },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/admin/users/:id
router.delete('/users/:id', adminProtect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== ADS =====================

// @GET /api/admin/ads
router.get('/ads', adminProtect, async (req, res) => {
  try {
    const { q, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Ad.countDocuments(filter);
    const ads = await Ad.find(filter)
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ ads, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/admin/ads/:id/status
router.put('/ads/:id/status', adminProtect, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, isFeatured: req.body.isFeatured },
      { new: true }
    );
    res.json(ad);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/admin/ads/:id
router.delete('/ads/:id', adminProtect, async (req, res) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ad deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/admin/ads/flagged
router.get('/ads/flagged', adminProtect, async (req, res) => {
  try {
    const ads = await Ad.find({ isFlagged: true })
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 });
    res.json(ads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== SHOPS =====================

// @GET /api/admin/shops
router.get('/shops', adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Shop.countDocuments(filter);
    const shops = await Shop.find(filter)
      .populate('ownerId', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ shops, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/admin/shops/:id/status
router.put('/shops/:id/status', adminProtect, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/admin/shops/:id
router.delete('/shops/:id', adminProtect, async (req, res) => {
  try {
    await Shop.findByIdAndDelete(req.params.id);
    res.json({ message: 'Shop deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
