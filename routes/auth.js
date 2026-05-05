const express = require('express');
const router = express.Router();
const db = require('../db');

// Halaman login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { error: null });
});

// Proses login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query(
    'SELECT * FROM users WHERE username = ? AND password = MD5(?)',
    [username, password],
    (err, results) => {
      if (err || results.length === 0) {
        return res.render('auth/login', { error: 'Username atau password salah!' });
      }
      req.session.user = results[0];
      res.redirect('/dashboard');
    }
  );
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;