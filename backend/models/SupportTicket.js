const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject:  { type: String, required: true, trim: true },
    message:  { type: String, required: true, trim: true },
    status:   { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    adminNote:{ type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
