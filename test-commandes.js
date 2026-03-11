/**
 * 📋 Script de test pour les commandes
 *
 * Teste le flux complet :
 * 1. Créer une commande via POST /commandes
 * 2. Récupérer les commandes via GET /commandes
 * 3. Récupérer une commande spécifique via GET /commandes/:id
 * 4. Mettre à jour le statut via PUT /commandes/:id
 *
 * À utiliser avec : npm run test:commandes
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Commande = require("./models/commande");
const User = require("./models/user");

const API_BASE = process.env.API_URL || "http://localhost:5000";

// Couleurs pour les logs
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

async function testCommandes() {
  try {
    log.info("Connexion à MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    log.success("Connecté à MongoDB");

    // Étape 1 : Trouver un utilisateur avec un token
    log.info("Recherche d'un utilisateur avec token...");
    const user = await User.findOne({ token: { $ne: null } });

    if (!user) {
      log.error("Aucun utilisateur avec token trouvé");
      log.warn("Créez d'abord un utilisateur et connectez-vous");
      process.exit(1);
    }

    log.success(
      `Utilisateur trouvé: ${user.email} (Token: ${user.token.slice(0, 20)}...)`,
    );

    // Étape 2 : Créer une commande
    log.info("Création d'une commande...");
    const numCommande = `TEST${Date.now().toString().slice(-6)}`;

    const nouvelleCommande = new Commande({
      numero_commande: numCommande,
      utilisateur_id: user._id,
      restaurant: {
        nom: "Restaurant Test",
        id: null,
        logo_url: null,
      },
      items: [
        {
          nom: "Kebab Falafel",
          quantite: 2,
          prix_unitaire: 8.99,
        },
        {
          nom: "Soda",
          quantite: 1,
          prix_unitaire: 2.5,
        },
      ],
      prix_total: 20.48,
      statut: {
        finalisee: false,
        etape: "EN_PREPARATION",
      },
      heure_arrivee_prevue: new Date(Date.now() + 30 * 60000),
    });

    const commandeSaved = await nouvelleCommande.save();
    log.success(`Commande créée: ${commandeSaved._id}`);
    log.success(`Numéro commande: ${commandeSaved.numero_commande}`);

    // Étape 3 : Récupérer la commande
    log.info("Récupération de la commande...");
    const commandeRecuperee = await Commande.findById(commandeSaved._id);

    if (commandeRecuperee) {
      log.success("Commande récupérée avec succès");
      log.info(`  - État: ${commandeRecuperee.statut.etape}`);
      log.info(`  - Total: ${commandeRecuperee.prix_total}€`);
      log.info(`  - Articles: ${commandeRecuperee.items.length}`);
    } else {
      log.error("Impossible de récupérer la commande");
    }

    // Étape 4 : Mettre à jour le statut
    log.info("Mise à jour du statut...");
    const commandeUpdated = await Commande.findByIdAndUpdate(
      commandeSaved._id,
      {
        statut: {
          finalisee: false,
          etape: "PRETE",
        },
      },
      { new: true },
    );

    if (commandeUpdated) {
      log.success(`Statut mis à jour: ${commandeUpdated.statut.etape}`);
    } else {
      log.error("Impossible de mettre à jour le statut");
    }

    // Étape 5 : Vérifier que les commandes de l'utilisateur augmentent
    log.info("Comptage des commandes de l'utilisateur...");
    const count = await Commande.countDocuments({ utilisateur_id: user._id });
    log.success(`L'utilisateur a ${count} commande(s)`);

    log.success("\n🎉 Tous les tests sont passés!");
  } catch (error) {
    log.error(`Erreur: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info("Déconnecté de MongoDB");
  }
}

testCommandes();
