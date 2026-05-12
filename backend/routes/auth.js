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

    if (
      email.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase() ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name:  'Admin',
        phone: 'admin-internal',
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


// ── PIN-based user auth ─────────────────────────────────────────────────────

// Helper to build the user response object
const userPayload = (u) => ({
  _id:               u._id,
  name:              u.name,
  phone:             u.phone,
  avatar:            u.avatar,
  location:          u.location,
  businessName:      u.businessName,
  contactMode:       u.contactMode,
  whatsappAvailable: u.whatsappAvailable,
  ratingAvg:         u.ratingAvg,
  ratingCount:       u.ratingCount,
});

// @POST /api/auth/check  — Check if phone is already registered
router.post('/check', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone is required' });

    const cleaned   = phone.replace(/\D/g, '');
    const normalised = `+91${cleaned.slice(-10)}`;

    const user = await User.findOne({ phone: normalised });
    res.json({ exists: !!user, hasPin: !!(user?.pin) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// @POST /api/auth/register  — New user: phone + name + pin
router.post('/register', async (req, res) => {
  try {
    const { phone, name, pin } = req.body;

    if (!phone) return res.status(400).json({ message: 'Phone is required' });
    if (!name || name.trim().length < 2) return res.status(400).json({ message: 'Name is required' });
    if (!pin || !/^\d{4}$/.test(pin)) return res.status(400).json({ message: 'A 4-digit PIN is required' });

    const cleaned    = phone.replace(/\D/g, '');
    const normalised = `+91${cleaned.slice(-10)}`;

    const existing = await User.findOne({ phone: normalised });
    if (existing) return res.status(400).json({ message: 'This number is already registered. Please log in.' });

    const user = await User.create({ name: name.trim(), phone: normalised, pin });

    res.json({
      isNew: true,
      token: generateToken(user._id),
      user:  userPayload(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// @POST /api/auth/login-pin  — Returning user: phone + pin
router.post('/login-pin', async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone) return res.status(400).json({ message: 'Phone is required' });
    if (!pin)   return res.status(400).json({ message: 'PIN is required' });

    const cleaned    = phone.replace(/\D/g, '');
    const normalised = `+91${cleaned.slice(-10)}`;

    const user = await User.findOne({ phone: normalised });
    if (!user)     return res.status(404).json({ message: 'No account found for this number' });
    if (user.isBanned) return res.status(403).json({ message: 'Account banned' });
    if (user.pin !== pin) return res.status(401).json({ message: 'Incorrect PIN' });

    res.json({
      isNew: false,
      token: generateToken(user._id),
      user:  userPayload(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// @POST /api/auth/forgot-pin  — Return the existing PIN for a phone number
router.post('/forgot-pin', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone is required' });

    const cleaned    = phone.replace(/\D/g, '');
    const normalised = `+91${cleaned.slice(-10)}`;

    const user = await User.findOne({ phone: normalised });
    if (!user) return res.status(404).json({ message: 'No account found for this number' });
    if (!user.pin) return res.status(400).json({ message: 'No PIN set for this account' });

    res.json({ pin: user.pin, name: user.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// @PUT /api/auth/change-pin  — Change PIN (protected)
router.put('/change-pin', protect, async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!newPin || !/^\d{4}$/.test(newPin))
      return res.status(400).json({ message: 'New PIN must be 4 digits' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If user already has a PIN, verify the current one
    if (user.pin && user.pin !== currentPin)
      return res.status(401).json({ message: 'Current PIN is incorrect' });

    user.pin = newPin;
    await user.save();

    res.json({ message: 'PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// @PUT /api/auth/profile — update name + location after registration
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
    res.json(userPayload(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const u = req.user;
  res.json(userPayload(u));
});

// @PUT /api/auth/fcm-token  — save device FCM token for push notifications
router.put('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required' });
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/auth/account - Delete user account
router.delete('/account', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Optional: Delete user's ads and chats
    const Ad = require('../models/Ad');
    await Ad.deleteMany({ seller: user._id });

    // Delete user
    await User.findByIdAndDelete(req.user._id);
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
