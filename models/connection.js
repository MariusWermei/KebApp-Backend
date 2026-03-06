const mongoose = require("mongoose");

const connectionString = process.env.MONGODB_URI;

mongoose
  .connect(connectionString)
  .then(() => console.log("DATABASE CONNECTED"))
  .catch((error) => console.error(error));
