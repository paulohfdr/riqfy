const API = '/api';
let _tenantNome = '';

async function checkAuth() {
  try {
    const r = await fetch(API + '/auth/me');
    if (!r.ok) { window.location.href = '/login'; return null; }
    const { usuario } = await r.json();
    _tenantNome = usuario.tenantNome || '';
    renderUserBadge(usuario);
    carregarPlanoBadge();
    return usuario;
  } catch { window.location.href = '/login'; return null; }
}

async function carregarPlanoBadge() {
  try {
    const r = await fetch(API + '/tenant/info');
    if (!r.ok) return;
    const info = await r.json();
    const el = document.getElementById('sidebar-plano');
    if (!el || !info.plano_nome) return;
    const cores = { Free: '#64748b', Pro: '#2563eb', Family: '#ca8a04' };
    const bgs   = { Free: '#f1f5f9', Pro: '#eff6ff', Family: '#fefce8' };
    const cor = cores[info.plano_nome] || '#64748b';
    const bg  = bgs[info.plano_nome]  || '#f1f5f9';
    el.innerHTML =
      '<span style="display:inline-flex;align-items:center;gap:4px;background:' + bg + ';color:' + cor + ';' +
      'border:1px solid ' + cor + '33;border-radius:20px;padding:1px 8px;font-size:10px;font-weight:700;letter-spacing:.04em">' +
      '<span style="width:5px;height:5px;border-radius:50%;background:' + cor + ';display:inline-block"></span>' +
      info.plano_nome + '</span>';
  } catch {}
}

function getSaudacao() {
  var h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function renderUserBadge(usuario) {
  const el = document.getElementById('user-nome');
  const av = document.getElementById('user-avatar');
  if (el) el.textContent = usuario.nome.split(' ')[0];
  if (av) av.textContent = usuario.nome.charAt(0).toUpperCase();
  const sNome = document.getElementById('sidebar-nome');
  const sAv = document.getElementById('sidebar-avatar');
  const sGreet = document.getElementById('sidebar-saudacao');
  if (sNome) sNome.textContent = usuario.nome.split(' ')[0];
  if (sAv) sAv.textContent = usuario.nome.charAt(0).toUpperCase();
  if (sGreet) sGreet.textContent = getSaudacao();
}

async function logout() {
  await fetch(API + '/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

function fmtBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtData(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return parseInt(day) + ' de ' + meses[parseInt(m)-1] + ' de ' + y;
}
function fmtDataCurta(d) {
  if (!d) return '—';
  return d.split('-').reverse().join('/');
}

function toast(msg, tipo) {
  tipo = tipo || 'success';
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.innerHTML = '<span>' + (tipo === 'success' ? '✓' : '✕') + '</span><span>' + msg + '</span>';
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function apiFetch(url, options) {
  options = options || {};
  const r = await fetch(API + url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options));
  if (r.status === 401) { window.location.href = '/login'; return null; }
  const data = await r.json();
  if (!r.ok) throw new Error(data.erro || 'Erro desconhecido');
  return data;
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function getMesAnoAtual() {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

function preencherFiltroMesAno(mesId, anoId, callback) {
  const sel = document.getElementById(mesId);
  const sel2 = document.getElementById(anoId);
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  if (sel) {
    sel.innerHTML = meses.map(function(m, i) { return '<option value="' + (i+1) + '">' + m + '</option>'; }).join('');
    sel.value = new Date().getMonth() + 1;
  }
  if (sel2) {
    const ano = new Date().getFullYear();
    sel2.innerHTML = [ano-1, ano, ano+1].map(function(a) { return '<option value="' + a + '"' + (a===ano?' selected':'') + '>' + a + '</option>'; }).join('');
    sel2.value = ano;
  }
  if (callback) callback();
}

function confirmarExclusao(nome, callback) {
  const existing = document.getElementById('confirm-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:28px 28px 24px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3)">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
        '<div style="width:44px;height:44px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:16px;font-weight:700;color:#0f172a">Confirmar exclusão</div>' +
          '<div style="font-size:13px;color:#64748b;margin-top:2px">Esta ação não pode ser desfeita.</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#374151;border-left:3px solid #dc2626">' +
        'Tem certeza que deseja excluir <strong style="color:#0f172a">' + nome + '</strong>?' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end">' +
        '<button onclick="document.getElementById(\'confirm-overlay\').remove()" style="padding:9px 20px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;font-size:13px;font-weight:500;cursor:pointer">Cancelar</button>' +
        '<button id="confirm-btn-yes" style="padding:9px 20px;border-radius:8px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Sim, excluir</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.getElementById('confirm-btn-yes').onclick = function() { overlay.remove(); callback(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

const ICONS = {
  dashboard:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  receitas:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>',
  despesas:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8H8"/><path d="M16 12H8"/><path d="M12 16H8"/></svg>',
  categorias: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z"/><path d="M6 9.01V9"/><path d="m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19"/></svg>',
  metas:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
  relatorios: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  backup:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>',
  usuarios:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
};

function renderSidebar(ativo) {
  function navItem(href, icon, label) {
    var active = ativo === href ? ' active' : '';
    return '<a href="' + href + '" class="nav-item' + active + '">' + ICONS[icon] + ' ' + label + '</a>';
  }
  return (
    '<aside class="sidebar">' +
      '<div class="sidebar-logo">' +
        '<img src="/img/logo_riqfy.svg" alt="RiqFy" onclick="window.location.href=\'/dashboard\'" style="cursor:pointer" title="Dashboard">' +
      '</div>' +
      '<div onclick="window.location.href=\'/usuarios\'" style="padding:12px 16px 14px;border-bottom:1px solid var(--borda);display:flex;align-items:center;gap:10px;cursor:pointer" title="Gerenciar usuários">' +
        '<div class="user-avatar" id="sidebar-avatar" style="width:36px;height:36px;font-size:14px;flex-shrink:0">?</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">' +
            '<div style="font-size:13px;font-weight:700;color:var(--texto);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0" id="sidebar-nome">—</div>' +
            '<div id="sidebar-plano" style="flex-shrink:0"></div>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--muted)" id="sidebar-saudacao">Bem-vindo</div>' +
        '</div>' +
      '</div>' +
      '<nav class="sidebar-nav">' +
        navItem('/dashboard', 'dashboard', 'Dashboard') +
        navItem('/receitas', 'receitas', 'Receitas') +
        navItem('/despesas', 'despesas', 'Despesas') +
        navItem('/categorias', 'categorias', 'Categorias') +
        navItem('/metas', 'metas', 'Metas') +
        navItem('/relatorios', 'relatorios', 'Relatórios') +
        navItem('/usuarios', 'usuarios', 'Usuários') +
        navItem('/backup', 'backup', 'Backup') +
      '</nav>' +
      '<div style="padding:12px 16px">' +
        '<button onclick="logout()" style="width:100%;background:var(--primary);color:#fff;border:none;padding:9px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;transition:background 0.15s">Sair</button>' +
      '</div>' +
      '<div class="sidebar-footer">Suas finanças, seu controle.</div>' +
    '</aside>'
  );
}

function renderTopbar() {
  return (
    '<div class="topbar">' +
      '<div class="topbar-logo">' +
        '<img src="/img/logo_riqfy.svg" alt="RiqFy">' +
      '</div>' +
      '<div class="user-badge" onclick="window.location.href=\'/usuarios\'" style="cursor:pointer" title="Gerenciar usuários">' +
        '<div class="user-avatar" id="user-avatar">?</div>' +
        '<span id="user-nome">Carregando...</span>' +
      '</div>' +
    '</div>'
  );
}

function renderBottomNav(ativo) {
  function is(p) { return ativo === p ? ' active' : ''; }
  return (
    '<div class="more-menu-overlay" id="more-overlay" onclick="toggleMore()"></div>' +
    '<div class="more-menu" id="more-menu">' +
      '<div class="more-menu-title">Mais opções</div>' +
      '<div class="more-menu-grid">' +
        '<a href="/categorias" class="more-menu-item' + is('/categorias') + '">' + ICONS.categorias + '<span>Categorias</span></a>' +
        '<a href="/relatorios" class="more-menu-item' + is('/relatorios') + '">' + ICONS.relatorios + '<span>Relatórios</span></a>' +
        '<a href="/usuarios" class="more-menu-item' + is('/usuarios') + '">' + ICONS.usuarios + '<span>Usuários</span></a>' +
        '<a href="/backup" class="more-menu-item' + is('/backup') + '">' + ICONS.backup + '<span>Backup</span></a>' +
      '</div>' +
    '</div>' +
    '<nav class="bottom-nav">' +
      '<a href="/dashboard" class="bottom-nav-item' + is('/dashboard') + '">' + ICONS.dashboard + '<span>Dashboard</span></a>' +
      '<a href="/receitas" class="bottom-nav-item' + is('/receitas') + '">' + ICONS.receitas + '<span>Receitas</span></a>' +
      '<div class="bottom-nav-item bottom-nav-more" onclick="toggleMore()">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '</div>' +
      '<a href="/despesas" class="bottom-nav-item' + is('/despesas') + '">' + ICONS.despesas + '<span>Despesas</span></a>' +
      '<a href="/metas" class="bottom-nav-item' + is('/metas') + '">' + ICONS.metas + '<span>Metas</span></a>' +
    '</nav>'
  );
}

function toggleMore() {
  var menu = document.getElementById('more-menu');
  var overlay = document.getElementById('more-overlay');
  if (menu && overlay) {
    menu.classList.toggle('open');
    overlay.classList.toggle('open');
  }
}
