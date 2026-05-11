const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getMasterDb } = require('../db/master');
const { getDb, seedTenant, pool } = require('../db/database');
const { SECRET, authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';

// Rate limit específico para login: 10 tentativas / 15 min por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

function gerarSlug(nome) {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

async function slugUnico(masterDb, base) {
  let slug = base, i = 2;
  while (await masterDb.get('SELECT id FROM tenants WHERE slug = ?', [slug])) slug = base + '-' + i++;
  return slug;
}

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

// Cadastro de novo tenant/usuário admin
router.post('/register', validate(schemas.register), async (req, res) => {
  const { nome, email, username, senha, plano_id } = req.body;

  try {
    const masterDb = await getMasterDb();

    if (await masterDb.get('SELECT id FROM tenants WHERE email_admin = ?', [email]))
      return res.status(400).json({ erro: 'Este email já está cadastrado' });

    if (await masterDb.get('SELECT id FROM tenants WHERE slug = ?', [gerarSlug(username)]))
      return res.status(400).json({ erro: 'Este nome de usuário já está em uso' });

    const slug = await slugUnico(masterDb, gerarSlug(username));
    const planoFree = await masterDb.get('SELECT id FROM planos ORDER BY id LIMIT 1');
    let planoId = planoFree?.id || 1;
    if (plano_id) {
      const planoEscolhido = await masterDb.get('SELECT id FROM planos WHERE id = ?', [plano_id]);
      if (planoEscolhido) planoId = planoEscolhido.id;
    }

    const r = await masterDb.run(
      'INSERT INTO tenants (nome,slug,email_admin,plano_id,status) VALUES (?,?,?,?,?)',
      [nome, slug, email, planoId, 'ativo']
    );
    const tenantId = r.lastId;

    const hash = await bcrypt.hash(senha, 12);
    await pool.execute(
      'INSERT INTO usuarios (tenant_id,nome,username,email,senha,nivel,status) VALUES (?,?,?,?,?,?,?)',
      [tenantId, nome, username, email, hash, 'administrador', 'ativo']
    );

    res.json({ ok: true, slug, tenantId, msg: 'Acesso criado com sucesso!' });
  } catch(e) {
    logger.error('Erro no register', { error: e.message });
    res.status(500).json({ erro: 'Erro ao criar acesso' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict', secure: isProd });
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
