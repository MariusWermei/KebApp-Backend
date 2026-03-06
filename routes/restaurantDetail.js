var express = require("express");
var router = express.Router();
require("../models/connection");

const Restaurant = require("../models/restaurants");
// Hello encore une fois, je suis désolé pour les erreurs précédentes. Voici le code corrigé pour la route GET /restaurants/:name qui permet de récupérer les détails d'un restaurant par son nom. J'ai ajouté un décodage du nom pour gérer les espaces et les caractères spéciaux, ainsi qu'une recherche insensible à la casse. yolo
// GET /restaurants/:name → détails d'un restaurant par son nom
router.get("/:name", async (req, res) => {
  try {
    // Décodage du nom pour gérer les espaces et caractères spéciaux
    const name = decodeURIComponent(req.params.name);
    // Échapper les caractères spéciaux pour la regex
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
