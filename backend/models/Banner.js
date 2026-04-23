const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    imageUrl:     { type: String, required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Array of cities/areas — empty array = show to ALL users
    targetCities: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
