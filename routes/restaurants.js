const express = require("express");
const router = express.Router();
const Restaurant = require("../models/restaurants");

// ==============================
// GET /restaurants/recommendations
// Recommandations par tags (+ géoloc optionnelle)
// ==============================
router.get("/recommendations", async (req, res) => {
  try {
    const { tags, latitude, longitude, limit } = req.query;

    if (!tags) {
      return res.json({ result: false, error: "Tags manquants" });
    }

    const tagsArray = tags.split(",");
    const filter = { tags: { $in: tagsArray } };

    if (latitude && longitude) {
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            distanceField: "distance",
            spherical: true,
            query: filter,
          },
        },
        { $limit: parseInt(limit) || 10 },
      ];

      const restaurants = await Restaurant.aggregate(pipeline);
      return res.json({ result: true, restaurants });
    }

    const restaurants = await Restaurant.find(filter)
      .sort({ rating: -1 })
      .limit(parseInt(limit) || 10);

    res.json({ result: true, restaurants });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// GET /restaurants
// Liste générale avec filtres optionnels (search, tags, géoloc)
// ==============================
router.get("/", async (req, res) => {
  try {
    const { search, tags, latitude, longitude, limit } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (tags) {
      filter.tags = { $in: tags.split(",") };
    }

    if (latitude && longitude) {
      const pipeline = [
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            distanceField: "distance",
            spherical: true,
            query: filter,
          },
        },
      ];

      if (limit) pipeline.push({ $limit: parseInt(limit) });

      const restaurants = await Restaurant.aggregate(pipeline);
      return res.json({ result: true, restaurants });
    }

    let query = Restaurant.find(filter).sort({ rating: -1 });
    if (limit) query = query.limit(parseInt(limit));

    const restaurants = await query;
    res.json({ result: true, restaurants });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

module.exports = router;
