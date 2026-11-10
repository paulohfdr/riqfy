const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/calendario', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      return res.status(400).json({ erro: 'Mês ou ano inválido' });
    }

    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const proximoMes = new Date(Date.UTC(ano, mes, 1));
    const fim = `${proximoMes.getUTCFullYear()}-${String(proximoMes.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const dataSelecionada = req.query.data;

    if (dataSelecionada) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSelecionada) || dataSelecionada < inicio || dataSelecionada >= fim) {
        return res.status(400).json({ erro: 'Data inválida para o mês selecionado' });
      }
      const dataValida = new Date(`${dataSelecionada}T00:00:00Z`);
      if (Number.isNaN(dataValida.getTime()) || dataValida.toISOString().slice(0, 10) !== dataSelecionada) {
        return res.status(400).json({ erro: 'Data inválida para o mês selecionado' });
      }

      const [despesas, receitas] = await Promise.all([
        db.all(
          `SELECT d.id, d.descricao, d.valor, DATE_FORMAT(d.vencimento, '%Y-%m-%d') AS data,
                  c.nome AS categoria_nome, c.cor AS categoria_cor
           FROM despesas d LEFT JOIN categorias c ON d.categoria_id = c.id
           WHERE d.tenant_id = ? AND d.vencimento = ?
           ORDER BY d.criado_em DESC, d.id DESC`,
          [db.tenantId, dataSelecionada]
        ),
        db.all(
          `SELECT r.id, r.descricao, r.valor, DATE_FORMAT(r.data_recebimento, '%Y-%m-%d') AS data,
                  c.nome AS categoria_nome, c.cor AS categoria_cor
           FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
           WHERE r.tenant_id = ? AND r.status = 'recebida' AND r.data_recebimento = ?
           ORDER BY r.criado_em DESC, r.id DESC`,
          [db.tenantId, dataSelecionada]
        )
      ]);

      return res.json({ data: dataSelecionada, despesas, receitas });
    }

    const [despesasPorDia, receitasPorDia] = await Promise.all([
      db.all(
        `SELECT DATE_FORMAT(d.vencimento, '%Y-%m-%d') AS data, c.nome AS categoria_nome,
                c.cor AS categoria_cor, COALESCE(SUM(d.valor), 0) AS total, COUNT(*) AS quantidade
         FROM despesas d LEFT JOIN categorias c ON d.categoria_id = c.id
         WHERE d.tenant_id = ? AND d.vencimento >= ? AND d.vencimento < ?
         GROUP BY d.vencimento, c.nome, c.cor
         ORDER BY data`,
        [db.tenantId, inicio, fim]
      ),
      db.all(
        `SELECT DATE_FORMAT(r.data_recebimento, '%Y-%m-%d') AS data,
                COALESCE(SUM(r.valor), 0) AS total, COUNT(*) AS quantidade
         FROM receitas r
         WHERE r.tenant_id = ? AND r.status = 'recebida' AND r.data_recebimento >= ? AND r.data_recebimento < ?
         GROUP BY r.data_recebimento
         ORDER BY data`,
        [db.tenantId, inicio, fim]
      )
    ]);

    const dias = {};
    for (const item of despesasPorDia) {
      const dia = dias[item.data] || (dias[item.data] = { despesas: 0, receitas: 0, quantidadeDespesas: 0, quantidadeReceitas: 0, categorias: [] });
      dia.despesas += Number(item.total || 0);
      dia.quantidadeDespesas += Number(item.quantidade || 0);
      if (item.categoria_nome) {
        dia.categorias.push({ nome: item.categoria_nome, cor: item.categoria_cor || '#ef4444' });
      }
    }
    for (const item of receitasPorDia) {
      const dia = dias[item.data] || (dias[item.data] = { despesas: 0, receitas: 0, quantidadeDespesas: 0, quantidadeReceitas: 0, categorias: [] });
      dia.receitas = Number(item.total || 0);
      dia.quantidadeReceitas = Number(item.quantidade || 0);
    }

    res.json({ dias });
  } catch (e) {
    console.error('Erro no calendário financeiro:', e);
    res.status(500).json({ erro: e.message });
  }
});

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
      `SELECT d.*, DATE_FORMAT(d.vencimento, '%Y-%m-%d') as vencimento, c.nome as categoria_nome FROM despesas d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.tenant_id=? ORDER BY d.vencimento ASC LIMIT 5`,
      [tid]
    );

    const ultimosLancamentos = await db.all(
      `SELECT d.*, DATE_FORMAT(d.vencimento, '%Y-%m-%d') as vencimento, c.nome as categoria_nome FROM despesas d
       LEFT JOIN categorias c ON d.categoria_id = c.id
       WHERE d.tenant_id=? ORDER BY d.criado_em DESC LIMIT 5`,
      [tid]
    );

    const aReceber = await db.all(
      `SELECT r.*, DATE_FORMAT(r.data, '%Y-%m-%d') AS data,
              c.nome as categoria_nome, c.cor as categoria_cor
       FROM receitas r LEFT JOIN categorias c ON r.categoria_id = c.id
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
