require("dotenv").config();
require("../models/connection");
const Restaurant = require("../models/restaurants");

async function assignTags() {
  const restaurants = await Restaurant.find();
  console.log(`${restaurants.length} restaurants trouvés`);

  let updated = 0;

  for (const resto of restaurants) {
    const tags = [];

    // --- Tags pour tous les restos ---
    tags.push("halal", "poulet", "agneau", "mixte");

    // --- Tags auto-détectés ---

    // ouvert-tard : fermeture entre 1AM et 6AM
    const isLateNight = resto.openingHours.some((h) => {
      const match = h.match(/–\s*(\d+):\d+\s*(AM|PM)/);
      if (!match) return false;
      const hour = parseInt(match[1]);
      const period = match[2];
      return period === "AM" && hour >= 1 && hour <= 6;
    });
    if (isLateNight) tags.push("ouvert-tard");

    if (resto.priceLevel === 1) tags.push("petit-prix");

    if (resto.rating >= 4.5 && resto.totalRatings >= 500)
      tags.push("best-seller");

    // --- Tags aléatoires ---
    if (Math.random() < 0.4) tags.push("veau");
    if (Math.random() < 0.25) tags.push("veggie");
    if (Math.random() < 0.35) tags.push("fait-maison");

    // Mise à jour en base
    await Restaurant.updateOne({ _id: resto._id }, { tags });
    updated++;
  }

  console.log(`${updated} restaurants mis à jour`);
  process.exit();
}

assignTags();
