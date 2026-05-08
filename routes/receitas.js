const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authMiddleware);

router.get('/pendentes', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const lista = await db.all(
      `SELECT r.*, c.nome as categoria_nome, c.cor as categoria_cor
       FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.tenant_id = ? AND r.recebido = 0
       ORDER BY r.data ASC`,
      [db.tenantId]
    );
    const total = lista.reduce((acc, r) => acc + Number(r.valor), 0);
    res.json({ lista, total, qtd: lista.length });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { mes, ano } = req.query;
    let sql = `SELECT r.*, c.nome as categoria_nome, c.cor as categoria_cor
      FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
      WHERE r.tenant_id = ?`;
    const params = [db.tenantId];
    if (mes && ano) {
      sql += ' AND MONTH(r.data) = ? AND YEAR(r.data) = ?';
      params.push(Number(mes), Number(ano));
    }
    sql += ' ORDER BY r.data DESC';
    res.json(await db.all(sql, params));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/resumo', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { mes, ano } = req.query;
    const total = await db.get(
      `SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as qtd
       FROM receitas WHERE MONTH(data) = ? AND YEAR(data) = ? AND tenant_id = ?`,
      [Number(mes), Number(ano), db.tenantId]
    );
    const porCategoria = await db.all(
      `SELECT c.nome, c.cor, COALESCE(SUM(r.valor),0) as total
       FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE MONTH(r.data) = ? AND YEAR(r.data) = ? AND r.tenant_id = ?
       GROUP BY r.categoria_id, c.nome, c.cor`,
      [Number(mes), Number(ano), db.tenantId]
    );
    res.json({ ...total, porCategoria });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/', validate(schemas.receita), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { descricao, valor, data, categoria_id, recorrente, recebido } = req.body;
    if (!descricao || !valor || !data) return res.status(400).json({ erro: 'Dados obrigatórios' });
    const r = await db.run(
      'INSERT INTO receitas (tenant_id,descricao,valor,data,categoria_id,usuario_id,recorrente,recebido) VALUES (?,?,?,?,?,?,?,?)',
      [db.tenantId, descricao, Number(valor), data, categoria_id || null, req.usuario.id, recorrente ? 1 : 0, recebido ? 1 : 0]
    );
    res.json({ id: r.lastId, ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/:id', validate(schemas.receita), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { descricao, valor, data, categoria_id, recorrente, recebido } = req.body;
    await db.run(
      'UPDATE receitas SET descricao=?,valor=?,data=?,categoria_id=?,recorrente=?,recebido=? WHERE id=? AND tenant_id=?',
      [descricao, Number(valor), data, categoria_id || null, recorrente ? 1 : 0, recebido ? 1 : 0, req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.patch('/:id/recebido', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { recebido } = req.body;
    await db.run(
      'UPDATE receitas SET recebido=? WHERE id=? AND tenant_id=?',
      [recebido ? 1 : 0, req.params.id, db.tenantId]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    await db.run('DELETE FROM receitas WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/', validate(schemas.deleteIds), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { ids } = req.body;
    for (const id of ids) {
      await db.run('DELETE FROM receitas WHERE id=? AND tenant_id=?', [id, db.tenantId]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
