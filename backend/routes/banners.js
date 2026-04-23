const express = require('express');
const router  = express.Router();
const Banner  = require('../models/Banner');

// @GET /api/banners
// Fetch all active banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ createdAt: -1 })
      .populate('targetUserId', 'name businessName phone avatar');
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
