const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    phone:  { type: String, required: true, unique: true, trim: true },
    email:  { type: String, trim: true, lowercase: true, default: '' },
    avatar: { type: String, default: '' },

    location: {
      city:        { type: String, default: '' },
      area:        { type: String, default: '' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // Business / seller info
    businessName:     { type: String, default: '' },
    whatsappAvailable:{ type: Boolean, default: false },
    // 'direct' = buyers can see phone number; 'chat' = in-app chat only
    contactMode:      { type: String, enum: ['direct', 'chat'], default: 'chat' },

    // Aggregated rating across all their ads
    ratingAvg:   { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },

    // 4-digit login PIN (stored as string)
    pin: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
