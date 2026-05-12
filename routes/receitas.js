const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { lancamentoLimitCheck } = require('../middleware/plano');
const logger = require('../utils/logger');

router.use(authMiddleware);

// GET / → receitas recebidas (mês/ano) + todas pendentes
router.get('/', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    const tid = db.tenantId;

    const recebidas = await db.all(
      `SELECT r.*,
              DATE_FORMAT(r.data, '%Y-%m-%d') AS data,
              DATE_FORMAT(r.data_recebimento, '%Y-%m-%d') AS data_recebimento,
              c.nome AS categoria_nome, c.cor AS categoria_cor
       FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.tenant_id = ? AND r.status = 'recebida'
         AND r.mes_recebimento = ? AND r.ano_recebimento = ?
       ORDER BY r.data_recebimento DESC`,
      [tid, mes, ano]
    );

    const pendentes = await db.all(
      `SELECT r.*,
              DATE_FORMAT(r.data, '%Y-%m-%d') AS data,
              c.nome AS categoria_nome, c.cor AS categoria_cor
       FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.tenant_id = ? AND r.status = 'pendente'
       ORDER BY r.data ASC`,
      [tid]
    );

    const totalRecebidas = recebidas.reduce((acc, r) => acc + Number(r.valor), 0);
    const totalPendentes = pendentes.reduce((acc, r) => acc + Number(r.valor), 0);

    res.json({
      sucesso: true,
      resumo: {
        total_receitas: totalRecebidas + totalPendentes,
        receitas_recebidas: totalRecebidas,
        receitas_pendentes: totalPendentes,
        qtd_recebidas: recebidas.length,
        qtd_pendentes: pendentes.length
      },
      receitas_recebidas: recebidas,
      receitas_pendentes: pendentes
    });
  } catch (e) {
    logger.error('Erro ao listar receitas', { error: e.message });
    res.status(500).json({ erro: e.message });
  }
});

// GET /resumo → totais por categoria para receitas recebidas no mês
router.get('/resumo', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();

    const total = await db.get(
      `SELECT COALESCE(SUM(valor),0) AS total, COUNT(*) AS qtd
       FROM receitas
       WHERE mes_recebimento = ? AND ano_recebimento = ? AND tenant_id = ? AND status = 'recebida'`,
      [mes, ano, db.tenantId]
    );

    const porCategoria = await db.all(
      `SELECT c.nome, c.cor, COALESCE(SUM(r.valor),0) AS total
       FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.mes_recebimento = ? AND r.ano_recebimento = ? AND r.tenant_id = ? AND r.status = 'recebida'
       GROUP BY r.categoria_id, c.nome, c.cor
       ORDER BY total DESC`,
      [mes, ano, db.tenantId]
    );

    res.json({ ...(total || { total: 0, qtd: 0 }), porCategoria });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// POST / → criar receita (sempre pendente)
router.post('/', lancamentoLimitCheck, validate(schemas.receita), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { descricao, valor, data, categoria_id, recorrente } = req.body;
    const r = await db.run(
      `INSERT INTO receitas (tenant_id, descricao, valor, data, categoria_id, usuario_id, recorrente, recebido, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pendente')`,
      [db.tenantId, descricao, Number(valor), data, categoria_id || null, req.usuario.id, recorrente ? 1 : 0]
    );
    logger.info('Receita criada', { id: r.lastId, tenant: req.tenantSlug, usuario: req.usuario.id });
    res.json({ sucesso: true, id: r.lastId, mensagem: 'Receita criada como pendente' });
  } catch (e) {
    logger.error('Erro ao criar receita', { error: e.message });
    res.status(500).json({ erro: e.message });
  }
});

// PUT /:id/receber → marcar como recebida com data de recebimento
router.put('/:id/receber', validate(schemas.receber), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const id = Number(req.params.id);
    const { data_recebimento } = req.body;

    const receita = await db.get(
      'SELECT id, status FROM receitas WHERE id = ? AND tenant_id = ?',
      [id, db.tenantId]
    );
    if (!receita) return res.status(404).json({ erro: 'Receita não encontrada' });
    if (receita.status === 'recebida') return res.status(400).json({ erro: 'Receita já está marcada como recebida' });

    const [anoStr, mesStr] = data_recebimento.split('-');
    const mes = Number(mesStr);
    const ano = Number(anoStr);

    await db.run(
      `UPDATE receitas
       SET status = 'recebida', recebido = 1,
           data_recebimento = ?, mes_recebimento = ?, ano_recebimento = ?
       WHERE id = ? AND tenant_id = ?`,
      [data_recebimento, mes, ano, id, db.tenantId]
    );

    const atualizada = await db.get('SELECT * FROM receitas WHERE id = ?', [id]);
    logger.info('Receita recebida', { id, tenant: req.tenantSlug, data_recebimento, usuario: req.usuario.id });
    res.json({ sucesso: true, mensagem: 'Receita marcada como recebida', receita: atualizada });
  } catch (e) {
    logger.error('Erro ao receber receita', { error: e.message });
    res.status(500).json({ erro: e.message });
  }
});

// PUT /:id/desfazer-recebimento → voltar para pendente
router.put('/:id/desfazer-recebimento', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const id = Number(req.params.id);

    const receita = await db.get(
      'SELECT id, status FROM receitas WHERE id = ? AND tenant_id = ?',
      [id, db.tenantId]
    );
    if (!receita) return res.status(404).json({ erro: 'Receita não encontrada' });
    if (receita.status === 'pendente') return res.status(400).json({ erro: 'Receita já está pendente' });

    await db.run(
      `UPDATE receitas
       SET status = 'pendente', recebido = 0,
           data_recebimento = NULL, mes_recebimento = NULL, ano_recebimento = NULL
       WHERE id = ? AND tenant_id = ?`,
      [id, db.tenantId]
    );

    logger.info('Recebimento desfeito', { id, tenant: req.tenantSlug, usuario: req.usuario.id });
    res.json({ sucesso: true, mensagem: 'Receita voltou para pendente' });
  } catch (e) {
    logger.error('Erro ao desfazer recebimento', { error: e.message });
    res.status(500).json({ erro: e.message });
  }
});

// PUT /:id → editar campos básicos (não altera status)
router.put('/:id', validate(schemas.receita), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { descricao, valor, data, categoria_id, recorrente } = req.body;
    const result = await db.run(
      'UPDATE receitas SET descricao=?,valor=?,data=?,categoria_id=?,recorrente=? WHERE id=? AND tenant_id=?',
      [descricao, Number(valor), data, categoria_id || null, recorrente ? 1 : 0, req.params.id, db.tenantId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: 'Receita não encontrada' });
    res.json({ sucesso: true, mensagem: 'Receita atualizada' });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    await db.run('DELETE FROM receitas WHERE id=? AND tenant_id=?', [req.params.id, db.tenantId]);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// DELETE / → exclusão em massa
router.delete('/', validate(schemas.deleteIds), async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const { ids } = req.body;
    for (const id of ids) {
      await db.run('DELETE FROM receitas WHERE id=? AND tenant_id=?', [id, db.tenantId]);
    }
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
