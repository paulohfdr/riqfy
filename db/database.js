const pool = require('./mysql');
const bcrypt = require('bcryptjs');
const path = require('path');

const TENANTS_DIR = path.join(__dirname, '..', 'tenants'); // mantido para compat

async function initTenantTables() {
  await pool.execute(`CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nome VARCHAR(200) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(200) NOT NULL,
    senha TEXT NOT NULL,
    nivel VARCHAR(50) NOT NULL DEFAULT 'suporte',
    status VARCHAR(50) NOT NULL DEFAULT 'ativo',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user (username, tenant_id),
    UNIQUE KEY uniq_email (email, tenant_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    cor VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS receitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data DATE NOT NULL,
    categoria_id INT,
    usuario_id INT,
    recorrente TINYINT NOT NULL DEFAULT 0,
    recebido TINYINT NOT NULL DEFAULT 1,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_receitas_data (data),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    vencimento DATE NOT NULL,
    categoria_id INT,
    usuario_id INT,
    forma_pagamento VARCHAR(50) NOT NULL DEFAULT 'pix',
    recorrente TINYINT NOT NULL DEFAULT 0,
    total_parcelas INT NOT NULL DEFAULT 1,
    parcela_atual INT NOT NULL DEFAULT 1,
    grupo_parcela VARCHAR(100),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_despesas_venc (vencimento),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS metas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    valor_alvo DECIMAL(15,2) NOT NULL,
    valor_atual DECIMAL(15,2) NOT NULL DEFAULT 0,
    data_limite DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'em_andamento',
    usuario_id INT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  await pool.execute(`CREATE TABLE IF NOT EXISTS aporte_metas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meta_id INT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data DATE NOT NULL,
    observacao TEXT,
    FOREIGN KEY (meta_id) REFERENCES metas(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  // Migração: adiciona coluna recebido se não existir (compatível com qualquer versão MySQL)
  const [colsRecebido] = await pool.execute(
    `SELECT COLUMN_NAME, COLUMN_DEFAULT FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receitas' AND COLUMN_NAME = 'recebido'`
  );
  if (!colsRecebido.length) {
    await pool.execute('ALTER TABLE receitas ADD COLUMN recebido TINYINT NOT NULL DEFAULT 1');
    console.log('✅ Migração: coluna recebido adicionada à tabela receitas');
  } else if (String(colsRecebido[0].COLUMN_DEFAULT) === '0') {
    await pool.execute('ALTER TABLE receitas MODIFY COLUMN recebido TINYINT NOT NULL DEFAULT 1');
    await pool.execute('UPDATE receitas SET recebido = 1 WHERE recebido = 0');
    console.log('✅ Migração: padrão de recebido atualizado para 1 e registros existentes marcados como recebidos');
  }

  // Migração: colunas de status e data de recebimento
  const [colsStatus] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receitas' AND COLUMN_NAME = 'status'`
  );
  if (!colsStatus.length) {
    await pool.execute(`ALTER TABLE receitas
      ADD COLUMN status ENUM('pendente','recebida') NOT NULL DEFAULT 'pendente' AFTER descricao,
      ADD COLUMN data_recebimento DATE DEFAULT NULL AFTER data,
      ADD COLUMN mes_recebimento INT DEFAULT NULL AFTER data_recebimento,
      ADD COLUMN ano_recebimento INT DEFAULT NULL AFTER mes_recebimento`);
    await pool.execute('ALTER TABLE receitas ADD INDEX idx_status (status)');
    await pool.execute('ALTER TABLE receitas ADD INDEX idx_data_recebimento (data_recebimento)');
    await pool.execute('ALTER TABLE receitas ADD INDEX idx_mes_ano_recebimento (mes_recebimento, ano_recebimento)');
    // Registros existentes com recebido=1 → recebida; recebido=0 → pendente
    await pool.execute(`UPDATE receitas SET status='recebida', data_recebimento=data,
      mes_recebimento=MONTH(data), ano_recebimento=YEAR(data) WHERE recebido=1`);
    console.log('✅ Migração: colunas de status de receita adicionadas e dados sincronizados');
  }
}

async function seedTenant(tenantId) {
  const [existing] = await pool.execute(
    "SELECT id FROM usuarios WHERE tenant_id = ? AND username = 'admin'", [tenantId]
  );
  if (existing.length) return;

  const hash = await bcrypt.hash('admin123', 10);
  await pool.execute(
    'INSERT INTO usuarios (tenant_id,nome,username,email,senha,nivel,status) VALUES (?,?,?,?,?,?,?)',
    [tenantId, 'Administrador', 'admin', 'admin@riqfy.com', hash, 'administrador', 'ativo']
  );

  const categorias = [
    ['Salário','receita','#16a34a'], ['Freelancer','receita','#0891b2'],
    ['Casa','despesa','#dc2626'],    ['Alimentação','despesa','#ea580c'],
    ['Transporte','despesa','#7c3aed'], ['Lazer','despesa','#db2777'],
    ['Saúde','despesa','#059669'],   ['Educação','despesa','#2563eb'],
    ['Geral','geral','#6b7280']
  ];
  for (const [nome, tipo, cor] of categorias) {
    await pool.execute(
      'INSERT INTO categorias (tenant_id,nome,tipo,cor) VALUES (?,?,?,?)',
      [tenantId, nome, tipo, cor]
    );
  }
}

async function getDb(slug) {
  if (!slug) throw new Error('slug do tenant é obrigatório');
  const [rows] = await pool.execute('SELECT id FROM tenants WHERE slug = ?', [slug]);
  if (!rows.length) throw new Error(`Tenant não encontrado: ${slug}`);
  const tenantId = rows[0].id;
  return {
    tenantId,
    all: async (sql, params = []) => { const [r] = await pool.execute(sql, params); return r; },
    get: async (sql, params = []) => { const [r] = await pool.execute(sql, params); return r[0] || null; },
    run: async (sql, params = []) => { const [r] = await pool.execute(sql, params); return { lastId: r.insertId, changes: r.affectedRows }; }
  };
}

function clearTenantCache() {} // no-op mantido para compatibilidade

module.exports = { getDb, clearTenantCache, TENANTS_DIR, initTenantTables, seedTenant, pool };
