const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getMasterDb } = require('../db/master');
const logger = require('../utils/logger');

const MASTER_USER     = process.env.MASTER_USER     || 'admin';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'riqfy-master-2025';

// Rate limit agressivo para autenticação master: 5 tentativas / 15 min
const masterAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente novamente em 15 minutos.' }
});

function authMaster(req, res, next) {
  const pwd  = req.headers['x-master-password'] || req.body?.masterPassword;
  const user = req.headers['x-master-user']     || req.body?.masterUser;
  if (user !== MASTER_USER || pwd !== MASTER_PASSWORD) {
    logger.warn('Tentativa de acesso master inválida', { ip: req.ip });
    return res.status(401).json({ erro: 'Credenciais master incorretas' });
  }
  next();
}

router.post('/auth', masterAuthLimiter, (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario !== MASTER_USER || senha !== MASTER_PASSWORD) {
    logger.warn('Auth master falhou', { ip: req.ip });
    return res.status(401).json({ erro: 'Usuário ou senha incorretos' });
  }
  res.json({ ok: true });
});

router.get('/tenants', authMaster, async (req, res) => {
  try {
    const masterDb = await getMasterDb();
    const tenants = await masterDb.all(`
      SELECT t.*, p.nome as plano_nome, p.preco
      FROM tenants t JOIN planos p ON t.plano_id = p.id
      ORDER BY t.criado_em DESC
    `);
    res.json(tenants);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/planos', authMaster, async (req, res) => {
  try {
    const masterDb = await getMasterDb();
    res.json(await masterDb.all('SELECT * FROM planos ORDER BY preco'));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/tenants/:id', authMaster, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID inválido' });
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get(`
      SELECT t.*, p.nome as plano_nome, p.max_usuarios, p.max_lancamentos_mes, p.preco
      FROM tenants t JOIN planos p ON t.plano_id = p.id WHERE t.id = ?
    `, [id]);
    if (!tenant) return res.status(404).json({ erro: 'Tenant não encontrado' });
    res.json(tenant);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/tenants/:id/status', authMaster, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!id) return res.status(400).json({ erro: 'ID inválido' });
    if (!['ativo', 'suspenso', 'cancelado'].includes(status))
      return res.status(400).json({ erro: 'Status inválido' });
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get('SELECT slug FROM tenants WHERE id = ?', [id]);
    if (!tenant) return res.status(404).json({ erro: 'Tenant não encontrado' });
    await masterDb.run('UPDATE tenants SET status = ? WHERE id = ?', [status, id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/tenants/:id/plano', authMaster, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const plano_id = parseInt(req.body.plano_id);
    if (!id || !plano_id) return res.status(400).json({ erro: 'IDs inválidos' });
    const masterDb = await getMasterDb();
    const plano = await masterDb.get('SELECT id FROM planos WHERE id = ?', [plano_id]);
    if (!plano) return res.status(400).json({ erro: 'Plano inválido' });
    await masterDb.run('UPDATE tenants SET plano_id = ? WHERE id = ?', [plano_id, id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/tenants/:id', authMaster, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ erro: 'ID inválido' });
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get('SELECT id FROM tenants WHERE id = ?', [id]);
    if (!tenant) return res.status(404).json({ erro: 'Tenant não encontrado' });
    await masterDb.run('DELETE FROM tenants WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
