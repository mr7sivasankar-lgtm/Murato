const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Route imports
const authRoutes       = require('./routes/auth');
const adsRoutes        = require('./routes/ads');
const ratingsRoutes    = require('./routes/ratings');
const shopsRoutes      = require('./routes/shops');
const chatRoutes       = require('./routes/chat');
const categoriesRoutes = require('./routes/categories');
const adminRoutes      = require('./routes/admin');
const usersRoutes      = require('./routes/users');
const supportRoutes    = require('./routes/support');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Attach io to request
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/ads',        adsRoutes);
app.use('/api/ratings',    ratingsRoutes);
app.use('/api/shops',      shopsRoutes);
app.use('/api/chat',       chatRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/support',    supportRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ message: '🏗️ Murato API is running!', status: 'ok' });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Join a chat room
  socket.on('join_room', (chatId) => {
    socket.join(chatId);
    console.log(`User joined room: ${chatId}`);
  });

  // Send message
  socket.on('send_message', (data) => {
    io.to(data.chatId).emit('receive_message', data);
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('typing', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Murato server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
