const express = require("express");
const router = express.Router();

const Restaurant = require("../models/restaurants");

// Route 1: Recommandations par tags
router.get("/recommendations", async (req, res) => {
  try {
    const { tags, latitude, longitude, limit } = req.query;

    if (!tags) {
      return res.json({ result: false, error: "Tags manquants" });
    }

    const tagsArray = tags.split(",");
    const filter = { tags: { $in: tagsArray } };

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
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

    // Sans géoloc : tri par note
    const restaurants = await Restaurant.find(filter)
      .sort({ rating: -1 })
      .limit(parseInt(limit) || 10);

    res.json({ result: true, restaurants });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// Route 2: Liste générale des restaurants
router.get("/", async (req, res) => {
  try {
    const { search, tags, latitude, longitude, limit } = req.query;

    const filter = {};

    // Recherche par nom (insensible à la casse)
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // Filtre par tags (ex: ?tags=halal,veggie)
    if (tags) {
      const tagsArray = tags.split(",");
      filter.tags = { $all: tagsArray };
    }

    let query = Restaurant.find(filter);

    // Tri par distance si position fournie
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lng, lat] },
            distanceField: "distance",
            spherical: true,
            query: filter,
          },
        },
      ];

      if (limit) {
        pipeline.push({ $limit: parseInt(limit) });
      }

      const restaurants = await Restaurant.aggregate(pipeline);
      return res.json({ result: true, restaurants });
    }

    // Sans géoloc : tri par note décroissante
    query = query.sort({ rating: -1 });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const restaurants = await query;
    res.json({ result: true, restaurants });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

module.exports = router;
