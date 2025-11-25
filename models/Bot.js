import mongoose from "mongoose";

const BotSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  client_name: { type: String, required: true },
  servers: [
    {
      id: String,
      name: String,
      invite: String,
      admin: Boolean,
    }
  ],
  approved: { type: Boolean, default: false },
  passwordEnabled: { type: Boolean, default: false },
  password: { type: String, default: "" },
  lastCheck: { type: Date, default: Date.now }
});

export default mongoose.model("Bot", BotSchema);
