const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { adminProtect } = require('../middleware/auth');

// Seed default categories if none exist
const seedCategories = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany([
      { name: 'Cement', icon: '🧱', order: 1 },
      { name: 'Bricks', icon: '🏗️', order: 2 },
      { name: 'Sand', icon: '🏖️', order: 3 },
      { name: 'Steel', icon: '🔩', order: 4 },
      { name: 'Workers', icon: '👷', order: 5 },
      { name: 'Electricians', icon: '⚡', order: 6 },
      { name: 'Contractors', icon: '📋', order: 7 },
      { name: 'Plumbers', icon: '🔧', order: 8 },
      { name: 'Tiles', icon: '🪟', order: 9 },
      { name: 'Paint', icon: '🎨', order: 10 },
    ]);
    console.log('✅ Default categories seeded');
  }
};
seedCategories();

// @GET /api/categories
router.get('/', async (_req, res) => {
  try {
    const cats = await Category.find({ isActive: true }).sort({ order: 1 });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/categories (admin)
router.post('/', adminProtect, async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @PUT /api/categories/:id (admin)
router.put('/:id', adminProtect, async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @DELETE /api/categories/:id (admin)
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
