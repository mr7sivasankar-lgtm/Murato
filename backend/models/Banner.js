const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    imageUrl:     { type: String, required: true },
    // Who tapping the banner leads to (optional — can be a general promo)
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // If set, only shown to users whose location.city matches (case-insensitive)
    // Empty string or null = show to EVERYONE
    targetCity:   { type: String, default: '' },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
