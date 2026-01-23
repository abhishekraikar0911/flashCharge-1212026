const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../services/db');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post('/register', [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  validate
], async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, email, role, created_at, is_active) VALUES (?, ?, ?, ?, NOW(), 1)',
      [username, hashedPassword, email || null, 'user']
    );

    const token = jwt.sign(
      { id: result.insertId, username, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: result.insertId, username, role: 'user' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', [
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
  validate
], async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await db.query(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query(
      'SELECT id, username, role, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;
