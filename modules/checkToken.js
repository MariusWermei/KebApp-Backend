// ————————————————————————————————————————
// Authentication Middleware
// Verify token in header and attach user to request
// ————————————————————————————————————————

const User = require("../models/user");

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ result: false, message: "Token missing" });

  const user = await User.findOne({ token });
  if (!user)
    return res.status(401).json({ result: false, message: "Invalid token" });

  req.user = user;
  next();
};

module.exports = verifyToken;
