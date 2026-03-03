var express = require("express");
var router = express.Router();

require("../models/connection");
const User = require("../models/user");
const { checkBody } = require("../modules/checkBody");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const appleJwks = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// SIGNUP (création compte local)

router.post("/signup", async (req, res) => {
  console.log("BODY =", req.body);
  if (!checkBody(req.body, ["email", "password"])) {
    return res.json({ result: false, error: "Missing or empty fields" });
  }

  try {
    // Vérifie si email déjà utilisé
    const existingUser = await User.findOne({
      email: req.body.email.toLowerCase(),
    });

    if (existingUser) {
      return res.json({ result: false, error: "User already exists" });
    }

    const hash = bcrypt.hashSync(req.body.password, 10);

    const newUser = new User({
      username: req.body.username || null,
      email: req.body.email.toLowerCase(),
      password: hash,
      authProvider: "local",
      token: uid2(32),
      avatar: req.body.avatar || null,
      preferences: req.body.preferences || [],
      points: 0,
    });

    const savedUser = await newUser.save();

    res.json({
      result: true,
      token: savedUser.token,
      user: {
        id: savedUser._id,
        email: savedUser.email,
        username: savedUser.username,
        points: savedUser.points,
      },
    });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// SIGNIN (connexion locale)
// ==============================
router.post("/signin", async (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    return res.json({ result: false, error: "Missing or empty fields" });
  }

  try {
    const user = await User.findOne({
      email: req.body.email.toLowerCase(),
      authProvider: "local",
    });

    if (!user) {
      return res.json({
        result: false,
        error: "Mot de passe ou email incorrect",
      });
    }

    if (!bcrypt.compareSync(req.body.password, user.password)) {
      return res.json({
        result: false,
        error: "Mot de passe ou email incorrect",
      });
    }

    // Optionnel : régénérer un token à chaque login
    user.token = uid2(32);
    await user.save();

    res.json({
      result: true,
      token: user.token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        points: user.points,
      },
    });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.json({ result: false, error: "Missing idToken" });

    // Vérifie le token Google (signature + audience)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = (payload.email || "").toLowerCase();
    const avatar = payload.picture || null;

    if (!email)
      return res.json({ result: false, error: "Google email missing" });

    // Cherche user existant Google
    let user = await User.findOne({ googleId });

    // Sinon : si un compte local existe avec le même email, tu peux le "lier"
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user) {
      user = new User({
        email,
        authProvider: "google",
        googleId,
        avatar,
        token: uid2(32),
      });
    } else {
      user.authProvider = "google";
      user.googleId = googleId;
      user.avatar = user.avatar || avatar;
      user.token = uid2(32); // régénère ton token session
    }

    await user.save();

    res.json({
      result: true,
      token: user.token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        points: user.points,
      },
    });
  } catch (e) {
    res.json({ result: false, error: e.message });
  }
});

//conexion with apple

function getAppleKey(header, cb) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return cb(err);
    const signingKey = key.getPublicKey();
    cb(null, signingKey);
  });
}

router.post("/apple", async (req, res) => {
  try {
    const { identityToken } = req.body;
    if (!identityToken)
      return res.json({ result: false, error: "Missing identityToken" });

    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        identityToken,
        getAppleKey,
        {
          algorithms: ["RS256"],
          audience: process.env.APPLE_CLIENT_ID, // Services ID ou Bundle ID selon ton setup
          issuer: "https://appleid.apple.com",
        },
        (err, payload) => (err ? reject(err) : resolve(payload)),
      );
    });

    const appleId = decoded.sub;
    const email = decoded.email ? decoded.email.toLowerCase() : null;

    // Apple ne renvoie pas toujours l'email à chaque login (souvent seulement la première fois)
    let user = await User.findOne({ appleId });
    if (!user && email) user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email: email || `apple_${appleId}@no-email.local`, // solution simple si pas d'email
        authProvider: "apple",
        appleId,
        token: uid2(32),
      });
    } else {
      user.authProvider = "apple";
      user.appleId = appleId;
      user.token = uid2(32);
    }

    await user.save();

    res.json({
      result: true,
      token: user.token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        points: user.points,
      },
    });
  } catch (e) {
    res.json({ result: false, error: e.message });
  }
});

// UPDATE PREFERENCES (tags onboarding)
router.put("/preferences", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.json({ result: false, error: "Token manquant" });
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.json({ result: false, error: "Utilisateur non trouvé" });
    }

    user.preferences = req.body.preferences;
    await user.save();

    res.json({ result: true, preferences: user.preferences });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

module.exports = router;
