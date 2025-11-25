import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import bodyParser from "body-parser";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import Bot from "./models/Bot.js";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------------------- MONGO ---------------------- //
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// ---------------------- DASHBOARD ---------------------- //
app.get("/dashboard", async (req, res) => {
  const userId = req.query.userId;
  if (userId !== process.env.ADMIN_ID) return res.send("Access Denied");

  const bots = await Bot.find();
  res.render("dashboard", { bots });
});

// Approve a bot
app.post("/dashboard/approve", async (req, res) => {
  const { token } = req.body;
  const bot = await Bot.findOne({ token });
  if (!bot) return res.status(404).send("Bot not found");

  bot.approved = true;
  await bot.save();
  res.redirect("/dashboard?userId=" + process.env.ADMIN_ID);
});

// Enable / disable password
app.post("/dashboard/password", async (req, res) => {
  const { token, enable, password } = req.body;
  const bot = await Bot.findOne({ token });
  if (!bot) return res.status(404).send("Bot not found");

  bot.passwordEnabled = enable === "true";
  if (enable === "true" && password) bot.password = password;
  await bot.save();
  res.redirect("/dashboard?userId=" + process.env.ADMIN_ID);
});

// ---------------------- API ---------------------- //
// Register bot (first-run)
app.post("/api/register-bot", async (req, res) => {
  const { token, client_name, servers } = req.body;
  const existing = await Bot.findOne({ token });
  if (existing) return res.status(400).json({ error: "Bot already registered" });

  const newBot = new Bot({ token, client_name, servers });
  await newBot.save();
  res.json({ message: "Bot registered, waiting for approval" });
});

// Check activation
app.get("/api/check-activation", async (req, res) => {
  const { token } = req.query;
  const bot = await Bot.findOne({ token });
  if (!bot) return res.json({ approved: false });

  res.json({
    approved: bot.approved,
    passwordEnabled: bot.passwordEnabled,
    password: bot.password
  });
});

// Update servers list
app.post("/api/update-servers", async (req, res) => {
  const { token, servers } = req.body;
  const bot = await Bot.findOne({ token });
  if (!bot) return res.status(400).json({ error: "Bot not registered" });

  bot.servers = servers;
  bot.lastCheck = new Date();
  await bot.save();
  res.json({ message: "Servers updated" });
});


// Serve dashboard page
app.get("/", async (req, res) => {
  // simple auth by query for now
  const userId = req.query.userId;
  if (userId !== process.env.ADMIN_DISCORD_ID) {
    return res.send("Access Denied");
  }

  // get all bots
  const bots = await Bot.find();
  res.render("dashboard", { bots });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
