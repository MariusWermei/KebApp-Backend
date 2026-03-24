var express = require("express");
var router = express.Router();

const User = require("../models/user");
const { checkBody } = require("../modules/checkBody");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const verifyToken = require("../modules/checkToken");

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const cloudinary = require("cloudinary").v2;
const uniqid = require("uniqid");
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==============================
// SIGNUP
// ==============================
router.post("/signup", async (req, res) => {
  if (!checkBody(req.body, ["email", "password"])) {
    return res.json({ result: false, error: "Missing or empty fields" });
  }

  try {
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
        avatar: savedUser.avatar || null,
      },
    });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// SIGNIN
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
        avatar: user.avatar || null,
      },
    });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// GOOGLE AUTH
// ==============================
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.json({ result: false, error: "Missing idToken" });

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

    let user = await User.findOne({ googleId });
    if (!user) user = await User.findOne({ email });

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
        avatar: user.avatar || null,
      },
    });
  } catch (e) {
    res.json({ result: false, error: e.message });
  }
});

// ==============================
// UPDATE PREFERENCES
// ==============================
router.put("/preferences", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ result: false, error: "Token manquant" });

    const user = await User.findOne({ token });
    if (!user)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    user.preferences = req.body.preferences;
    await user.save();

    res.json({ result: true, preferences: user.preferences });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// UPLOAD AVATAR (Cloudinary)
// ==============================
router.put("/avatar", async (req, res) => {
  let photoPath = null;

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ result: false, error: "Token manquant" });

    const user = await User.findOne({ token });
    if (!user)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    if (!req.files || !req.files.avatar) {
      return res.json({ result: false, error: "Fichier avatar manquant" });
    }

    photoPath = `./tmp/${uniqid()}.jpg`;
    const resultMove = await req.files.avatar.mv(photoPath);

    if (!resultMove) {
      const resultCloudinary = await cloudinary.uploader.upload(photoPath);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);

      user.avatar = resultCloudinary.secure_url;
      await user.save();

      res.json({ result: true, avatar: user.avatar });
    } else {
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      res.json({ result: false, error: resultMove });
    }
  } catch (error) {
    if (photoPath && fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// GET POINTS
// ==============================
router.get("/points", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ result: false, error: "Token manquant" });

    const user = await User.findOne({ token });
    if (!user)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    res.json({ result: true, points: user.points });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// UPDATE POINTS
// ==============================
router.put("/points", verifyToken, async (req, res) => {
  try {
    const { points } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $inc: { points: points } },
      { new: true },
    );

    if (!updatedUser)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    res.json({ result: true, points: updatedUser.points });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// FORGOT PASSWORD
// ==============================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ result: false, error: "Email manquant" });

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({
        result: true,
        message: "Email envoyé si le compte existe",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1h
    await user.save();

    const resetLink = `${process.env.RESET_URL}?token=${resetToken}`;

    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: user.email,
      subject: "Réinitialisation de ton mot de passe Kebapp 🔐",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
          <h2 style="color: #E8643C;">Réinitialisation de mot de passe</h2>
          <p>Tu as demandé à réinitialiser ton mot de passe Kebapp.</p>
          <p>Clique sur le bouton ci-dessous (valable 1h) :</p>
          <a href="${resetLink}" style="
            display: inline-block;
            background-color: #E8643C;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 16px 0;
          ">Réinitialiser mon mot de passe</a>
          <p style="color: #999; font-size: 12px;">
            Si tu n'es pas à l'origine de cette demande, ignore cet email.
          </p>
        </div>
      `,
    });

    res.json({ result: true, message: "Email envoyé si le compte existe" });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// RESET PASSWORD
// ==============================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.json({ result: false, error: "Token et mot de passe requis" });
    }

    if (newPassword.length < 8) {
      return res.json({
        result: false,
        error: "Le mot de passe doit faire au moins 8 caractères",
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.json({
        result: false,
        error: "Lien expiré ou invalide. Demande un nouveau lien.",
      });
    }

    user.password = bcrypt.hashSync(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ result: true, message: "Mot de passe réinitialisé" });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// GET FAVORITES
// ==============================
router.get("/favorites", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ result: false, error: "Token manquant" });

    const user = await User.findOne({ token }).populate("favorites");
    if (!user)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    res.json({ result: true, favorites: user.favorites });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// ADD FAVORITE
// ==============================
router.post("/favorites", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ result: false, error: "Token manquant" });

    const user = await User.findOne({ token });
    if (!user)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    await User.updateOne(
      { token },
      { $addToSet: { favorites: req.body.restaurantId } },
    );

    res.json({ result: true });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

// ==============================
// REMOVE FAVORITE
// ==============================
router.delete("/favorites", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ result: false, error: "Token manquant" });

    const user = await User.findOne({ token });
    if (!user)
      return res.json({ result: false, error: "Utilisateur non trouvé" });

    await User.updateOne(
      { token },
      { $pull: { favorites: req.body.restaurantId } },
    );

    res.json({ result: true });
  } catch (error) {
    res.json({ result: false, error: error.message });
  }
});

module.exports = router;
