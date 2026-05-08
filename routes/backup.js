const express = require('express');
const router = express.Router();
const { authAdmin } = require('../middleware/auth');
const { getDb } = require('../db/database');

router.use(authAdmin);

router.get('/info', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const [receitas, despesas, usuarios, categorias, metas] = await Promise.all([
      db.get('SELECT COUNT(*) as n FROM receitas WHERE tenant_id=?', [db.tenantId]),
      db.get('SELECT COUNT(*) as n FROM despesas WHERE tenant_id=?', [db.tenantId]),
      db.get('SELECT COUNT(*) as n FROM usuarios  WHERE tenant_id=?', [db.tenantId]),
      db.get('SELECT COUNT(*) as n FROM categorias WHERE tenant_id=?', [db.tenantId]),
      db.get('SELECT COUNT(*) as n FROM metas WHERE tenant_id=?', [db.tenantId])
    ]);
    res.json({
      tamanho: 'MySQL',
      ultima_modificacao: new Date().toLocaleString('pt-BR'),
      registros: {
        receitas: receitas?.n || 0,
        despesas: despesas?.n || 0,
        usuarios: usuarios?.n || 0,
        categorias: categorias?.n || 0,
        metas: metas?.n || 0
      }
    });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Exporta todos os dados do tenant em JSON
router.get('/download', async (req, res) => {
  try {
    const db = await getDb(req.tenantSlug);
    const tid = db.tenantId;

    const [receitas, despesas, categorias, metas, aportes, usuarios] = await Promise.all([
      db.all('SELECT * FROM receitas WHERE tenant_id=?', [tid]),
      db.all('SELECT * FROM despesas WHERE tenant_id=?', [tid]),
      db.all('SELECT * FROM categorias WHERE tenant_id=?', [tid]),
      db.all('SELECT * FROM metas WHERE tenant_id=?', [tid]),
      db.all('SELECT a.* FROM aporte_metas a JOIN metas m ON a.meta_id=m.id WHERE m.tenant_id=?', [tid]),
      db.all('SELECT id,nome,username,email,nivel,status,criado_em FROM usuarios WHERE tenant_id=?', [tid])
    ]);

    const backup = { exportado_em: new Date().toISOString(), tenant: req.tenantSlug, receitas, despesas, categorias, metas, aportes, usuarios };
    const nome = `riqfy-${req.tenantSlug}-backup-${new Date().toISOString().slice(0,10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/restaurar', (req, res) => {
  res.json({ ok: false, msg: 'Restauração via upload não disponível nesta versão.' });
});

module.exports = router;
