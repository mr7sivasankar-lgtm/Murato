const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Rating   = require('../models/Rating');
const Ad       = require('../models/Ad');
const Chat     = require('../models/Chat');
const User     = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Helper: recalculate & save aggregated rating on seller + ad ──────────
async function refreshRatings(sellerId, adId) {
  // Update seller average
  const sellerAgg = await Rating.aggregate([
    { $match: { sellerId: new mongoose.Types.ObjectId(sellerId) } },
    { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);
  if (sellerAgg.length) {
    await User.findByIdAndUpdate(sellerId, {
      ratingAvg:   Math.round(sellerAgg[0].avg * 10) / 10,
      ratingCount: sellerAgg[0].count,
    });
  }

  // Update ad average
  const adAgg = await Rating.aggregate([
    { $match: { adId: new mongoose.Types.ObjectId(adId) } },
    { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);
  if (adAgg.length) {
    await Ad.findByIdAndUpdate(adId, {
      ratingAvg:   Math.round(adAgg[0].avg * 10) / 10,
      ratingCount: adAgg[0].count,
    });
  }
}

// @POST /api/ratings/:adId  — submit a rating
// Only allowed if reviewer has chatted with the seller about this ad
router.post('/:adId', protect, async (req, res) => {
  try {
    const { stars, comment } = req.body;
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ message: 'Stars must be 1–5' });

    const ad = await Ad.findById(req.params.adId);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    // Prevent self-rating
    if (ad.userId.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot rate your own listing' });

    // Must have a chat with the seller
    const chatExists = await Chat.findOne({
      adId:    req.params.adId,
      $or: [
        { buyerId: req.user._id, sellerId: ad.userId },
        { buyerId: ad.userId,    sellerId: req.user._id },
      ],
    });
    if (!chatExists)
      return res.status(403).json({ message: 'You can only rate after chatting with this seller' });

    // Upsert (one rating per ad per reviewer)
    const rating = await Rating.findOneAndUpdate(
      { adId: req.params.adId, reviewerId: req.user._id },
      { sellerId: ad.userId, stars: Number(stars), comment: comment || '' },
      { upsert: true, new: true, runValidators: true }
    );

    await refreshRatings(ad.userId, req.params.adId);
    res.status(201).json(rating);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Rating already submitted' });
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ratings/seller/:userId  — all ratings for a seller
router.get('/seller/:userId', async (req, res) => {
  try {
    const ratings = await Rating.find({ sellerId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'name avatar')
      .populate('adId', 'title category');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ratings/ad/:adId  — ratings for a specific ad
router.get('/ad/:adId', async (req, res) => {
  try {
    const ratings = await Rating.find({ adId: req.params.adId })
      .sort({ createdAt: -1 })
      .populate('reviewerId', 'name avatar');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ratings/can-rate/:adId  — check if current user can rate
router.get('/can-rate/:adId', protect, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.adId);
    if (!ad) return res.json({ canRate: false });

    if (ad.userId.toString() === req.user._id.toString())
      return res.json({ canRate: false, reason: 'own_ad' });

    const chatExists = await Chat.findOne({
      adId: req.params.adId,
      $or: [
        { buyerId: req.user._id },
        { sellerId: req.user._id },
      ],
    });
    if (!chatExists) return res.json({ canRate: false, reason: 'no_chat' });

    const existing = await Rating.findOne({ adId: req.params.adId, reviewerId: req.user._id });
    res.json({ canRate: true, existing: existing || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
