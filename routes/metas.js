const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    res.json(await db.all('SELECT * FROM metas WHERE tenant_id = ? ORDER BY criado_em DESC', [db.tenantId]));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/resumo', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const r = await db.get(
      `SELECT COUNT(*) as total,
       COALESCE(SUM(valor_alvo),0) as valor_planejado,
       COALESCE(SUM(valor_atual),0) as valor_acumulado,
       SUM(CASE WHEN status='concluida' THEN 1 ELSE 0 END) as concluidas
       FROM metas WHERE tenant_id = ?`,
      [db.tenantId]
    );
    res.json(r);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/', validate(schemas.meta), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { titulo, valor_alvo, data_limite } = req.body;
    const r = await db.run(
      'INSERT INTO metas (tenant_id,titulo,valor_alvo,data_limite,usuario_id) VALUES (?,?,?,?,?)',
      [db.tenantId, titulo, Number(valor_alvo), data_limite, req.usuario.id]
    );
    res.json({ id: r.lastId, ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/:id', validate(schemas.meta), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { titulo, valor_alvo, data_limite, status } = req.body;
    await db.run(
      'UPDATE metas SET titulo=?,valor_alvo=?,data_limite=?,status=? WHERE id=? AND tenant_id=?',
      [titulo, Number(valor_alvo), data_limite, status, req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/:id/aportar', validate(schemas.aporte), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { valor, observacao } = req.body;

    const meta = await db.get('SELECT * FROM metas WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada' });

    const novoValor = Number(meta.valor_atual) + Number(valor);
    const novoStatus = novoValor >= Number(meta.valor_alvo) ? 'concluida' : meta.status;
    const hoje = new Date().toISOString().split('T')[0];

    await db.run('UPDATE metas SET valor_atual=?,status=? WHERE id=? AND tenant_id=?',
      [novoValor, novoStatus, req.params.id, db.tenantId]);
    await db.run('INSERT INTO aporte_metas (meta_id,valor,data,observacao) VALUES (?,?,?,?)',
      [req.params.id, Number(valor), hoje, observacao || null]);

    res.json({ ok: true, novoValor, status: novoStatus });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/:id/aportes', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const meta = await db.get('SELECT id FROM metas WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    if (!meta) return res.status(404).json({ erro: 'Meta não encontrada' });
    res.json(await db.all('SELECT * FROM aporte_metas WHERE meta_id=? ORDER BY data DESC', [req.params.id]));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    await db.run('DELETE FROM metas WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
