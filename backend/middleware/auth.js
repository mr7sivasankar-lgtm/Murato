const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (req.user.isBanned) {
        return res.status(403).json({ message: 'Your account has been banned' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminProtect = async (req, res, next) => {
  try {
    await protect(req, res, async () => {
      // Check for admin via email matching env var
      if (req.user.email === process.env.ADMIN_EMAIL) {
        next();
      } else {
        return res.status(403).json({ message: 'Admin access required' });
      }
    });
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized' });
  }
};

module.exports = { protect, adminProtect };
