const { getMasterDb } = require('../db/master');

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

module.exports = { planoCheck };
