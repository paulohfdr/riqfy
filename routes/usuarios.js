const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const bcrypt = require('bcryptjs');
const { authMiddleware, authAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { planoCheck } = require('../middleware/plano');

router.use(authMiddleware);
router.use(planoCheck);

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

router.delete('/:id', authAdmin, async (req, res) => {
  try {
    if (String(req.params.id) === String(req.usuario.id))
      return res.status(400).json({ erro: 'Você não pode excluir sua própria conta.' });
    const db = await getDb(req.tenantSlug);
    const admins = await db.all(
      "SELECT id FROM usuarios WHERE tenant_id=? AND nivel='administrador' AND status='ativo'",
      [db.tenantId]
    );
    const alvo = await db.get('SELECT nivel FROM usuarios WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    if (alvo.nivel === 'administrador' && admins.length <= 1)
      return res.status(400).json({ erro: 'Não é possível excluir o único administrador ativo.' });
    await db.run('DELETE FROM usuarios WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
