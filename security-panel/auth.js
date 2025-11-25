import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.get("/login", (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(
    process.env.REDIRECT_URI
  )}&response_type=code&scope=identify`;
  res.redirect(redirect);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;

  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.REDIRECT_URI,
  });

  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  const tokenRes = await axios.post(
    "https://discord.com/api/oauth2/token",
    data,
    { headers }
  );

  const userRes = await axios.get("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  req.session.user = userRes.data;

  res.redirect("/");
});

export default router;
