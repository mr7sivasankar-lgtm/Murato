const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const Favorite = require('../models/Favorite');
const { protect } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// ── Helper: extract all updatable body fields ──────────────────────────────
const PRODUCT_FIELDS = [
  'title','description','category','subcategory','itemType','brand','materialType',
  'condition','quantity','unit','moq','price','priceType','negotiable','bulkDiscount',
  'deliveryAvailable','deliveryCharges','deliveryTime','pickupAvailable',
  'businessName','whatsappAvailable','contactMode',
];
const SERVICE_FIELDS = [
  'title','description','category','categories','subcategory','itemType',
  'experienceYears','teamSize','projectsDone','pricingType','price',
  'serviceRadius','availability','availableFrom','travelAvailable',
  'materialIncluded','urgentWork','businessName','whatsappAvailable','contactMode',
  'negotiable',  // ← workers can also mark rate as negotiable
];

// @GET /api/ads
router.get('/', async (req, res) => {
  try {
    const {
      q, category, subcategory, type, city,
      minPrice, maxPrice, brand, negotiable,
      lat, lng, radius = 20,          // radius in km
      page = 1, limit = 20,
    } = req.query;

    const filter = { status: 'active' };

    // Note: We removed MongoDB $regex search for 'q'. We will use Fuse.js after fetching.
    if (category)    filter.category    = new RegExp(category, 'i');
    if (subcategory) filter.subcategory = new RegExp(subcategory, 'i');
    if (type)        filter.type = type;
    if (brand)       filter.brand = new RegExp(brand, 'i');
    if (negotiable === 'true') filter.negotiable = true;

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // ── Geolocation: lat/lng radius OR city name ──────────────────────────
    if (lat && lng) {
      filter['location.coordinates'] = {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: Number(radius) * 1000, // metres
        },
      };
    } else if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }

    // Fetch all matching ads (without text search) to do memory fuzzy search
    let ads = await Ad.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .populate('userId', 'name avatar phone businessName contactMode whatsappAvailable ratingAvg ratingCount');

    if (q) {
      const Fuse = require('fuse.js');
      const fuse = new Fuse(ads, {
        keys: ['title', 'category', 'subcategory', 'brand', 'description'],
        threshold: 0.4, // Allows typos like 'sement' -> 'Cement'
        ignoreLocation: true,
      });
      ads = fuse.search(q).map(result => result.item);
    }

    const total = ads.length;
    const skip  = (Number(page) - 1) * Number(limit);
    const paginatedAds = ads.slice(skip, skip + Number(limit));

    res.json({
      ads: paginatedAds,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ads/featured
router.get('/featured', async (req, res) => {
  try {
    const ads = await Ad.find({ status: 'active', isFeatured: true })
      .limit(10)
      .populate('userId', 'name avatar businessName ratingAvg ratingCount');
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ads/favorites/mine
router.get('/favorites/mine', protect, async (req, res) => {
  try {
    const favs = await Favorite.find({ userId: req.user._id })
      .populate({ path: 'adId', populate: { path: 'userId', select: 'name phone businessName' } });
    res.json(favs.map((f) => f.adId).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ads/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const { category, subcategory, q, type } = req.query;
    const filter = { userId: req.params.userId, status: { $ne: 'inactive' } };
    if (category)    filter.category    = new RegExp(category, 'i');
    if (subcategory) filter.subcategory = new RegExp(subcategory, 'i');
    if (type)        filter.type = type;
    if (q)           filter.$text = { $search: q };
    const ads = await Ad.find(filter).sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/ads/:id
router.get('/:id', async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id)
      .populate('userId', 'name avatar phone businessName contactMode whatsappAvailable ratingAvg ratingCount location');
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    ad.views += 1;
    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/ads
router.post('/', protect, (req, res, next) => {
  // Handle multer errors (file too large etc) with a proper JSON response
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ message: 'Each image must be under 20MB. Please compress and try again.' });
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const isService = req.body.type === 'service';
    const fields = isService ? SERVICE_FIELDS : PRODUCT_FIELDS;

    const data = {
      userId: req.user._id,
      type:   isService ? 'service' : 'product',  // ← always set type explicitly
    };

    fields.forEach((f) => {
      if (req.body[f] !== undefined && req.body[f] !== '') {
        // coerce booleans
        if (['negotiable','bulkDiscount','deliveryAvailable','pickupAvailable',
             'whatsappAvailable','travelAvailable','materialIncluded','urgentWork'].includes(f)) {
          data[f] = req.body[f] === 'true' || req.body[f] === true;
        } else if (['price','quantity','moq','deliveryCharges','experienceYears','teamSize','projectsDone','serviceRadius'].includes(f)) {
          data[f] = Number(req.body[f]) || 0;
        } else {
          data[f] = req.body[f];
        }
      }
    });

    // Skills array (comma string → array)
    if (req.body.skills) data.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);

    // Also accept subcategories (plural) from new multi-select UI → use first as subcategory
    if (!data.subcategory && req.body.subcategories) {
      const subs = req.body.subcategories.split(',').map(s => s.trim()).filter(Boolean);
      if (subs.length) data.subcategory = subs[0];
    }

    // Location
    data.location = {
      city:        req.body.city || '',
      area:        req.body.area || '',
      coordinates: req.body.lng && req.body.lat
        ? [parseFloat(req.body.lng), parseFloat(req.body.lat)]
        : [0, 0],
    };

    // Images → Cloudinary
    data.images = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const r = await uploadToCloudinary(file.buffer, 'murato/ads');
        data.images.push(r.secure_url);
      }
    }

    const ad = await Ad.create(data);
    res.status(201).json(ad);
  } catch (err) {
    console.error('❌ POST /api/ads error:', err.message, err.errors || '');
    res.status(500).json({ message: err.message });
  }
});


// @PUT /api/ads/:id  (edit — no re-approval needed)
router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    if (ad.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const fields = ad.type === 'service' ? SERVICE_FIELDS : PRODUCT_FIELDS;
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (['negotiable','bulkDiscount','deliveryAvailable','pickupAvailable',
             'whatsappAvailable','travelAvailable','materialIncluded','urgentWork'].includes(f)) {
          ad[f] = req.body[f] === 'true' || req.body[f] === true;
        } else if (['price','quantity','moq','deliveryCharges','experienceYears','teamSize','projectsDone','serviceRadius'].includes(f)) {
          ad[f] = Number(req.body[f]) || 0;
        } else {
          ad[f] = req.body[f];
        }
      }
    });

    if (req.body.skills) ad.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);

    if (req.body.city || req.body.area) {
      ad.location = {
        city:        req.body.city || ad.location.city,
        area:        req.body.area || ad.location.area,
        coordinates: req.body.lng && req.body.lat
          ? [parseFloat(req.body.lng), parseFloat(req.body.lat)]
          : ad.location.coordinates,
      };
    }

    let updatedImages = ad.images;
    if (req.body.replaceImages === 'true') {
      const existingImages = req.body.existingImages ? JSON.parse(req.body.existingImages) : [];
      const newUrls = [];
      if (req.files?.length) {
        for (const file of req.files) {
          const r = await uploadToCloudinary(file.buffer, 'murato/ads');
          newUrls.push(r.secure_url);
        }
      }
      updatedImages = [...existingImages, ...newUrls];
      ad.images = updatedImages;
    } else if (req.files?.length) {
      const newUrls = [];
      for (const file of req.files) {
        const r = await uploadToCloudinary(file.buffer, 'murato/ads');
        newUrls.push(r.secure_url);
      }
      ad.images = [...ad.images, ...newUrls];
    }

    await ad.save();
    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/ads/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    if (ad.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    await ad.deleteOne();
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/ads/:id/favorite
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const existing = await Favorite.findOne({ userId: req.user._id, adId: req.params.id });
    if (existing) { await existing.deleteOne(); return res.json({ favorited: false }); }
    await Favorite.create({ userId: req.user._id, adId: req.params.id });
    res.json({ favorited: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/ads/:id/flag
router.post('/:id/flag', protect, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    ad.isFlagged = true;
    ad.flagReason = req.body.reason || 'Reported by user';
    await ad.save();
    res.json({ message: 'Ad flagged for review' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
