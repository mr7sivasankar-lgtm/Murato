const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, adId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
