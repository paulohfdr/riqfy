const { getMasterDb } = require('../db/master');
const { getDb } = require('../db/database');

async function gerarRecorrencias() {
  try {
    const masterDb = await getMasterDb();
    const tenants = await masterDb.all("SELECT slug FROM tenants WHERE status = 'ativo'");
    for (const t of tenants) {
      try { await gerarRecorrenciasTenant(t.slug); }
      catch(e) { console.error(`Erro recorrências [${t.slug}]:`, e.message); }
    }
  } catch(e) {
    console.error('Erro ao carregar tenants para recorrências:', e.message);
  }
}

async function gerarRecorrenciasTenant(slug) {
  const db = await getDb(slug);
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const recorrentes = await db.all(
    'SELECT * FROM despesas WHERE recorrente = 1 AND tenant_id = ?',
    [db.tenantId]
  );

  for (const d of recorrentes) {
    const dataOriginal = new Date(d.vencimento + 'T12:00:00');
    const diaVenc = dataOriginal.getDate();
    const novaData = `${ano}-${String(mes).padStart(2,'0')}-${String(diaVenc).padStart(2,'0')}`;

    // Verifica duplicata respeitando NULL em categoria_id
    let jaExiste;
    if (d.categoria_id == null) {
      jaExiste = await db.get(
        `SELECT id FROM despesas
         WHERE descricao=? AND MONTH(vencimento)=? AND YEAR(vencimento)=?
         AND recorrente=1 AND categoria_id IS NULL AND usuario_id=? AND tenant_id=?`,
        [d.descricao, mes, ano, d.usuario_id, db.tenantId]
      );
    } else {
      jaExiste = await db.get(
        `SELECT id FROM despesas
         WHERE descricao=? AND MONTH(vencimento)=? AND YEAR(vencimento)=?
         AND recorrente=1 AND categoria_id=? AND usuario_id=? AND tenant_id=?`,
        [d.descricao, mes, ano, d.categoria_id, d.usuario_id, db.tenantId]
      );
    }

    if (!jaExiste) {
      await db.run(
        `INSERT INTO despesas (tenant_id,descricao,valor,vencimento,categoria_id,usuario_id,forma_pagamento,recorrente,total_parcelas,parcela_atual)
         VALUES (?,?,?,?,?,?,?,1,1,1)`,
        [db.tenantId, d.descricao, d.valor, novaData, d.categoria_id, d.usuario_id, d.forma_pagamento]
      );
    }
  }
}

module.exports = { gerarRecorrencias };
