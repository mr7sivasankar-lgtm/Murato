const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// @GET /api/users/:id — Public seller profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name avatar businessName contactMode whatsappAvailable location ratingAvg ratingCount createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/users/me — Update own profile (contactMode, businessName, whatsapp)
router.put('/me', protect, async (req, res) => {
  try {
    const { businessName, contactMode, whatsappAvailable, city, area } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (businessName !== undefined)    user.businessName     = businessName;
    if (contactMode !== undefined)     user.contactMode      = contactMode;
    if (whatsappAvailable !== undefined) user.whatsappAvailable = whatsappAvailable === 'true' || whatsappAvailable === true;
    if (city || area) user.location = { city: city || user.location.city, area: area || user.location.area };

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

