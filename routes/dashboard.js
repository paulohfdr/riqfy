const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    const tid = db.tenantId;

    const receitas = await db.get(
      `SELECT COALESCE(SUM(valor),0) as total FROM receitas
       WHERE mes_recebimento=? AND ano_recebimento=? AND tenant_id=? AND status='recebida'`,
      [mes, ano, tid]
    ) || { total: 0 };

    const despesas = await db.get(
      `SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as parcelas, COALESCE(SUM(recorrente),0) as recorrencias
       FROM despesas WHERE MONTH(vencimento)=? AND YEAR(vencimento)=? AND tenant_id=?`,
      [mes, ano, tid]
    ) || { total: 0, parcelas: 0, recorrencias: 0 };

    const evolucao = await db.all(
      `SELECT LPAD(mes_recebimento,2,'0') as mes, COALESCE(SUM(valor),0) as total
       FROM receitas WHERE ano_recebimento=? AND tenant_id=? AND status='recebida'
       GROUP BY mes_recebimento ORDER BY mes_recebimento`,
      [ano, tid]
    );

    const evolucaoDespesas = await db.all(
      `SELECT LPAD(MONTH(vencimento),2,'0') as mes, COALESCE(SUM(valor),0) as total
       FROM despesas WHERE YEAR(vencimento)=? AND tenant_id=? GROUP BY MONTH(vencimento), LPAD(MONTH(vencimento),2,'0') ORDER BY MONTH(vencimento)`,
      [ano, tid]
    );

    const porCategoria = await db.all(
      `SELECT c.nome, c.cor, COALESCE(SUM(d.valor),0) as total
       FROM despesas d LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE MONTH(d.vencimento)=? AND YEAR(d.vencimento)=? AND d.tenant_id=?
       GROUP BY d.categoria_id, c.nome, c.cor ORDER BY total DESC LIMIT 5`,
      [mes, ano, tid]
    );

    const proximasContas = await db.all(
      `SELECT d.*, c.nome as categoria_nome FROM despesas d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.tenant_id=? ORDER BY d.vencimento ASC LIMIT 5`,
      [tid]
    );

    const ultimosLancamentos = await db.all(
      `SELECT d.*, c.nome as categoria_nome FROM despesas d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.tenant_id=? ORDER BY d.criado_em DESC LIMIT 5`,
      [tid]
    );

    const aReceber = await db.all(
      `SELECT r.*, c.nome as categoria_nome, c.cor as categoria_cor FROM receitas r
       LEFT JOIN categorias c ON r.categoria_id = c.id
       WHERE r.tenant_id=? AND r.status='pendente'
       ORDER BY r.data ASC LIMIT 20`,
      [tid]
    );
    const totalAReceber = aReceber.reduce((acc, r) => acc + Number(r.valor), 0);

    res.json({
      saldo: (receitas.total || 0) - (despesas.total || 0),
      receitas: receitas.total || 0,
      despesas: despesas.total || 0,
      parcelas: despesas.parcelas || 0,
      recorrencias: despesas.recorrencias || 0,
      evolucao, evolucaoDespesas, porCategoria, proximasContas, ultimosLancamentos,
      aReceber, totalAReceber
    });
  } catch(e) {
    console.error('Erro dashboard:', e);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
