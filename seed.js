require("dotenv").config();
require("./models/connection");
const Restaurant = require("./models/restaurants");

const menuTest = [
  {
    name: "Kebab Classic",
    description: "Viande de veau, salade, tomate, oignon, sauce blanche",
    category: "kebab",
    basePrice: 700,
    isAvailable: true,
    customizations: [
      {
        label: "Pain",
        options: ["Pain normal", "Pain pita"],
      },
      {
        label: "Garniture",
        options: ["Salade", "Tomate", "Oignon"],
      },
    ],
    sauces: [
      { name: "Sauce blanche", extraPrice: 0 },
      { name: "Sauce harissa", extraPrice: 0 },
      { name: "Sauce algérienne", extraPrice: 0 },
    ],
    supplements: [
      { name: "Fromage", price: 50 },
      { name: "Oeuf", price: 50 },
      { name: "Double viande", price: 200 },
    ],
  },
  {
    name: "Durum Poulet",
    description: "Poulet grillé, salade, tomate, maïs, sauce au choix",
    category: "durum",
    basePrice: 750,
    isAvailable: true,
    customizations: [
      {
        label: "Garniture",
        options: ["Salade", "Tomate", "Oignon"],
      },
    ],
    sauces: [
      { name: "Sauce blanche", extraPrice: 0 },
      { name: "Sauce harissa", extraPrice: 0 },
    ],
    supplements: [
      { name: "Fromage", price: 50 },
      { name: "Double viande", price: 200 },
    ],
  },
  {
    name: "Assiette Mixte",
    description: "Veau + poulet, frites, salade, sauce au choix",
    category: "assiette",
    basePrice: 1200,
    isAvailable: true,
    customizations: [
      {
        label: "Garniture",
        options: ["Salade", "Tomate", "Oignon"],
      },
    ],
    sauces: [
      { name: "Sauce blanche", extraPrice: 0 },
      { name: "Sauce harissa", extraPrice: 0 },
    ],
    supplements: [{ name: "Fromage", price: 50 }],
  },
  {
    name: "Tacos 2 viandes",
    description: "Tortilla, 2 viandes au choix, frites, sauce fromagère",
    category: "tacos",
    basePrice: 900,
    isAvailable: true,
    customizations: [
      {
        label: "Garniture",
        options: ["Salade", "Tomate", "Oignon"],
      },
      {
        label: "Choix des viandes",
        options: ["Veau", "Poulet", "Merguez"],
      },
      {
        label: "Taille",
        options: ["Normal", "XL"],
      },
    ],
    sauces: [
      { name: "Sauce fromagère", extraPrice: 0 },
      { name: "Sauce harissa", extraPrice: 0 },
    ],
  },
  {
    name: "Coca-Cola 33cl",
    description: "Boisson gazeuse",
    category: "boisson",
    basePrice: 200,
    isAvailable: true,
  },
  {
    name: "Eau minérale 50cl",
    description: "Eau plate",
    category: "boisson",
    basePrice: 100,
    isAvailable: true,
  },
];

const seed = async () => {
  try {
    const restaurants = await Restaurant.find({});
    console.log(`🍽️  ${restaurants.length} restaurants trouvés`);

    let count = 0;
    for (const restaurant of restaurants) {
      restaurant.menu = menuTest;
      await restaurant.save();
      count++;
      console.log(`✅ ${count}/${restaurants.length} - ${restaurant.name}`);
    }

    console.log("🎉 Seed terminé ! Tous les restaurants ont un menu.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    process.exit(1);
  }
};

seed();
