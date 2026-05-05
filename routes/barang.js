const express = require('express');
const router = express.Router();
const db = require('../db');
const { isLogin, isPetugas } = require('../middleware/auth');

// READ - daftar barang
router.get('/', isLogin, (req, res) => {
  const search = req.query.search || '';
  db.query(
    'SELECT * FROM barang WHERE nama_barang LIKE ? OR kode_barang LIKE ? ORDER BY created_at DESC',
    [`%${search}%`, `%${search}%`],
    (err, results) => {
      res.render('barang/index', { barang: results, user: req.session.user, search });
    }
  );
});

// CREATE - form
router.get('/create', isPetugas, (req, res) => {
  res.render('barang/create', { user: req.session.user, error: null });
});

// CREATE - proses
router.post('/', isPetugas, (req, res) => {
  const { kode_barang, nama_barang, jumlah } = req.body;
  db.query(
    'INSERT INTO barang (kode_barang, nama_barang, jumlah) VALUES (?, ?, ?)',
    [kode_barang, nama_barang, jumlah],
    (err) => {
      if (err) return res.render('barang/create', { user: req.session.user, error: 'Kode barang sudah ada!' });
      db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
        [req.session.user.id, 'Tambah Barang', `Menambahkan barang: ${nama_barang}`]);
      res.redirect('/barang');
    }
  );
});

// EDIT - form
router.get('/:id/edit', isPetugas, (req, res) => {
  db.query('SELECT * FROM barang WHERE id = ?', [req.params.id], (err, results) => {
    if (results.length === 0) return res.redirect('/barang');
    res.render('barang/edit', { barang: results[0], user: req.session.user, error: null });
  });
});

// EDIT - proses
router.put('/:id', isPetugas, (req, res) => {
  const { kode_barang, nama_barang, jumlah } = req.body;
  db.query(
    'UPDATE barang SET kode_barang=?, nama_barang=?, jumlah=? WHERE id=?',
    [kode_barang, nama_barang, jumlah, req.params.id],
    (err) => {
      if (err) return res.render('barang/edit', { user: req.session.user, error: 'Kode barang sudah ada!' });
      db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
        [req.session.user.id, 'Edit Barang', `Mengedit barang ID: ${req.params.id}`]);
      res.redirect('/barang');
    }
  );
});

// DELETE
router.delete('/:id', isPetugas, (req, res) => {
  db.query('SELECT nama_barang FROM barang WHERE id = ?', [req.params.id], (err, results) => {
    const nama = results[0]?.nama_barang;
    db.query('DELETE FROM barang WHERE id = ?', [req.params.id], () => {
      db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
        [req.session.user.id, 'Hapus Barang', `Menghapus barang: ${nama}`]);
      res.redirect('/barang');
    });
  });
});

module.exports = router;