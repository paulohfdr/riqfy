const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { randomUUID } = require('crypto');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { mes, ano } = req.query;
    let sql = `SELECT d.*, DATE_FORMAT(d.vencimento, '%Y-%m-%d') as vencimento, c.nome as categoria_nome, c.cor as categoria_cor
      FROM despesas d LEFT JOIN categorias c ON d.categoria_id = c.id
      WHERE d.tenant_id = ?`;
    const params = [db.tenantId];
    if (mes && ano) {
      sql += ' AND MONTH(d.vencimento) = ? AND YEAR(d.vencimento) = ?';
      params.push(Number(mes), Number(ano));
    }
    sql += ' ORDER BY d.vencimento ASC';
    res.json(await db.all(sql, params));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/resumo', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { mes, ano } = req.query;
    const total = await db.get(
      `SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as qtd,
       COALESCE(SUM(CASE WHEN forma_pagamento='credito' THEN valor ELSE 0 END),0) as credito,
       COALESCE(SUM(CASE WHEN forma_pagamento='pix'     THEN valor ELSE 0 END),0) as pix,
       COALESCE(SUM(CASE WHEN forma_pagamento='debito'  THEN valor ELSE 0 END),0) as debito
       FROM despesas WHERE MONTH(vencimento) = ? AND YEAR(vencimento) = ? AND tenant_id = ?`,
      [Number(mes), Number(ano), db.tenantId]
    ) || { total:0, qtd:0, credito:0, pix:0, debito:0 };
    const porCategoria = await db.all(
      `SELECT c.nome, c.cor, COALESCE(SUM(d.valor),0) as total
       FROM despesas d LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE MONTH(d.vencimento) = ? AND YEAR(d.vencimento) = ? AND d.tenant_id = ?
       GROUP BY d.categoria_id, c.nome, c.cor ORDER BY total DESC`,
      [Number(mes), Number(ano), db.tenantId]
    ) || [];
    res.json({ ...total, porCategoria });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/', validate(schemas.despesa), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { descricao, valor, vencimento, categoria_id, forma_pagamento, recorrente, total_parcelas } = req.body;

    const parcelas = parseInt(total_parcelas) || 1;
    const grupo = parcelas > 1 ? randomUUID() : null;
    const ids = [];

    for (let i = 1; i <= parcelas; i++) {
      const data = new Date(vencimento + 'T12:00:00');
      data.setMonth(data.getMonth() + (i - 1));
      const dataStr = data.toISOString().split('T')[0];
      const r = await db.run(
        `INSERT INTO despesas (tenant_id,descricao,valor,vencimento,categoria_id,usuario_id,forma_pagamento,recorrente,total_parcelas,parcela_atual,grupo_parcela)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [db.tenantId, descricao, Number(valor), dataStr, categoria_id || null, req.usuario.id,
         forma_pagamento || 'pix', recorrente ? 1 : 0, parcelas, i, grupo]
      );
      ids.push(r.lastId);
    }
    res.json({ ok: true, ids });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/:id', validate(schemas.despesa), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { descricao, valor, vencimento, categoria_id, forma_pagamento, recorrente, total_parcelas } = req.body;

    const despesaAtual = await db.get(
      'SELECT * FROM despesas WHERE id = ? AND tenant_id = ?',
      [req.params.id, db.tenantId]
    );
    if (!despesaAtual) return res.status(404).json({ erro: 'Despesa não encontrada' });

    const novasParcelas = parseInt(total_parcelas) || 1;

    if (despesaAtual.grupo_parcela) {
      const todasParcelas = await db.all(
        'SELECT * FROM despesas WHERE grupo_parcela = ? AND tenant_id = ? ORDER BY parcela_atual ASC',
        [despesaAtual.grupo_parcela, db.tenantId]
      );
      const parcelasAtuais = todasParcelas.length;

      for (const p of todasParcelas) {
        await db.run(
          'UPDATE despesas SET descricao=?,valor=?,categoria_id=?,forma_pagamento=?,recorrente=?,total_parcelas=? WHERE id=? AND tenant_id=?',
          [descricao, Number(valor), categoria_id || null, forma_pagamento, recorrente ? 1 : 0, novasParcelas, p.id, db.tenantId]
        );
      }

      if (novasParcelas < parcelasAtuais) {
        const parcelasExcluir = todasParcelas.slice(novasParcelas);
        for (const p of parcelasExcluir) {
          await db.run('DELETE FROM despesas WHERE id=? AND tenant_id=?', [p.id, db.tenantId]);
        }
      } else if (novasParcelas > parcelasAtuais) {
        const v0 = todasParcelas[0].vencimento;
        const v0Str = v0 instanceof Date ? v0.toISOString().split('T')[0] : String(v0).substring(0, 10);
        const primeiraData = new Date(v0Str + 'T12:00:00');
        for (let i = parcelasAtuais + 1; i <= novasParcelas; i++) {
          const novaData = new Date(primeiraData);
          novaData.setMonth(novaData.getMonth() + (i - 1));
          await db.run(
            'INSERT INTO despesas (tenant_id,descricao,valor,vencimento,categoria_id,usuario_id,forma_pagamento,recorrente,total_parcelas,parcela_atual,grupo_parcela) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [db.tenantId, descricao, Number(valor), novaData.toISOString().split('T')[0], categoria_id || null, despesaAtual.usuario_id, forma_pagamento, recorrente ? 1 : 0, novasParcelas, i, despesaAtual.grupo_parcela]
          );
        }
      }
    } else {
      await db.run(
        'UPDATE despesas SET descricao=?,valor=?,vencimento=?,categoria_id=?,forma_pagamento=?,recorrente=?,total_parcelas=? WHERE id=? AND tenant_id=?',
        [descricao, Number(valor), vencimento, categoria_id || null, forma_pagamento, recorrente ? 1 : 0, novasParcelas, req.params.id, db.tenantId]
      );
    }

    res.json({ ok: true });
  } catch(err) { res.status(500).json({ erro: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    await db.run('DELETE FROM despesas WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/', validate(schemas.deleteIds), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { ids } = req.body;
    for (const id of ids) {
      await db.run('DELETE FROM despesas WHERE id=? AND tenant_id=?', [id, db.tenantId]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
