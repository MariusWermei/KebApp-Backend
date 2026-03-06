const mongoose = require("mongoose");

const restaurantSchema = mongoose.Schema({
  googlePlaceId: String,
  name: { type: String, required: true },
  description: String,

  address: String,
  arrondissement: Number,

  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  },

  phone: String,
  photos: [String],
  coverImage: String,

  openingHours: [String],

  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },

  tags: [String],
  priceLevel: { type: Number, enum: [1, 2, 3] },

  menu: [
    {
      name: { type: String, required: true },
      description: String,
      image: String,
      category: {
        type: String,
        enum: ["kebab", "durum", "assiette", "tacos", "boisson", "menu"],
      },
      basePrice: { type: Number, required: true }, // en centimes
      customizations: [
        {
          label: String,
          options: [String],
        },
      ],
      sauces: [
        {
          name: String,
          extraPrice: { type: Number, default: 0 },
        },
      ],
      supplements: [
        {
          name: String,
          price: Number,
        },
      ],
      isAvailable: { type: Boolean, default: true },
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

restaurantSchema.index({ location: "2dsphere" });

const Restaurant = mongoose.model("restaurants", restaurantSchema);

module.exports = Restaurant;
