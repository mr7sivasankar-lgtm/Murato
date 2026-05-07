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
const bannersRoutes    = require('./routes/banners');

const app = express();
const server = http.createServer(app);

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://myillo.vercel.app',
  'https://myillo-admin.vercel.app',
  // Keep old URLs during transition
  'https://murato.vercel.app',
  'https://murato-admin.vercel.app',
  // Capacitor Android & iOS apps send these origins
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  // Allow all Vercel preview domains dynamically
  /^https:\/\/myillo.*\.vercel\.app$/,
  /^https:\/\/murato.*\.vercel\.app$/
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Check if origin matches exactly or matches the regex
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Middleware
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
app.use('/api/banners',    bannersRoutes);

// Health check
app.get('/', (_req, res) => {
  res.json({ message: '🏗️ Myillo API is running!', status: 'ok' });
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
      console.log(`🚀 Myillo server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
