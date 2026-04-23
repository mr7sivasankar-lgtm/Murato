const express = require('express');
const router  = express.Router();
const Banner  = require('../models/Banner');

// @GET /api/banners?city=Hyderabad
// Returns active banners for all users OR for a specific city
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;

    // Build filter: always include banners that target all (empty targetCity)
    // If city provided, also include banners targeting that specific city
    let filter = { isActive: true };

    if (city) {
      filter.$or = [
        { targetCity: '' },         // show to everyone
        { targetCity: null },       // show to everyone
        { targetCity: { $regex: new RegExp(`^${city}$`, 'i') } }, // city match
      ];
    } else {
      // No city known — only show universal banners
      filter.$or = [
        { targetCity: '' },
        { targetCity: null },
      ];
    }

    const banners = await Banner.find(filter)
      .sort({ createdAt: -1 })
      .populate('targetUserId', 'name businessName phone avatar');

    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
