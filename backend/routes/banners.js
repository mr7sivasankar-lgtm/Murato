const express = require('express');
const router  = express.Router();
const Banner  = require('../models/Banner');

// @GET /api/banners?city=Tirupati
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let filter = { isActive: { $ne: false } };

    if (city && city.trim()) {
      const c = city.trim();
      // Match banners that target everyone (empty array) OR
      // any element of targetCities partially matches the user's city (both ways)
      filter.$or = [
        { targetCities: { $size: 0 } },
        { targetCities: { $exists: false } },
        { targetCities: { $elemMatch: { $regex: c, $options: 'i' } } },
        // Also match if stored city is a substring of the user's GPS city
        // e.g. stored "Tirupati" matches user GPS city "Tirupati (Urban)"
        ...c.split(/[\s,()]+/).filter(w => w.length >= 4).map(word => ({
          targetCities: { $elemMatch: { $regex: word, $options: 'i' } }
        }))
      ];
    } else {
      // Unknown city — only universal banners
      filter.$or = [
        { targetCities: { $size: 0 } },
        { targetCities: { $exists: false } },
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
