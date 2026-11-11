const express = require('express');
const router = express.Router();
const { getMasterDb } = require('../db/master');
const { getDb, pool } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/info', async (req, res) => {
  try {
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get(`
      SELECT t.*, p.nome as plano_nome, p.max_usuarios, p.max_lancamentos_mes, p.preco, p.features
      FROM tenants t JOIN planos p ON t.plano_id = p.id
      WHERE t.id = ?
    `, [req.tenantId]);
    res.json(tenant || {});
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/uso', async (req, res) => {
  try {
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get(`
      SELECT t.*, p.max_usuarios, p.max_lancamentos_mes
      FROM tenants t JOIN planos p ON t.plano_id = p.id WHERE t.id = ?
    `, [req.tenantId]);

    const db = await getDb(req.tenantSlug);
    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();

    const usuariosRow = await db.get(
      "SELECT COUNT(*) as n FROM usuarios WHERE status = 'ativo' AND tenant_id = ?",
      [db.tenantId]
    );
    const receitasRow = await db.get(
      'SELECT COUNT(*) as n FROM receitas WHERE MONTH(data) = ? AND YEAR(data) = ? AND tenant_id = ?',
      [mes, ano, db.tenantId]
    );
    const despesasRow = await db.get(
      'SELECT COUNT(*) as n FROM despesas WHERE MONTH(vencimento) = ? AND YEAR(vencimento) = ? AND tenant_id = ?',
      [mes, ano, db.tenantId]
    );

    res.json({
      usuarios: usuariosRow?.n || 0,
      lancamentos_mes: (receitasRow?.n || 0) + (despesasRow?.n || 0),
      max_usuarios: tenant?.max_usuarios ?? 1,
      max_lancamentos_mes: tenant?.max_lancamentos_mes ?? 50
    });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/meus-lancamentos', async (req, res) => {
  const { confirmar, manterPendentes } = req.body || {};
  if (confirmar !== true || typeof manterPendentes !== 'boolean') {
    return res.status(400).json({ erro: 'Confirme a exclusão e escolha o destino das receitas pendentes.' });
  }
  const escopo = [req.tenantId, req.usuario.id];
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [ativos] = await conn.execute(
      "SELECT u.id FROM usuarios u JOIN tenants t ON t.id=u.tenant_id WHERE u.tenant_id=? AND u.id=? AND u.status='ativo' AND t.status='ativo' FOR UPDATE",
      escopo
    );
    if (!ativos.length) {
      await conn.rollback();
      return res.status(403).json({ erro: 'Acesso inativo.' });
    }
    const [despesas] = await conn.execute('DELETE FROM despesas WHERE tenant_id=? AND usuario_id=?', escopo);
    const filtroReceitas = manterPendentes ? " AND status='recebida'" : '';
    const [receitas] = await conn.execute('DELETE FROM receitas WHERE tenant_id=? AND usuario_id=?' + filtroReceitas, escopo);
    await conn.commit();
    res.json({ despesas: despesas.affectedRows, receitas: receitas.affectedRows });
  } catch (erro) {
    if (conn) await conn.rollback();
    res.status(500).json({ erro: 'Falha ao limpar seus lançamentos. Atualize a página e confira os dados.' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
