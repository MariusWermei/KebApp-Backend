require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const fileUpload = require("express-fileupload");

require("./models/connection");

const usersRouter = require("./routes/users");
const restaurantsRouter = require("./routes/restaurants");
const restaurantsDetailRouter = require("./routes/restaurantDetail");
const commandesRouter = require("./routes/commandes");

const app = express();

app.use(cors());
app.use(logger("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());

app.use(express.static(path.join(__dirname, "public")));

app.use("/users", usersRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/restaurants", restaurantsDetailRouter);
app.use("/commandes", commandesRouter);

module.exports = app;
