import express from "express";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import axios from "axios";
import authRouter from "./auth.js";
import Bot from "./models/Bot.js";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
session({
secret: process.env.SESSION_SECRET,
resave: false,
saveUninitialized: false,
})
);

// connect mongoose
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB connection error:", err));

// Auth routes
app.use("/auth", authRouter);

/* ------------------ Dashboard root ------------------ */
app.get("/", async (req, res) => {
if (!req.session.user || req.session.user.id !== process.env.ADMIN_ID) {
return res.redirect("/auth/login");
}

const bots = await Bot.find();
res.render("dashboard", { bots });
});

/* ------------------ Bot details ------------------ */
app.get("/dashboard/bot/:token", async (req, res) => {
if (!req.session.user || req.session.user.id !== process.env.ADMIN_ID) {
return res.status(403).send("Access Denied");
}

const bot = await Bot.findOne({ token: req.params.token });
if (!bot) return res.status(404).send("Bot not found");
res.render("botDetails", { bot });
});

/* ------------------ Approve / Unapprove ------------------ */
app.post("/dashboard/approve", async (req, res) => {
const { token } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

bot.approved = true;
await bot.save();
console.log(`Bot approved: ${bot.client_name} (${bot.token})`);
res.redirect("/");
});

app.post("/dashboard/unapprove", async (req, res) => {
const { token } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

bot.approved = false;
await bot.save();
console.log(`Bot unapproved: ${bot.client_name} (${bot.token})`);
res.redirect("/");
});

/* ------------------ Stop bot (remote kill) ------------------ */
app.post("/dashboard/stop-bot", async (req, res) => {
const { token } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

if (!bot.internalURL) {
console.log("No internalURL set for bot — cannot send kill signal.");
return res.redirect(`/dashboard/bot/${token}`);
}

try {
await axios.post(`${bot.internalURL}/internal/kill`, { key: process.env.INTERNAL_API_KEY }, { timeout: 5000 });
console.log(`Stop signal sent to bot ${bot.client_name}`);
} catch (err) {
console.log("Bot stop request failed:", err.message);
}

res.redirect(`/dashboard/bot/${token}`);
});

/* ------------------ Password toggle + force restart ------------------ */
app.post("/dashboard/password", async (req, res) => {
const { token, enable, password } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

bot.passwordEnabled = enable === "true";
if (enable === "true" && password) bot.password = password;

// Set flag to force bot exit
bot.forceRestart = enable === "true";

await bot.save();

console.log(`${enable === "true" ? "Enabled" : "Disabled"} password for bot ${bot.client_name}`);

res.redirect(`/dashboard/bot/${token}`);
});

/* ------------------ API routes ------------------ */
const api = express.Router();

api.post("/register-bot", async (req, res) => {
try {
const { token, client_name, servers, internalURL } = req.body;
const existing = await Bot.findOne({ token });
if (existing) return res.status(400).json({ error: "Bot already registered" });


const newBot = new Bot({ token, client_name, servers, internalURL });
await newBot.save();
console.log(`Registered new bot: ${client_name}`);
return res.json({ message: "Bot registered successfully, waiting for approval" });


} catch (err) {
console.error("register-bot error:", err);
res.status(500).json({ error: "Server error" });
}
});

api.get("/check-activation", async (req, res) => {
try {
const { token } = req.query;
const bot = await Bot.findOne({ token });


if (!bot) return res.json({ approved: false });

// Reset forceRestart if bot was manually restarted and password is passed
if (!bot.forceRestart && bot.passwordEnabled) {
  await Bot.updateOne({ token }, { forceRestart: false });
}

return res.json({
  approved: bot.approved,
  passwordEnabled: bot.passwordEnabled,
  password: bot.password,
  forceRestart: bot.forceRestart || false,
});


} catch (err) {
console.error("check-activation error:", err);
res.status(500).json({ error: "Server error" });
}
});

api.post("/check-activation-reset", async (req, res) => {
  try {
    const { token } = req.body;
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(404).json({ error: "Bot not found" });

    bot.forceRestart = false;
    await bot.save();

    res.json({ message: "ForceRestart reset" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});



api.post("/update-servers", async (req, res) => {
  try {
    const { token, servers } = req.body; // servers = [{id,name,invite,permissions}]
    const bot = await Bot.findOne({ token });
    if (!bot) return res.status(400).json({ error: "Bot not registered" });

    bot.servers = servers; // save all servers
    bot.lastCheck = new Date();
    await bot.save();
    return res.json({ message: "Servers updated" });
  } catch (err) {
    console.error("update-servers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.use("/api", api);

/* ------------------ start server ------------------ */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
