const express = require('express');
const router = express.Router();
const db = require('../db');
const { isLogin, isPetugas } = require('../middleware/auth');

// READ - daftar peminjaman
router.get('/', isLogin, (req, res) => {
  const user = req.session.user;
  let query = `
    SELECT p.*, u.nama as nama_peminjam, b.nama_barang, b.kode_barang
    FROM peminjaman p
    JOIN users u ON p.user_id = u.id
    JOIN barang b ON p.barang_id = b.id
  `;
  let params = [];

  // Staf hanya lihat miliknya sendiri
  if (user.role === 'staf') {
    query += ' WHERE p.user_id = ?';
    params.push(user.id);
  }

  query += ' ORDER BY p.created_at DESC';

  db.query(query, params, (err, results) => {
    res.render('peminjaman/index', { peminjaman: results, user });
  });
});

// CREATE - form ajukan peminjaman
router.get('/create', isLogin, (req, res) => {
  db.query('SELECT * FROM barang WHERE jumlah > 0', (err, barang) => {
    res.render('peminjaman/create', { barang, user: req.session.user, error: null });
  });
});

// CREATE - proses ajukan
router.post('/', isLogin, (req, res) => {
  const { barang_id, jumlah, tgl_pinjam, tgl_kembali_rencana, catatan } = req.body;
  const user = req.session.user;

  // Cek stok cukup
  db.query('SELECT * FROM barang WHERE id = ?', [barang_id], (err, results) => {
    const barang = results[0];
    if (!barang || barang.jumlah < jumlah) {
      return db.query('SELECT * FROM barang WHERE jumlah > 0', (err, barangList) => {
        res.render('peminjaman/create', {
          barang: barangList, user,
          error: 'Stok barang tidak mencukupi!'
        });
      });
    }

    // Generate kode pinjam
    const kode_pinjam = 'PJM-' + Date.now();

    db.query(
      'INSERT INTO peminjaman (kode_pinjam, user_id, barang_id, jumlah, tgl_pinjam, tgl_kembali_rencana, catatan) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [kode_pinjam, user.id, barang_id, jumlah, tgl_pinjam, tgl_kembali_rencana, catatan],
      (err) => {
        if (err) return res.redirect('/peminjaman');
        db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
          [user.id, 'Ajukan Peminjaman', `Mengajukan peminjaman: ${barang.nama_barang} (${jumlah} unit)`]);
        res.redirect('/peminjaman');
      }
    );
  });
});

// SETUJUI peminjaman
router.post('/:id/setujui', isPetugas, (req, res) => {
  const user = req.session.user;
  db.query(
    `SELECT p.*, p.jumlah as jumlah_pinjam, b.nama_barang, b.jumlah as stok 
     FROM peminjaman p 
     JOIN barang b ON p.barang_id = b.id 
     WHERE p.id = ?`,
    [req.params.id], (err, results) => {
      const pinjam = results[0];
      if (!pinjam || pinjam.status !== 'menunggu') return res.redirect('/peminjaman');

      // Kurangi stok barang
      db.query('UPDATE barang SET jumlah = jumlah - ? WHERE id = ?', [pinjam.jumlah_pinjam, pinjam.barang_id]);
      db.query('UPDATE peminjaman SET status = "disetujui", petugas_id = ? WHERE id = ?',
        [user.id, req.params.id], () => {
          db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
            [user.id, 'Setujui Peminjaman', `Menyetujui peminjaman: ${pinjam.nama_barang}`]);
          res.redirect('/peminjaman');
        });
    });
});

// TOLAK peminjaman
router.post('/:id/tolak', isPetugas, (req, res) => {
  const user = req.session.user;
  db.query('SELECT p.*, b.nama_barang FROM peminjaman p JOIN barang b ON p.barang_id = b.id WHERE p.id = ?',
    [req.params.id], (err, results) => {
      const pinjam = results[0];
      if (!pinjam || pinjam.status !== 'menunggu') return res.redirect('/peminjaman');

      db.query('UPDATE peminjaman SET status = "ditolak", petugas_id = ? WHERE id = ?',
        [user.id, req.params.id], () => {
          db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
            [user.id, 'Tolak Peminjaman', `Menolak peminjaman: ${pinjam.nama_barang}`]);
          res.redirect('/peminjaman');
        });
    });
});

// KEMBALIKAN barang
router.post('/:id/kembalikan', isPetugas, (req, res) => {
  const user = req.session.user;
  db.query('SELECT p.*, b.nama_barang FROM peminjaman p JOIN barang b ON p.barang_id = b.id WHERE p.id = ?',
    [req.params.id], (err, results) => {
      const pinjam = results[0];
      if (!pinjam || pinjam.status !== 'disetujui') return res.redirect('/peminjaman');

      // Kembalikan stok
      db.query('UPDATE barang SET jumlah = jumlah + ? WHERE id = ?', [pinjam.jumlah, pinjam.barang_id]);
      db.query('UPDATE peminjaman SET status = "dikembalikan", tgl_kembali_aktual = CURDATE() WHERE id = ?',
        [req.params.id], () => {
          db.query('INSERT INTO log_aktivitas (user_id, aksi, keterangan) VALUES (?, ?, ?)',
            [user.id, 'Kembalikan Barang', `Mengembalikan barang: ${pinjam.nama_barang}`]);
          res.redirect('/peminjaman');
        });
    });
});

module.exports = router;