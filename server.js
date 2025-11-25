import express from "express";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import authRouter from "./auth.js";
import Bot from "./models/Bot.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Auth routes
app.use("/auth", authRouter);

// ------------------ MongoDB ------------------ //
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// ------------------ Website Routes ------------------ //
app.get("/", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  if (req.session.user.id !== process.env.ADMIN_ID)
    return res.status(403).send("Access Denied");

  res.render("dashboard", {
    user: req.session.user,
    passwordEnabled: process.env.PASSWORD_ENABLED === "true",
  });
});

app.post("/toggle-password", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  if (req.session.user.id !== process.env.ADMIN_ID)
    return res.status(403).send("Access Denied");

  process.env.PASSWORD_ENABLED =
    process.env.PASSWORD_ENABLED === "true" ? "false" : "true";

  res.redirect("/");
});

// ------------------ API Routes ------------------ //
app.post('/api/register-bot', async (req, res) => {
  try {
    const { token, client_name, servers } = req.body;
    let existing = await Bot.findOne({ token });
    if (existing) return res.status(400).json({ error: 'Bot already registered' });

    const newBot = new Bot({ token, client_name, servers });
    await newBot.save();
    return res.json({ message: 'Bot registered successfully, waiting for approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/check-activation', async (req, res) => {
  try {
    const { token } = req.query;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.json({ approved: false });

    return res.json({
      approved: bot.approved,
      passwordEnabled: bot.passwordEnabled,
      password: bot.password
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/update-servers', async (req, res) => {
  try {
    const { token, servers } = req.body;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(400).json({ error: 'Bot not registered' });

    bot.servers = servers;
    bot.lastCheck = new Date();
    await bot.save();

    return res.json({ message: 'Servers updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin dashboard
app.get('/dashboard', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (userId !== process.env.ADMIN_DISCORD_ID) return res.send('Access denied');
    const bots = await Bot.find();
    res.render('dashboard', { bots });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/dashboard/approve', async (req, res) => {
  try {
    const { token } = req.body;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(400).send('Bot not found');

    bot.approved = true;
    await bot.save();
    res.json({ message: 'Bot approved' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/dashboard/password', async (req, res) => {
  try {
    const { token, enable, password } = req.body;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(400).send('Bot not found');

    bot.passwordEnabled = enable;
    if (enable && password) bot.password = password;
    await bot.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Password status (bot can check)
app.get("/api/password-status", (req, res) => {
  res.json({
    passwordEnabled: process.env.PASSWORD_ENABLED === "true"
  });
});

// ------------------ Start Server ------------------ //
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on port ${port}`));
