const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '90d' });

// @POST /api/auth/login  — Admin email+password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    // Validate against .env admin credentials
    if (
      email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase() ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Find or create admin user record
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name:  'Admin',
        phone: 'admin-internal',  // placeholder, unique
        email: email.toLowerCase(),
      });
    }

    res.json({
      isAdmin: true,
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// @POST /api/auth/register  — Direct login/register with phone + name (no OTP)
router.post('/register', async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone is required' });

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) return res.status(400).json({ message: 'Enter a valid phone number' });

    const normalised = `+91${cleaned.slice(-10)}`;

    // Find or create user
    let user = await User.findOne({ phone: normalised });
    const isNew = !user;

    if (!user) {
      if (!name || name.trim().length < 2)
        return res.status(400).json({ message: 'Name is required for new users' });
      user = await User.create({ name: name.trim(), phone: normalised });
    } else if (name && name.trim().length >= 2 && user.name === 'New User') {
      // Update placeholder name for old accounts
      user.name = name.trim();
      await user.save();
    }

    if (user.isBanned) return res.status(403).json({ message: 'Account banned' });

    res.json({
      isNew,
      token: generateToken(user._id),
      user: {
        _id:               user._id,
        name:              user.name,
        phone:             user.phone,
        avatar:            user.avatar,
        location:          user.location,
        businessName:      user.businessName,
        contactMode:       user.contactMode,
        whatsappAvailable: user.whatsappAvailable,
        ratingAvg:         user.ratingAvg,
        ratingCount:       user.ratingCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/auth/profile — update name + location after OTP onboarding
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const {
      name, city, area, lat, lng,
      businessName, contactMode, whatsappAvailable,
    } = req.body;

    if (name)         user.name         = name;
    if (businessName) user.businessName = businessName;
    if (contactMode)  user.contactMode  = contactMode;
    if (whatsappAvailable !== undefined)
      user.whatsappAvailable = whatsappAvailable === 'true' || whatsappAvailable === true;

    if (city || area) {
      const existing = user.location || {};
      user.location = {
        city:        city || existing.city || '',
        area:        area || existing.area || '',
        coordinates: lat && lng ? [parseFloat(lng), parseFloat(lat)] : (existing.coordinates || []),
      };
    }

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'murato/avatars');
      user.avatar = result.secure_url;
    }

    await user.save();
    res.json({
      _id:              user._id,
      name:             user.name,
      phone:            user.phone,
      avatar:           user.avatar,
      location:         user.location,
      businessName:     user.businessName,
      contactMode:      user.contactMode,
      whatsappAvailable:user.whatsappAvailable,
      ratingAvg:        user.ratingAvg,
      ratingCount:      user.ratingCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const u = req.user;
  res.json({
    _id: u._id, name: u.name, phone: u.phone, avatar: u.avatar,
    location: u.location, businessName: u.businessName,
    contactMode: u.contactMode, whatsappAvailable: u.whatsappAvailable,
    ratingAvg: u.ratingAvg, ratingCount: u.ratingCount,
  });
});

module.exports = router;
