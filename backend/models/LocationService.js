const mongoose = require('mongoose');

const locationServiceSchema = new mongoose.Schema({
  city:      { type: String, required: true, unique: true },
  isActive:  { type: Boolean, default: true },
  reason:    { type: String, default: '' },
  toggledAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('LocationService', locationServiceSchema);
