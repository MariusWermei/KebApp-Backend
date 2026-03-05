const mongoose = require("mongoose");
require("dotenv").config();
const Restaurant = require("../models/restaurants");

const VIANDES = ["poulet", "agneau", "veau", "mixte"];

async function fixTags() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connecté à MongoDB");

  const restaurants = await Restaurant.find({}).lean();
  console.log(`${restaurants.length} restaurants trouvés`);

  let modifiedCount = 0;

  for (const restaurant of restaurants) {
    let tags = [...restaurant.tags];
    let modified = false;

    // 1. Supprimer "halal"
    if (tags.includes("halal")) {
      tags = tags.filter((t) => t !== "halal");
      modified = true;
    }

    // 2. Ne garder qu'une seule viande
    const viandesPresentes = tags.filter((t) => VIANDES.includes(t));

    if (viandesPresentes.length > 1) {
      // Choisir une viande au hasard
      const viandeGardee =
        viandesPresentes[Math.floor(Math.random() * viandesPresentes.length)];

      // Retirer toutes les viandes sauf celle choisie
      tags = tags.filter((t) => !VIANDES.includes(t) || t === viandeGardee);
      modified = true;
    }

    // 3. Sauvegarder si modifié
    if (modified) {
      await Restaurant.updateOne({ _id: restaurant._id }, { tags });
      modifiedCount++;
    }
  }

  console.log(`${modifiedCount} restaurants modifiés`);
  await mongoose.disconnect();
  console.log("Terminé !");
}

fixTags();
