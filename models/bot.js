const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  id: String,
  name: String,
  inviteLink: String,
  hasAdmin: Boolean
});

const botSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  client_name: { type: String, required: true },
  servers: [serverSchema],
  approved: { type: Boolean, default: false },
  passwordEnabled: { type: Boolean, default: false },
  password: { type: String, default: "" },
  firstRun: { type: Date, default: Date.now },
  lastCheck: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bot', botSchema);
