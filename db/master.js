const pool = require('./mysql');

let initialized = false;

async function getMasterDb() {
  if (!initialized) {
    await pool.execute(`CREATE TABLE IF NOT EXISTS planos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL UNIQUE,
      max_usuarios INT NOT NULL DEFAULT 1,
      max_lancamentos_mes INT NOT NULL DEFAULT 50,
      preco DECIMAL(10,2) NOT NULL DEFAULT 0,
      features TEXT NOT NULL
    ) CHARACTER SET utf8mb4`);

    await pool.execute(`CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      email_admin VARCHAR(200) NOT NULL,
      plano_id INT NOT NULL DEFAULT 1,
      status VARCHAR(50) NOT NULL DEFAULT 'ativo',
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expira_em DATETIME NULL,
      FOREIGN KEY (plano_id) REFERENCES planos(id)
    ) CHARACTER SET utf8mb4`);

    const [[{ n }]] = await pool.execute('SELECT COUNT(*) as n FROM planos');
    if (!n) {
      await pool.execute(`INSERT INTO planos (nome,max_usuarios,max_lancamentos_mes,preco,features) VALUES
        ('Free', 1, 50, 0, 'Dashboard,Receitas,Despesas,Categorias,Metas'),
        ('Pro', 5, -1, 29.90, 'Dashboard,Receitas,Despesas,Categorias,Metas,Relatórios,Backup,Usuários'),
        ('Family', -1, -1, 49.90, 'Dashboard,Receitas,Despesas,Categorias,Metas,Relatórios,Backup,Usuários,Suporte prioritário')`
      );
    }

    initialized = true;
  }

  return {
    all: async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows; },
    get: async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0] || null; },
    run: async (sql, params = []) => { const [r] = await pool.execute(sql, params); return { lastId: r.insertId, changes: r.affectedRows }; }
  };
}

function resetMasterDb() { initialized = false; }

module.exports = { getMasterDb, resetMasterDb };
