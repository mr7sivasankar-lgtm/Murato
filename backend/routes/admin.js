const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Ad = require('../models/Ad');
const Shop = require('../models/Shop');
const Chat = require('../models/Chat');
const Banner = require('../models/Banner');
const LocationService = require('../models/LocationService');
const DeletedRecord = require('../models/DeletedRecord');
const { adminProtect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

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
    const filter = { phone: { $ne: 'admin-internal' } };
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

// @GET /api/admin/users/:id/details
router.get('/users/:id/details', adminProtect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const ads = await Ad.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json({ user, ads });
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

// @DELETE /api/admin/users/:id — logs to history before deleting
router.delete('/users/:id', adminProtect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await DeletedRecord.create({
        type:     'user',
        recordId: user._id.toString(),
        name:     user.name,
        phone:    user.phone,
        city:     user.location?.city || '',
      });
      await Ad.deleteMany({ userId: user._id });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== LOCATIONS =====================

// @GET /api/admin/locations — users grouped by city with service status
router.get('/locations', adminProtect, async (req, res) => {
  try {
    // Group users WITH a city set
    const cityGroups = await User.aggregate([
      { $match: { phone: { $ne: 'admin-internal' }, 'location.city': { $ne: '' } } },
      {
        $group: {
          _id: '$location.city',
          userCount:   { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$isBanned', false] }, 1, 0] } },
          bannedCount: { $sum: { $cond: [{ $eq: ['$isBanned', true]  }, 1, 0] } },
        }
      },
      { $sort: { userCount: -1 } }
    ]);

    // Count users WITHOUT any location
    const noLocationCount = await User.countDocuments({
      phone: { $ne: 'admin-internal' },
      $or: [{ 'location.city': '' }, { 'location.city': { $exists: false } }],
    });

    const services = await LocationService.find();
    const serviceMap = {};
    services.forEach(s => { serviceMap[s.city] = s; });

    const result = cityGroups.map(g => ({
      city:            g._id,
      userCount:       g.userCount,
      activeCount:     g.activeCount,
      bannedCount:     g.bannedCount,
      isServiceActive: serviceMap[g._id]?.isActive ?? true,
      reason:          serviceMap[g._id]?.reason    || '',
      toggledAt:       serviceMap[g._id]?.toggledAt || null,
      noLocation:      false,
    }));

    // Append the "no location" virtual group at the end if any
    if (noLocationCount > 0) {
      result.push({
        city:            '__no_location__',
        userCount:       noLocationCount,
        activeCount:     noLocationCount,
        bannedCount:     0,
        isServiceActive: true,
        reason:          '',
        toggledAt:       null,
        noLocation:      true,
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/admin/locations/toggle — activate/deactivate service for a city
router.put('/locations/toggle', adminProtect, async (req, res) => {
  try {
    const { city, isActive, reason } = req.body;
    if (!city) return res.status(400).json({ message: 'City is required' });

    const service = await LocationService.findOneAndUpdate(
      { city },
      { isActive, reason: reason || '', toggledAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== HISTORY =====================

// @GET /api/admin/history — paginated deleted records
router.get('/history', adminProtect, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type && type !== 'all') filter.type = type;

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await DeletedRecord.countDocuments(filter);
    const records = await DeletedRecord.find(filter)
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ records, total });
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

// @DELETE /api/admin/ads/:id — logs to history before deleting
router.delete('/ads/:id', adminProtect, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id).populate('userId', 'name');
    if (ad) {
      await DeletedRecord.create({
        type:       'ad',
        recordId:   ad._id.toString(),
        title:      ad.title,
        price:      ad.price,
        category:   ad.category,
        imageUrl:   ad.images?.[0] || '',
        sellerName: ad.userId?.name || '',
      });
    }
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

// ===================== BANNERS =====================

async function resolveUser(identifier) {
  if (!identifier || !identifier.trim()) return null;
  let user;
  if (mongoose.isValidObjectId(identifier.trim())) {
    user = await User.findById(identifier.trim());
  }
  if (!user) {
    const cleaned   = identifier.replace(/\D/g, '');
    const normalised = `+91${cleaned.slice(-10)}`;
    user = await User.findOne({ phone: normalised });
  }
  return user;
}

function parseCities(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw).filter(Boolean); } catch {}
  return raw.split(',').map(c => c.trim()).filter(Boolean);
}

// @GET /api/admin/banners
router.get('/banners', adminProtect, async (req, res) => {
  try {
    const banners = await Banner.find()
      .populate('targetUserId', 'name phone businessName')
      .sort({ createdAt: -1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/admin/banners
router.post('/banners', adminProtect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image is required' });

    const { targetUser, targetCities: rawCities, externalUrl } = req.body;
    const user = await resolveUser(targetUser);
    if (targetUser && targetUser.trim() && !user)
      return res.status(404).json({ message: 'Target user not found. Check the phone number.' });

    const isGif = req.file.mimetype === 'image/gif';
    const cloudinaryOpts = isGif ? { format: 'gif', flags: 'animated' } : {};
    const result = await uploadToCloudinary(req.file.buffer, 'murato/banners', cloudinaryOpts);

    const banner = await Banner.create({
      imageUrl:     result.secure_url,
      targetUserId: user ? user._id : null,
      externalUrl:  externalUrl?.trim() || null,
      targetCities: parseCities(rawCities),
      isActive:     true,
    });

    const populated = await banner.populate('targetUserId', 'name phone businessName');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/admin/banners/:id
router.put('/banners/:id', adminProtect, upload.single('image'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });

    const { targetUser, targetCities: rawCities, externalUrl } = req.body;

    if (req.file) {
      const isGif = req.file.mimetype === 'image/gif';
      const cloudinaryOpts = isGif ? { format: 'gif', flags: 'animated' } : {};
      const result = await uploadToCloudinary(req.file.buffer, 'murato/banners', cloudinaryOpts);
      banner.imageUrl = result.secure_url;
    }

    if (targetUser !== undefined) {
      const user = await resolveUser(targetUser);
      if (targetUser && targetUser.trim() && !user)
        return res.status(404).json({ message: 'Target user not found.' });
      banner.targetUserId = user ? user._id : null;
    }

    if (externalUrl !== undefined) banner.externalUrl = externalUrl?.trim() || null;
    if (rawCities   !== undefined) banner.targetCities = parseCities(rawCities);

    await banner.save();
    const populated = await banner.populate('targetUserId', 'name phone businessName');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/admin/banners/:id/toggle
router.put('/banners/:id/toggle', adminProtect, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    banner.isActive = !banner.isActive;
    await banner.save();
    const populated = await banner.populate('targetUserId', 'name phone businessName');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/admin/banners/:id
router.delete('/banners/:id', adminProtect, async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===================== SETTINGS =====================

// @PUT /api/admin/credentials
router.put('/credentials', adminProtect, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Both email and password are required' });
    }

    const fs   = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');

    if (!fs.existsSync(envPath)) {
      return res.status(500).json({ message: '.env file not found' });
    }

    let envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('ADMIN_EMAIL=')) {
      envContent = envContent.replace(/^ADMIN_EMAIL=.*$/m, `ADMIN_EMAIL=${email}`);
    } else {
      envContent += `\nADMIN_EMAIL=${email}`;
    }

    if (envContent.includes('ADMIN_PASSWORD=')) {
      envContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${password}`);
    } else {
      envContent += `\nADMIN_PASSWORD=${password}`;
    }

    fs.writeFileSync(envPath, envContent);
    process.env.ADMIN_EMAIL    = email;
    process.env.ADMIN_PASSWORD = password;

    await User.findOneAndUpdate(
      { email: (process.env.ADMIN_EMAIL || '').toLowerCase() },
      { email: email.toLowerCase() },
      { new: true }
    );

    res.json({ message: 'Admin credentials updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
