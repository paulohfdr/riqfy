const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const bcrypt = require('bcryptjs');
const { authMiddleware, authAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', authAdmin, async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    res.json(await db.all(
      'SELECT id,nome,username,email,nivel,status,criado_em FROM usuarios WHERE tenant_id=? ORDER BY nome',
      [db.tenantId]
    ));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/', authAdmin, validate(schemas.usuario), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { nome, username, email, senha, nivel } = req.body;
    const hash = await bcrypt.hash(senha, 12);
    const r = await db.run(
      'INSERT INTO usuarios (tenant_id,nome,username,email,senha,nivel) VALUES (?,?,?,?,?,?)',
      [db.tenantId, nome, username, email, hash, nivel || 'suporte']
    );
    res.json({ id: r.lastId, ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/:id', authAdmin, validate(schemas.usuarioUpdate), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { nome, email, nivel, status } = req.body;
    await db.run(
      'UPDATE usuarios SET nome=?,email=?,nivel=?,status=? WHERE id=? AND tenant_id=?',
      [nome, email, nivel, status, req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/:id/resetar-senha', authAdmin, validate(schemas.resetarSenha), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { nova_senha } = req.body;
    await db.run(
      'UPDATE usuarios SET senha=? WHERE id=? AND tenant_id=?',
      [await bcrypt.hash(nova_senha, 12), req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/:id/status', authAdmin, async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { status } = req.body;
    await db.run(
      'UPDATE usuarios SET status=? WHERE id=? AND tenant_id=?',
      [status, req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
