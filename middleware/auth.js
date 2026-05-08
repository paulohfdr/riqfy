const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'riqfy-secret-2025';

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Não autenticado' });
  try {
    req.usuario = jwt.verify(token, SECRET);
    req.tenantId = req.usuario.tenantId;
    req.tenantSlug = req.usuario.slug;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido' });
  }
}

function authAdmin(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.usuario.nivel !== 'administrador') return res.status(403).json({ erro: 'Acesso negado' });
    next();
  });
}

module.exports = { authMiddleware, authAdmin, SECRET };
