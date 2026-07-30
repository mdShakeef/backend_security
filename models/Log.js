const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  photoUrl: { type: String, required: true },
  openedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['UNREAD', 'READ'], default: 'UNREAD' }
});

module.exports = mongoose.model('SecurityLog', securityLogSchema);