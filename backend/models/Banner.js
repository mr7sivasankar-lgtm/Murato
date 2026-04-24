const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    imageUrl:     { type: String, required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // External URL — if set, tapping the banner opens this URL in the browser
    externalUrl:  { type: String, default: null },
    // Array of cities/areas — empty array = show to ALL users
    targetCities: { type: [String], default: [] },
    // isActive: true by default — banner is live immediately on creation
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);

