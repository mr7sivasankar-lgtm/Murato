const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    // Who is being rated
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Which ad the transaction was about
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    // Who is giving the rating (must have chatted with seller about this ad)
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // 1–5 stars
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One rating per reviewer per ad
ratingSchema.index({ adId: 1, reviewerId: 1 }, { unique: true });
ratingSchema.index({ sellerId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
