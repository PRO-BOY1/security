import express from "express";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
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

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log("MongoDB connection error:", err));

// ------------------ DASHBOARD ------------------ //
app.get("/", async (req, res) => {
if (!req.session.user || req.session.user.id !== process.env.ADMIN_ID) {
return res.redirect("/auth/login");
}

const bots = await Bot.find();
res.render("dashboard", { bots });
});

// ------------------ BOT DETAILS ------------------ //
app.get("/dashboard/bot/:token", async (req, res) => {
if (!req.session.user || req.session.user.id !== process.env.ADMIN_ID) {
return res.status(403).send("Access Denied");
}

const bot = await Bot.findOne({ token: req.params.token });
if (!bot) return res.status(404).send("Bot not found");

res.render("botDetails", { bot });
});

// ------------------ APPROVE / UNAPPROVE ------------------ //
app.post("/dashboard/approve", async (req, res) => {
const { token } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

bot.approved = true;
await bot.save();
res.redirect("/");
});

app.post("/dashboard/unapprove", async (req, res) => {
const { token } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

bot.approved = false;
await bot.save();
res.redirect("/");
});

// ------------------ PASSWORD TOGGLE ------------------ //
app.post("/dashboard/password", async (req, res) => {
const { token, enable, password } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(404).send("Bot not found");

bot.passwordEnabled = enable === "true";
if (enable === "true" && password) bot.password = password;
await bot.save();

// Optional: Force bot restart by sending a signal or killing it (depends on host)
// Example: process.exit() if bot hosted on same server
// TODO: Implement according to deployment method

res.redirect(`/dashboard/bot/${token}`);
});

// ------------------ STATIC ROUTES ------------------ //
app.use("/auth", (await import("./auth.js")).default);

// ------------------ API FOR BOT ------------------ //
app.post("/api/register-bot", async (req, res) => {
try {
const { token, client_name, servers } = req.body;
const existing = await Bot.findOne({ token });
if (existing) return res.status(400).json({ error: "Bot already registered" });

```
const newBot = new Bot({ token, client_name, servers });
await newBot.save();
res.json({ message: "Bot registered successfully, waiting for approval" });
```

} catch (err) {
console.error(err);
res.status(500).json({ error: "Server error" });
}
});

app.get("/api/check-activation", async (req, res) => {
try {
const { token } = req.query;
const bot = await Bot.findOne({ token });
if (!bot) return res.json({ approved: false });

```
res.json({
  approved: bot.approved,
  passwordEnabled: bot.passwordEnabled,
  password: bot.password,
});
```

} catch (err) {
console.error(err);
res.status(500).json({ error: "Server error" });
}
});

app.post("/api/update-servers", async (req, res) => {
try {
const { token, servers } = req.body;
const bot = await Bot.findOne({ token });
if (!bot) return res.status(400).json({ error: "Bot not registered" });

```
bot.servers = servers;
bot.lastCheck = new Date();
await bot.save();
res.json({ message: "Servers updated" });
```

} catch (err) {
console.error(err);
res.status(500).json({ error: "Server error" });
}
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
