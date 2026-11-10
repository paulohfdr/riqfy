const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getMasterDb } = require('../db/master');
const { getDb, pool } = require('../db/database');
const { SECRET, authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

const cadastro = require('../utils/cadastro');

const isProd = process.env.NODE_ENV === 'production';

// Rate limit específico para login: 10 tentativas / 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

// Login multi-tenant
router.post('/login', loginLimiter, validate(schemas.login), async (req, res) => {
  const { username, senha } = req.body;

  try {
    const masterDb = await getMasterDb();
    const tenants = await masterDb.all("SELECT * FROM tenants WHERE status = 'ativo'");

    let user = null;
    let tenant = null;

    for (const t of tenants) {
      const db = await getDb(t.slug);
      const found = await db.get(
        "SELECT * FROM usuarios WHERE (username = ? OR email = ?) AND status = 'ativo' AND tenant_id = ?",
        [username, username, db.tenantId]
      );
      if (found) { user = found; tenant = t; break; }
    }

    if (!user || !await bcrypt.compare(senha, user.senha)) {
      logger.warn('Tentativa de login inválida', { username, ip: req.ip });
      return res.status(401).json({ erro: 'Usuário ou senha incorretos' });
    }

    const { novaSenha } = req.body;
    if (user.senha_provisoria) {
      if (!novaSenha) return res.json({ trocarSenha: true });
      if (Buffer.byteLength(novaSenha) > 72 || await bcrypt.compare(novaSenha, user.senha)) {
        return res.status(400).json({ erro: 'Escolha uma senha diferente da provisória, com até 72 bytes.' });
      }
      const hash = await bcrypt.hash(novaSenha, 12);
      const [update] = await pool.execute(
        "UPDATE usuarios SET senha = ?, senha_provisoria = 0 WHERE id = ? AND tenant_id = ? AND BINARY senha = ? AND senha_provisoria = 1 AND status = 'ativo'",
        [hash, user.id, tenant.id, user.senha]
      );
      if (!update.affectedRows) return res.status(409).json({ erro: 'O acesso mudou. Entre novamente.' });
    } else if (novaSenha) {
      return res.status(409).json({ erro: 'A troca já foi concluída. Entre com sua senha atual.' });
    }

    const token = jwt.sign({
      id: user.id,
      nome: user.nome,
      username: user.username,
      nivel: user.nivel,
      tenantId: tenant.id,
      slug: tenant.slug,
      tenantNome: tenant.nome
    }, SECRET, { expiresIn: '8h' });

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: isProd
    });
    res.json({ ok: true, usuario: { id: user.id, nome: user.nome, nivel: user.nivel, tenantNome: tenant.nome } });
  } catch(e) {
    logger.error('Erro no login', { error: e.message });
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/register', validate(schemas.register), cadastro(false));

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: isProd });
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
