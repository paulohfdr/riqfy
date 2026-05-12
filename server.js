require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getMasterDb } = require('./db/master');
const { initTenantTables, seedTenant, pool } = require('./db/database');
const { gerarRecorrencias } = require('./routes/recorrencia');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8000;
const isProd = process.env.NODE_ENV === 'production';

// Segurança: headers HTTP
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: permite apenas origens explicitamente autorizadas
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:8000', 'http://127.0.0.1:8000'];

app.use(cors({
  origin: (origin, cb) => {
    // Requisições sem origin (same-origin, mobile, Postman em dev) são permitidas
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Master-Password', 'X-Master-User']
}));

// Limitar tamanho de requests (previne DoS via payloads gigantes)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(cookieParser());

// Rate limiting global: 300 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições deste IP. Tente novamente em alguns minutos.' }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/receitas',  require('./routes/receitas'));
app.use('/api/despesas',  require('./routes/despesas'));
app.use('/api/categorias',require('./routes/categorias'));
app.use('/api/metas',     require('./routes/metas'));
app.use('/api/usuarios',  require('./routes/usuarios'));
app.use('/api/backup',    require('./routes/backup'));
app.use('/api/tenant',    require('./routes/tenant'));
app.use('/api/admin',     require('./routes/admin-master'));

app.get('/', (req, res) => res.redirect('/login'));

const pages = ['/dashboard', '/receitas', '/despesas', '/categorias', '/metas', '/relatorios', '/usuarios', '/backup'];
pages.forEach(p => {
  app.get(p, (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', p.slice(1) + '.html')));
});
app.get('/login',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'login.html')));
app.get('/register', (req, res) => res.redirect('/login'));
app.get('/admin',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'admin-master.html')));
app.get('/upgrade',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'pages', 'upgrade.html')));

// Handler de erro centralizado e seguro
app.use(errorHandler);

async function inicializar() {
  await pool.query('SELECT 1');
  logger.info('MySQL conectado');

  await getMasterDb();
  logger.info('Tabelas master inicializadas');

  await initTenantTables();
  logger.info('Tabelas de tenant inicializadas');

  const masterDb = await getMasterDb();
  const demoExiste = await masterDb.get("SELECT id FROM tenants WHERE slug = 'demo'");
  if (!demoExiste) {
    const planoFree = await masterDb.get("SELECT id FROM planos WHERE nome = 'Free'");
    const r = await masterDb.run(
      'INSERT INTO tenants (nome,slug,email_admin,plano_id,status) VALUES (?,?,?,?,?)',
      ['RiqFy Demo', 'demo', 'admin@riqfy.com', planoFree?.id || 1, 'ativo']
    );
    await seedTenant(r.lastId);
    logger.info('Tenant demo criado');
  }

  await gerarRecorrencias();

  const agora = new Date();
  const meianoite = new Date(agora);
  meianoite.setHours(24, 0, 0, 0);
  setTimeout(() => {
    gerarRecorrencias();
    setInterval(gerarRecorrencias, 24 * 60 * 60 * 1000);
  }, meianoite - agora);

  app.listen(PORT, () => {
    logger.info(`RiqFy iniciado na porta ${PORT}`);

    // Credenciais de acesso só aparecem fora de produção
    if (!isProd) {
      const masterPwd = process.env.MASTER_PASSWORD || 'riqfy-master-2025';
      console.log(`\n✅ RiqFy Multi-Tenant → http://127.0.0.1:${PORT}`);
      console.log(`   Tenant demo  → /login  (slug: demo | admin / admin123)`);
      console.log(`   Admin master → /admin  (senha: ${masterPwd})\n`);
    }
  });
}

inicializar().catch(err => {
  logger.error('Erro fatal na inicialização', { error: err.message });
  process.exit(1);
});
