const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      city: { type: String, default: '' },
      area: { type: String, default: '' },
    },
    phone: { type: String, default: '' },
    category: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    isActive: { type: Boolean, default: true },
    totalAds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shop', shopSchema);
