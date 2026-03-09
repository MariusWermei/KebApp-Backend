var express = require("express");
var router = express.Router();
require("../models/connection");

const Restaurant = require("../models/restaurants");
// GET /restaurants/:name → détails d'un restaurant par son nom
router.get("/:name", async (req, res) => {
  try {
    // gérer les espaces et caractères spéciaux
    const name = decodeURIComponent(req.params.name);
    // les caractères spéciaux pour la regex
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const restaurant = await Restaurant.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, "i") },
    });

    if (!restaurant) {
      return res.json({ result: false, error: "Restaurant non trouvé" });
    }

    res.json({ result: true, restaurant });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

module.exports = router;
