const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    // ── Core ─────────────────────────────────────────
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type:        { type: String, enum: ['product', 'service'], default: 'product' },
    images:      [{ type: String }],
    status:      { type: String, enum: ['active', 'sold', 'inactive'], default: 'active' },
    isFeatured:  { type: Boolean, default: false },
    isFlagged:   { type: Boolean, default: false },
    flagReason:  { type: String, default: '' },
    views:       { type: Number, default: 0 },

    // ── Category ─────────────────────────────────────
    category:    { type: String, required: true },
    categories:  { type: String, default: '' }, // comma-separated multi-select (service)
    subcategory: { type: String, default: '' },
    itemType:    { type: String, default: '' }, // 3rd level

    // ── Product fields ────────────────────────────────
    brand:         { type: String, default: '' },
    materialType:  { type: String, default: '' },
    condition:     { type: String, enum: ['new', 'used', ''], default: 'new' },

    // Quantity
    quantity:      { type: Number, default: 0 },
    unit:          { type: String, enum: ['bag', 'ton', 'kg', 'piece', 'load', 'sqft', 'meter', 'litre', 'set', ''], default: '' },
    moq:           { type: Number, default: 1 }, // Min order qty

    // Pricing
    price:         { type: Number, default: 0 },
    priceType:     { type: String, enum: ['per_bag', 'per_ton', 'per_kg', 'per_piece', 'per_sqft', 'per_load', 'per_litre', 'per_meter', 'fixed', ''], default: 'fixed' },
    negotiable:    { type: Boolean, default: false },
    bulkDiscount:  { type: Boolean, default: false },

    // Delivery
    deliveryAvailable: { type: Boolean, default: false },
    deliveryCharges:   { type: Number, default: 0 },
    deliveryTime:      { type: String, default: '' }, // e.g. "2 days"
    pickupAvailable:   { type: Boolean, default: true },

    // ── Service fields ────────────────────────────────
    experienceYears: { type: Number, default: 0 },
    teamSize:        { type: Number, default: 1 },
    projectsDone:    { type: Number, default: 0 },
    skills:          [{ type: String }],
    pricingType:     { type: String, enum: ['per_day', 'per_hour', 'per_sqft', 'per_project', 'fixed', ''], default: '' },
    serviceRadius:   { type: Number, default: 20 }, // km
    availability:    { type: String, enum: ['available', 'busy', 'from_date', ''], default: 'available' },
    availableFrom:   { type: Date, default: null },
    travelAvailable: { type: Boolean, default: false },
    materialIncluded:{ type: Boolean, default: false },
    urgentWork:      { type: Boolean, default: false },

    // ── Seller info ───────────────────────────────────
    businessName:    { type: String, default: '' },
    whatsappAvailable: { type: Boolean, default: false },
    // contactMode: 'direct' = user can see phone, 'chat' = only in-app chat
    contactMode:     { type: String, enum: ['direct', 'chat'], default: 'chat' },

    // ── Location (GeoJSON for radius search) ─────────
    location: {
      city:        { type: String, required: true },
      area:        { type: String, default: '' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // ── Relations ─────────────────────────────────────
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Aggregated ratings (updated via Rating model) ─
    ratingAvg:   { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// GeoJSON 2dsphere index for nearby search
adSchema.index({ 'location.coordinates': '2dsphere' });
// Text search
adSchema.index({ title: 'text', description: 'text', category: 'text', brand: 'text', businessName: 'text' });
// Fast filter indexes
adSchema.index({ category: 1, subcategory: 1, status: 1 });
adSchema.index({ userId: 1, status: 1 });
adSchema.index({ 'location.city': 1, status: 1 });

module.exports = mongoose.model('Ad', adSchema);
