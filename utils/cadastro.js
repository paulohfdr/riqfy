const bcrypt = require('bcryptjs');
const { getMasterDb } = require('../db/master');
const pool = require('../db/mysql');
const logger = require('./logger');

function gerarSlug(nome) {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

async function slugUnico(masterDb, base) {
  let slug = base, i = 2;
  while (await masterDb.get('SELECT id FROM tenants WHERE slug = ?', [slug])) slug = base + '-' + i++;
  return slug;
}

// Cadastro de novo tenant/usuário admin
function cadastro(senhaProvisoria) {
  return async function criarConta(req, res) {
    const { nome, email, username, senha, plano_id } = req.body;

    try {
      const masterDb = await getMasterDb();

      if (await masterDb.get('SELECT id FROM tenants WHERE email_admin = ?', [email]))
        return res.status(400).json({ erro: 'Este email já está cadastrado' });

      if (await masterDb.get('SELECT id FROM tenants WHERE slug = ?', [gerarSlug(username)]))
        return res.status(400).json({ erro: 'Este nome de usuário já está em uso' });

      const slug = await slugUnico(masterDb, gerarSlug(username));
      const planoFree = await masterDb.get('SELECT id FROM planos ORDER BY id LIMIT 1');
      let planoId = planoFree?.id || 1;
      if (plano_id) {
        const planoEscolhido = await masterDb.get('SELECT id FROM planos WHERE id = ?', [plano_id]);
        if (planoEscolhido) planoId = planoEscolhido.id;
      }

      if (Buffer.byteLength(senha) > 72) return res.status(400).json({ erro: 'Senha muito longa.' });
      const hash = await bcrypt.hash(senha, 12);
      const conn = await pool.getConnection();
      let tenantId;
      try {
        await conn.beginTransaction();
        const [tenant] = await conn.execute(
          'INSERT INTO tenants (nome,slug,email_admin,plano_id,status) VALUES (?,?,?,?,?)',
          [nome, slug, email, planoId, 'ativo']
        );
        tenantId = tenant.insertId;
        await conn.execute(
          'INSERT INTO usuarios (tenant_id,nome,username,email,senha,nivel,status,senha_provisoria) VALUES (?,?,?,?,?,?,?,?)',
          [tenantId, nome, username, email, hash, 'administrador', 'ativo', senhaProvisoria ? 1 : 0]
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      res.json({ ok: true, slug, tenantId, msg: 'Acesso criado com sucesso!' });
    } catch(e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Este acesso já está cadastrado.' });
      logger.error('Erro no register', { error: e.message });
      res.status(500).json({ erro: 'Erro ao criar acesso' });
    }
  };
}

module.exports = cadastro;
