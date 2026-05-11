const { getMasterDb } = require('../db/master');
const { getDb } = require('../db/database');

async function planoCheck(req, res, next) {
  try {
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get(
      'SELECT p.nome as plano_nome FROM tenants t JOIN planos p ON t.plano_id = p.id WHERE t.id = ?',
      [req.tenantId]
    );
    if (!tenant || tenant.plano_nome === 'Free') {
      return res.status(403).json({ erro: 'Recurso disponível apenas no plano Premium.' });
    }
    next();
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
}

async function lancamentoLimitCheck(req, res, next) {
  try {
    const masterDb = await getMasterDb();
    const tenant = await masterDb.get(
      'SELECT p.max_lancamentos_mes FROM tenants t JOIN planos p ON t.plano_id = p.id WHERE t.id = ?',
      [req.tenantId]
    );
    if (!tenant || tenant.max_lancamentos_mes === -1) return next();

    const db = await getDb(req.tenantSlug);
    const mes = new Date().getMonth() + 1;
    const ano = new Date().getFullYear();

    const [recRow, despRow] = await Promise.all([
      db.get('SELECT COUNT(*) as n FROM receitas WHERE tenant_id=? AND MONTH(data)=? AND YEAR(data)=?',
        [db.tenantId, mes, ano]),
      db.get('SELECT COUNT(*) as n FROM despesas WHERE tenant_id=? AND MONTH(vencimento)=? AND YEAR(vencimento)=?',
        [db.tenantId, mes, ano])
    ]);

    const atual = (recRow?.n || 0) + (despRow?.n || 0);
    const novas = parseInt(req.body?.total_parcelas) || 1;
    const limite = tenant.max_lancamentos_mes;

    if (atual + novas > limite) {
      return res.status(403).json({
        erro: `Limite de ${limite} lançamentos por mês atingido (${atual}/${limite}). Faça upgrade para o plano Pro ou Family para lançamentos ilimitados.`
      });
    }
    next();
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
}

module.exports = { planoCheck, lancamentoLimitCheck };
