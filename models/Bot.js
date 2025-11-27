// models/Bot.js
import mongoose from "mongoose";

const BotSchema = new mongoose.Schema({
  token: String,
  client_name: String,

  licenseKey: { type: String, required: true },

  approved: { type: Boolean, default: false },

  passwordEnabled: { type: Boolean, default: false },
  password: String,
  forceRestart: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model("Bot", BotSchema);
