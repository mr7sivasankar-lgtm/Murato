const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    type: { type: String, enum: ['text', 'image', 'offer'], default: 'text' },
    offerAmount: { type: Number, default: 0 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
