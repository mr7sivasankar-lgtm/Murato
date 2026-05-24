const mongoose = require('mongoose');

// Generic key-value store for app-wide settings configurable from the admin panel.
const appSettingsSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String, default: '' },   // human-readable label for admin UI
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);
