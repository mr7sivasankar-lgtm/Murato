const express = require('express');
const router  = express.Router();
const SupportTicket = require('../models/SupportTicket');
const { protect, adminProtect } = require('../middleware/auth');

// @POST /api/support  — user submits a ticket
router.post('/', protect, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message)
      return res.status(400).json({ message: 'Subject and message are required' });

    const ticket = await SupportTicket.create({
      userId:  req.user._id,
      subject: subject.trim(),
      message: message.trim(),
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/support  — admin: list all tickets
router.get('/', adminProtect, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip    = (Number(page) - 1) * Number(limit);
    const total   = await SupportTicket.countDocuments(filter);
    const tickets = await SupportTicket.find(filter)
      .populate('userId', 'name phone businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({ tickets, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/support/:id  — admin: update status / add note
router.put('/:id', adminProtect, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    ).populate('userId', 'name phone businessName');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/support/:id  — admin: delete ticket
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    await SupportTicket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
