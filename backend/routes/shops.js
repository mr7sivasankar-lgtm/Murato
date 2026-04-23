const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const Ad = require('../models/Ad');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// @POST /api/shops — Create shop
router.post('/', protect, upload.single('logo'), async (req, res) => {
  try {
    const existing = await Shop.findOne({ ownerId: req.user._id });
    if (existing) return res.status(400).json({ message: 'You already have a shop' });

    const { name, description, city, area, phone, category } = req.body;
    let logoUrl = '';

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'murato/shops');
      logoUrl = result.secure_url;
    }

    const shop = await Shop.create({
      name, description, logo: logoUrl,
      ownerId: req.user._id,
      location: { city: city || '', area: area || '' },
      phone: phone || req.user.phone,
      category: category || '',
    });

    // Link shop to user
    await User.findByIdAndUpdate(req.user._id, { shopId: shop._id });

    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/shops/mine
router.get('/mine', protect, async (req, res) => {
  try {
    const shop = await Shop.findOne({ ownerId: req.user._id });
    if (!shop) return res.status(404).json({ message: 'No shop found' });
    const ads = await Ad.find({ shopId: shop._id, status: 'active' }).sort({ createdAt: -1 });
    res.json({ shop, ads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/shops/:id
router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('ownerId', 'name phone avatar');
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    const ads = await Ad.find({ shopId: shop._id, status: 'active' }).sort({ createdAt: -1 });
    res.json({ shop, ads });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/shops — Get all approved shops
router.get('/', async (req, res) => {
  try {
    const shops = await Shop.find({ status: 'approved', isActive: true })
      .populate('ownerId', 'name phone')
      .sort({ createdAt: -1 });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/shops/:id
router.put('/:id', protect, upload.single('logo'), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });
    if (shop.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, city, area, phone, category } = req.body;
    if (name) shop.name = name;
    if (description) shop.description = description;
    if (phone) shop.phone = phone;
    if (category) shop.category = category;
    if (city || area) shop.location = { city: city || shop.location.city, area: area || shop.location.area };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'murato/shops');
      shop.logo = result.secure_url;
    }

    await shop.save();
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
