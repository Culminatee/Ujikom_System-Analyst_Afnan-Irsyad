function isLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login');
  next();
}

function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
  next();
}

function isPetugas(req, res, next) {
  const role = req.session.user?.role;
  if (!req.session.user || (role !== 'petugas' && role !== 'admin')) return res.redirect('/');
  next();
}

module.exports = { isLogin, isAdmin, isPetugas };