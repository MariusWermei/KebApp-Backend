const express = require("express");
const routeur = express.Router();
const Commande = require("../models/commande");
const Utilisateur = require("../models/user");

// ————————————————————————————————————————
// Middleware d'authentification
// Vérifie le token dans le header et attache l'utilisateur à la requête
// ————————————————————————————————————————
const verifierToken = async (req, res, suivant) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ result: false, message: "Token manquant" });

  const utilisateur = await Utilisateur.findOne({ token });
  if (!utilisateur)
    return res.status(401).json({ result: false, message: "Token invalide" });

  req.utilisateur = utilisateur;
  suivant();
};

// ————————————————————————————————————————
// GET /commandes
// Récupère toutes les commandes de l'utilisateur connecté
// Le front se charge de séparer :
//   - estFinalisee: false → "Commandes en cours"
//   - estFinalisee: true  → "Commandes précédentes"
// ————————————————————————————————————————
routeur.get("/", verifierToken, async (req, res) => {
  try {
    const commandes = await Commande.find({
      idUtilisateur: req.utilisateur._id,
    }).sort({ dateCommande: -1 });
    res.json({ result: true, commandes });
  } catch (erreur) {
    res.status(500).json({ result: false, message: erreur.message });
  }
});

// ————————————————————————————————————————
// POST /commandes
// Crée une nouvelle commande
// ————————————————————————————————————————
routeur.post("/", verifierToken, async (req, res) => {
  try {
    const { restaurant, items, prix_total } = req.body;

    // Validation
    if (!restaurant || !restaurant.nom) {
      return res.status(400).json({
        result: false,
        message: "Nom du restaurant requis",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        result: false,
        message: "Au moins un article requis",
      });
    }

    // Normaliser les items
    const articlesNormalises = items.map((item, idx) => {
      const nom = item.nom || item.name;
      const prix_unitaire = item.prix_unitaire || item.basePrice || item.price;
      const quantite = item.quantite || item.quantity || 1;

      if (!nom || nom === undefined) {
        throw new Error(`Article ${idx + 1}: nom manquant`);
      }

      if (
        prix_unitaire === undefined ||
        prix_unitaire === null ||
        isNaN(Number(prix_unitaire))
      ) {
        throw new Error(
          `Article ${idx + 1} (${nom}): prix_unitaire manquant ou invalide`,
        );
      }

      return {
        nom,
        prixUnitaire: Number(prix_unitaire),
        quantite: Number(quantite),
      };
    });

    console.log(
      "✅ Articles normalisés:",
      JSON.stringify(articlesNormalises, null, 2),
    );

    // Calcul du prix total
    const prixTotalCalcule =
      prix_total ||
      articlesNormalises.reduce(
        (total, article) => total + article.quantite * article.prixUnitaire,
        0,
      );

    const nouvelleCommande = await new Commande({
      idUtilisateur: req.utilisateur._id,
      restaurant,
      articles: articlesNormalises,
      prixTotal: Math.round(prixTotalCalcule * 100) / 100,
      heureArriveeEstimee: null,
    }).save();

    console.log("✅ Commande créée:", nouvelleCommande._id);
    res.status(201).json({ result: true, commande: nouvelleCommande });
  } catch (erreur) {
    console.error("❌ Erreur création commande:", erreur.message);
    res.status(500).json({ result: false, message: erreur.message });
  }
});

// ————————————————————————————————————————
// PUT /commandes/:id
// Met à jour l'étape d'une commande
// Si l'étape est "LIVREE", la commande est automatiquement finalisée
// ————————————————————————————————————————
routeur.put("/:id", verifierToken, async (req, res) => {
  try {
    const { etape } = req.body;

    const miseAJour = {
      "statut.etape": etape,
      "statut.estFinalisee": etape === "LIVREE",
    };

    const commandeMiseAJour = await Commande.findOneAndUpdate(
      { _id: req.params.id, idUtilisateur: req.utilisateur._id },
      { $set: miseAJour },
      { new: true },
    );

    if (!commandeMiseAJour)
      return res
        .status(404)
        .json({ result: false, message: "Commande introuvable" });

    res.json({ result: true, commande: commandeMiseAJour });
  } catch (erreur) {
    res.status(500).json({ result: false, message: erreur.message });
  }
});

module.exports = routeur;
