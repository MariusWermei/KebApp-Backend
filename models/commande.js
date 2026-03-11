const mongoose = require("mongoose");

// Schéma d'un article dans la commande
const schemaArticle = new mongoose.Schema({
  nom: { type: String, required: true },
  quantite: { type: Number, required: true, min: 1 },
  prixUnitaire: { type: Number, required: true, min: 0 },
});

// Schéma principal d'une commande
const schemaCommande = new mongoose.Schema(
  {
    idUtilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    restaurant: {
      nom: { type: String, required: true },
      logoUrl: { type: String, default: null },
    },
    articles: [schemaArticle],
    prixTotal: { type: Number, required: true },
    statut: {
      // false = commande en cours | true = commande finalisée (livrée)
      estFinalisee: { type: Boolean, default: false },
      etape: {
        type: String,
        enum: ["ACCEPTEE", "EN_PREPARATION", "PRETE", "LIVREE"],
        default: "EN_PREPARATION",
      },
    },
    heureArriveeEstimee: { type: Date, default: null },
  },
  { timestamps: { createdAt: "dateCommande" } },
);

module.exports = mongoose.model("Commande", schemaCommande);
