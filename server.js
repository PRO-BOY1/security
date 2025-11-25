import express from "express";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import authRouter from "./auth.js";

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

app.use("/auth", authRouter);

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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running on port ${port}`));
