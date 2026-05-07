const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendPush } = require('../utils/sendPush');

// @POST /api/chat/start — Start or get existing chat
router.post('/start', protect, async (req, res) => {
  try {
    const { sellerId, adId } = req.body;
    const buyerId = req.user._id.toString();

    if (buyerId === sellerId) {
      return res.status(400).json({ message: "You can't chat with yourself" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      adId,
      participants: { $all: [buyerId, sellerId] },
    })
      .populate('participants', 'name avatar phone')
      .populate('adId', 'title images price');

    if (!chat) {
      chat = await Chat.create({ participants: [buyerId, sellerId], adId });
      chat = await Chat.findById(chat._id)
        .populate('participants', 'name avatar phone')
        .populate('adId', 'title images price');
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/chat/mine — Get my chats
router.get('/mine', protect, async (req, res) => {
  try {
    const { filter } = req.query; // 'all' | 'buying' | 'selling'
    const userId = req.user._id;

    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name avatar phone')
      .populate('adId', 'title images price userId')
      .sort({ lastMessageAt: -1 });

    let filtered = chats;
    if (filter === 'buying') {
      filtered = chats.filter((c) => {
        const ad = c.adId;
        return ad && ad.userId && ad.userId.toString() !== userId.toString();
      });
    } else if (filter === 'selling') {
      filtered = chats.filter((c) => {
        const ad = c.adId;
        return ad && ad.userId && ad.userId.toString() === userId.toString();
      });
    }

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @GET /api/chat/:chatId/messages
router.get('/:chatId/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (!chat.participants.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { chatId: req.params.chatId, senderId: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @POST /api/chat/:chatId/messages — Send message (REST fallback)
router.post('/:chatId/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const { text, type, offerAmount } = req.body;
    const message = await Message.create({
      chatId: req.params.chatId,
      senderId: req.user._id,
      text: text || '',
      type: type || 'text',
      offerAmount: offerAmount || 0,
    });

    // Update chat last message
    chat.lastMessage = text || (type === 'offer' ? `Offer: ₹${offerAmount}` : '📷 Image');
    chat.lastMessageAt = new Date();
    await chat.save();

    const populated = await message.populate('senderId', 'name avatar');

    // Emit via socket
    if (req.io) {
      req.io.to(req.params.chatId).emit('receive_message', populated);
    }

    // Send push notification to the OTHER participant
    try {
      const recipientId = chat.participants.find(
        (p) => p.toString() !== req.user._id.toString()
      );
      if (recipientId) {
        const recipient = await User.findById(recipientId).select('fcmToken name');
        if (recipient?.fcmToken) {
          const senderName = req.user.name || 'Someone';
          const msgPreview = type === 'offer'
            ? `💰 Offer: ₹${offerAmount}`
            : text?.slice(0, 60) || '📷 Image';
          await sendPush(
            recipient.fcmToken,
            `${senderName} sent a message`,
            msgPreview,
            { type: 'chat', chatId: req.params.chatId }
          );
        }
      }
    } catch (pushErr) {
      console.warn('[Push] Non-critical error:', pushErr.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
