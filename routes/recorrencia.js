const { getMasterDb } = require('../db/master');
const { getDb } = require('../db/database');

const MESES_FRENTE = 12; // gera mês atual + próximos 11

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

  // Monta lista de meses-alvo: atual + próximos (MESES_FRENTE - 1)
  const mesesAlvo = [];
  for (let i = 0; i < MESES_FRENTE; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    mesesAlvo.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
  }

  // Só processa despesas "mãe": recorrente=1 sem pai vinculado
  const maes = await db.all(
    `SELECT *, DATE_FORMAT(vencimento, '%Y-%m-%d') as vencimento FROM despesas
     WHERE recorrente = 1 AND despesa_recorrente_id IS NULL AND tenant_id = ?`,
    [db.tenantId]
  );

  for (const mae of maes) {
    const dataOriginal = new Date(String(mae.vencimento).substring(0, 10) + 'T12:00:00');
    const diaVenc     = dataOriginal.getDate();
    const mesOriginal = dataOriginal.getMonth() + 1;
    const anoOriginal = dataOriginal.getFullYear();

    for (const { mes, ano } of mesesAlvo) {
      // Não recria o próprio mês da mãe (ela já existe)
      if (ano === anoOriginal && mes === mesOriginal) continue;

      // Não cria no passado
      if (ano < anoOriginal || (ano === anoOriginal && mes < mesOriginal)) continue;

      // Verifica se já existe cópia — checa tanto estilo novo (despesa_recorrente_id)
      // quanto estilo antigo (mesma descricao+mês+ano, compatibilidade com dados legados)
      const params = mae.categoria_id == null
        ? [db.tenantId, mes, ano, mae.id, mae.descricao, mae.usuario_id]
        : [db.tenantId, mes, ano, mae.id, mae.descricao, mae.usuario_id, mae.categoria_id];

      const jaExiste = await db.get(
        `SELECT id FROM despesas
         WHERE tenant_id = ? AND MONTH(vencimento) = ? AND YEAR(vencimento) = ?
         AND (
           despesa_recorrente_id = ?
           OR (descricao = ? AND usuario_id = ?
               ${mae.categoria_id == null ? 'AND categoria_id IS NULL' : 'AND categoria_id = ?'})
         )
         LIMIT 1`,
        params
      );

      if (jaExiste) continue;

      // Trata dia inexistente no mês (ex: dia 31 em fevereiro → último dia)
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dia = Math.min(diaVenc, ultimoDia);
      const novaData = `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;

      await db.run(
        `INSERT INTO despesas
         (tenant_id, descricao, valor, vencimento, categoria_id, usuario_id,
          forma_pagamento, recorrente, total_parcelas, parcela_atual, despesa_recorrente_id)
         VALUES (?,?,?,?,?,?,?,0,1,1,?)`,
        [db.tenantId, mae.descricao, mae.valor, novaData,
         mae.categoria_id, mae.usuario_id, mae.forma_pagamento, mae.id]
      );
    }
  }
}

module.exports = { gerarRecorrencias, gerarRecorrenciasTenant };
