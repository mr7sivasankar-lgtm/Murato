const mongoose = require('mongoose');

const deletedRecordSchema = new mongoose.Schema({
  type:      { type: String, enum: ['user', 'ad'], required: true },
  recordId:  { type: String },
  // User fields
  name:      { type: String, default: '' },
  phone:     { type: String, default: '' },
  city:      { type: String, default: '' },
  // Ad fields
  title:     { type: String, default: '' },
  price:     { type: Number, default: 0 },
  category:  { type: String, default: '' },
  imageUrl:  { type: String, default: '' },
  sellerName:{ type: String, default: '' },
  // Common
  deletedAt: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('DeletedRecord', deletedRecordSchema);
