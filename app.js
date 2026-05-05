const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const db = require('./db');
const { isLogin } = require('./middleware/auth');

const app = express();

// Setup
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'ujikom_secret',
  resave: false,
  saveUninitialized: false
}));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/barang', require('./routes/barang'));
app.use('/peminjaman', require('./routes/peminjaman'));

app.get('/', (req, res) => res.redirect('/auth/login'));

// Dashboard
app.get('/dashboard', isLogin, (req, res) => {
  const user = req.session.user;

  const queryStats = `
    SELECT 
      COUNT(*) as total_peminjaman,
      SUM(status = 'menunggu') as menunggu,
      SUM(status = 'disetujui') as dipinjam,
      SUM(status = 'dikembalikan') as dikembalikan,
      SUM(status = 'ditolak') as ditolak
    FROM peminjaman
  `;

  let queryPeminjaman = `
    SELECT p.*, u.nama as nama_peminjam, b.nama_barang
    FROM peminjaman p
    JOIN users u ON p.user_id = u.id
    JOIN barang b ON p.barang_id = b.id
  `;
  let params = [];
  if (user.role === 'staf') {
    queryPeminjaman += ' WHERE p.user_id = ?';
    params.push(user.id);
  }
  queryPeminjaman += ' ORDER BY p.created_at DESC LIMIT 5';

  const queryBarang = 'SELECT * FROM barang ORDER BY nama_barang ASC';

  const queryLog = `
    SELECT l.*, u.nama as nama_user
    FROM log_aktivitas l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC LIMIT 10
  `;

  db.query(queryStats, (err, stats) => {
    db.query(queryPeminjaman, params, (err, peminjaman) => {
      db.query(queryBarang, (err, barang) => {
        db.query(queryLog, (err, log) => {
          res.render('dashboard', {
            user,
            stats: stats[0],
            peminjaman,
            barang,
            log
          });
        });
      });
    });
  });
});

app.listen(3000, () => console.log('Server jalan di http://localhost:3000'));