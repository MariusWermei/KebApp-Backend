const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // AUTH
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "apple"],
      default: "local",
      required: true,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    appleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    token: {
      type: String,
    },

    avatar: {
      type: String,
    },

    preferences: [String],

    // GEO
    // location: {
    //   type: {
    //     type: String,
    //     enum: ["Point"],
    //     default: "Point",
    //   },
    //   coordinates: {
    //     type: [Number], // [longitude, latitude]
    //     default: undefined, // évite de créer un point vide
    //   },
    // },

    // RELATIONS & GAMIFICATION
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
      },
    ],

    points: {
      type: Number,
      default: 0,
    },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  {
    timestamps: true,
  },
);

// Index géospatial
// userSchema.index({ location: "2dsphere" });

// Middleware pre-save
// userSchema.pre("save", function (next) {
//   if (this.authProvider === "local" && !this.password) {
//     return next(
//       new Error("Un mot de passe est requis pour les comptes locaux."),
//     );
//   }
//   next();
// });

module.exports = mongoose.model("User", userSchema);
