// models/Bot.js
import mongoose from "mongoose";

const BotSchema = new mongoose.Schema({
  token: String,
  client_name: String,
  servers: [
    {
      id: String,
      name: String,
      invite: String,
      permissions: Number, // Discord permissions integer
    },
  ],
  internalURL: String,
  approved: { type: Boolean, default: false },
  passwordEnabled: { type: Boolean, default: false },
  password: String,
  forceRestart: { type: Boolean, default: false },
  lastCheck: Date,
});

export default mongoose.model("Bot", BotSchema);
