require("dotenv").config();
require("../models/connection");
const Restaurant = require("../models/restaurants");

async function fixLocations() {
  const restaurants = await Restaurant.find({
    latitude: { $exists: true },
    longitude: { $exists: true },
  }).lean();

  console.log(`${restaurants.length} restaurants à migrer`);

  let count = 0;
  for (const restaurant of restaurants) {
    if (!restaurant.latitude || !restaurant.longitude) continue;

    await Restaurant.updateOne(
      { _id: restaurant._id },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [restaurant.longitude, restaurant.latitude],
          },
        },
      },
    );
    count++;
  }

  console.log(`${count} restaurants migrés`);
  process.exit();
}

fixLocations();
