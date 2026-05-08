const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { tipo } = req.query;
    let sql = 'SELECT * FROM categorias WHERE tenant_id = ?';
    const params = [db.tenantId];
    if (tipo && tipo !== 'todas') { sql += ' AND tipo = ?'; params.push(tipo); }
    sql += ' ORDER BY nome ASC';
    res.json(await db.all(sql, params));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/', validate(schemas.categoria), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { nome, tipo, cor } = req.body;
    const r = await db.run(
      'INSERT INTO categorias (tenant_id,nome,tipo,cor) VALUES (?,?,?,?)',
      [db.tenantId, nome, tipo, cor || '#2563EB']
    );
    res.json({ id: r.lastId, ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/:id', validate(schemas.categoria), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { nome, tipo, cor } = req.body;
    await db.run(
      'UPDATE categorias SET nome=?,tipo=?,cor=? WHERE id=? AND tenant_id=?',
      [nome, tipo, cor, req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    await db.run('DELETE FROM categorias WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
