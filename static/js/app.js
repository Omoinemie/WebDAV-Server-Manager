// Main application
var cfg = {}, rules = [], users = [];
var currentLang = 'en';

document.addEventListener('DOMContentLoaded', function() {
  var cachedLang = localStorage.getItem('lang') || 'en';
  currentLang = cachedLang;
  I18n.load(cachedLang).then(function() {
    I18n.applyToDOM();
    document.body.classList.add('i18n-ready');
    updThm();
    setupNav();
    setupPermClick();
    setupLangSwitch();
    FM.initEvents();
    Preview.initEvents();
    setupModalClose();
    loadCfg();
    tick();
    setInterval(tick, 1000);
    updateServiceStatus();
    setInterval(updateServiceStatus, 10000);
  }).catch(function() {
    document.body.classList.add('i18n-ready');
  });
});

// ─── THEME ───
// Theme is applied in <head> before first paint to prevent flash.
// Here we just sync the toggle icon.
var sunPath = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
var moonPath = 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';

function toggleTheme() {
  var c = document.documentElement.dataset.theme;
  var n = c === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = n;
  localStorage.setItem('th', n);
  updThm();
}

function updThm() {
  var isDark = document.documentElement.dataset.theme === 'dark';
  var icon = document.getElementById('thmIcon');
  if (icon) icon.innerHTML = '<path d="' + (isDark ? moonPath : sunPath) + '"/>';
}

// ─── NAV ───
function setupNav() {
  var navItems = document.querySelectorAll('.nav-i');
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].addEventListener('click', function() {
      var allNav = document.querySelectorAll('.nav-i');
      for (var j = 0; j < allNav.length; j++) allNav[j].classList.remove('on');
      this.classList.add('on');
      var s = this.dataset.s;
      var allSec = document.querySelectorAll('.sec');
      for (var k = 0; k < allSec.length; k++) allSec[k].classList.remove('on');
      document.getElementById('s-' + s).classList.add('on');
      var titles = {
        server: I18n.t('nav_server'), tls: I18n.t('nav_tls'), cors: I18n.t('nav_cors'),
        logging: I18n.t('nav_logging'), rules: I18n.t('nav_rules'), users: I18n.t('nav_users'),
        files: I18n.t('nav_files'), raw: I18n.t('nav_raw'), settings: I18n.t('nav_settings')
      };
      document.getElementById('secTitle').textContent = titles[s] || '';
      if (s === 'raw') loadRaw();
      if (s === 'files') FM.go();
      if (s === 'settings') loadSettingsForm();
      document.getElementById('sidebar').classList.remove('open');
    });
  }
}

// ─── PERM CLICK ───
function setupPermClick() {
  document.addEventListener('click', function(e) {
    var c = e.target.closest('.pc');
    if (!c || e.target.tagName === 'INPUT') return;
    e.preventDefault();
    var cb = c.querySelector('input');
    if (!cb) return;
    cb.checked = !cb.checked;
    c.classList.toggle('on', cb.checked);
  });
}

// ─── MODAL CLOSE ───
function setupModalClose() {
  var allMov = document.querySelectorAll('.mov');
  for (var mi = 0; mi < allMov.length; mi++) {
    allMov[mi].addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('show');
    });
  }
}

// ─── LOAD / SAVE CONFIG ───
async function loadCfg() {
  try {
    var r = await fetch('/api/config');
    var d = await r.json();
    if (d.error) { toast(d.error, 'err'); return; }
    cfg = d.config || {};
    document.getElementById('cfgPath').textContent = d.path;
    fillForm();
    toast(I18n.t('toast_config_loaded'), 'ok');
    st(I18n.t('toast_config_loaded'));
  } catch (e) {
    toast(I18n.t('toast_load_failed'), 'err');
  }
}

function fillForm() {
  v('address', cfg.address);
  v('port', cfg.port);
  v('prefix', cfg.prefix);
  v('directory', cfg.directory);
  ckd('debug', cfg.debug);
  ckd('noSniff', cfg.noSniff);
  ckd('behindProxy', cfg.behindProxy);
  ckd('noPassword', cfg.noPassword);
  setPerm('defPerms', cfg.permissions);
  v('rulesBehavior', cfg.rulesBehavior);
  ckd('tls', cfg.tls);
  v('cert', cfg.cert);
  v('key', cfg.key);
  var co = cfg.cors || {};
  ckd('corsOn', co.enabled);
  ckd('corsCred', co.credentials);
  a2t('corsHosts', co.allowed_hosts);
  a2t('corsHdrs', co.allowed_headers);
  a2t('corsMtds', co.allowed_methods);
  a2t('corsExp', co.exposed_headers);
  var lg = cfg.log || {};
  v('logFmt', lg.format);
  ckd('logClr', lg.colors);
  fillOuts(lg.outputs);
  rules = cfg.rules || [];
  renderRules();
  renderUsers();
}

async function saveCfg() {
  var c = buildCfg();
  var d = validateCfg(c);
  if (!d.valid) { toast(I18n.t('toast_validate_failed') + ': ' + d.errors.join('; '), 'err'); return; }

  try {
    var r2 = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c)
    });
    var d2 = await r2.json();
    if (d2.success) { toast(I18n.t('toast_saved'), 'ok'); st(I18n.t('toast_saved')); cfg = c; }
    else toast(I18n.t('toast_save_failed'), 'err');
  } catch (e) {
    toast(I18n.t('toast_save_failed'), 'err');
  }
}

function buildCfg() {
  var c = {};
  var a = v('address'); if (a) c.address = a;
  var p = parseInt(v('port')); if (p) c.port = p;
  var pr = v('prefix'); if (pr) c.prefix = pr;
  var dir = v('directory'); if (dir) c.directory = dir;
  if (ckd('debug')) c.debug = true;
  if (ckd('noSniff')) c.noSniff = true;
  if (ckd('behindProxy')) c.behindProxy = true;
  if (ckd('noPassword')) c.noPassword = true;
  var pm = getPerm('defPerms'); if (pm) c.permissions = pm;
  var rb = v('rulesBehavior'); if (rb) c.rulesBehavior = rb;
  c.tls = !!ckd('tls');
  if (c.tls) {
    var ce = v('cert'); if (ce) c.cert = ce;
    var k = v('key'); if (k) c.key = k;
  }
  var co = {};
  if (ckd('corsOn')) co.enabled = true;
  if (ckd('corsCred')) co.credentials = true;
  var h = t2a('corsHosts'); if (h.length) co.allowed_hosts = h;
  var hd = t2a('corsHdrs'); if (hd.length) co.allowed_headers = hd;
  var m = t2a('corsMtds'); if (m.length) co.allowed_methods = m;
  var ex = t2a('corsExp'); if (ex.length) co.exposed_headers = ex;
  if (Object.keys(co).length) c.cors = co;
  var lg = {};
  var f = v('logFmt'); if (f) lg.format = f;
  if (ckd('logClr')) lg.colors = true;
  var outs = getOuts(); if (outs.length) lg.outputs = outs;
  if (Object.keys(lg).length) c.log = lg;
  if (rules.length) c.rules = rules;
  if (users.length) c.users = users;
  return c;
}

// ─── LANGUAGE SWITCH (client-side, no reload) ───
function setupLangSwitch() {
  var sel = document.getElementById('setLang');
  if (!sel) return;
  sel.addEventListener('change', async function() {
    var newLang = this.value;
    if (newLang === currentLang) return;
    currentLang = newLang;
    await I18n.switchLang(newLang);
    // Re-render dynamic content that uses I18n.t()
    renderUsers();
    renderRules();
    toast(I18n.t('toast_saved'), 'ok');
  });
}

// ─── SETTINGS ───
async function loadSettingsForm() {
  try {
    var r = await fetch('/api/settings');
    var s = await r.json();
    var lang = s.language || currentLang || 'en';
    v('setLang', lang);
    localStorage.setItem('lang', lang);
    v('setPort', s.web_port || 3080);
    v('setConfigPath', s.config_path || '');
    v('setServiceName', s.service_name || 'webdav');
    v('setFileRoot', s.file_root || '');
    v('setSecretKey', s.secret_key || '');
  } catch (e) {}
}

async function saveSettings() {
  var newLang = v('setLang');
  var data = {
    language: newLang,
    web_port: parseInt(v('setPort')) || 3080,
    config_path: v('setConfigPath'),
    service_name: v('setServiceName'),
    file_root: v('setFileRoot'),
    secret_key: v('setSecretKey')
  };
  try {
    var r = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    var d = await r.json();
    if (d.success) {
      toast(I18n.t('toast_saved'), 'ok');
      // Switch language client-side if changed
      if (newLang !== currentLang) {
        currentLang = newLang;
        await I18n.switchLang(newLang);
        renderUsers();
        renderRules();
      }
    } else {
      toast(I18n.t('toast_save_failed'), 'err');
    }
  } catch (e) {
    toast(I18n.t('toast_save_failed'), 'err');
  }
}

// ─── USERS ───
function renderUsers() {
  users = cfg.users || [];
  document.getElementById('uCnt').textContent = users.length;
  var el = document.getElementById('userList');
  if (!users.length) {
    el.innerHTML = '<div class="empty"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px;display:block;opacity:.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg><p>' + I18n.t('empty_users') + '</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var p = permBadges(u.permissions);
    var d = u.directory ? '<span class="tg bl">' + I18n.t('dir_tag') + ': ' + e(u.directory) + '</span>' : '';
    var rc = (u.rules || []).length;
    var rh = rc ? '<span class="tg">' + I18n.t('rules_tag') + ': ' + rc + '</span>' : '';
    var pt = (u.password || '').indexOf('{bcrypt}') === 0 ? 'bcrypt' : (u.password || '').indexOf('{env}') === 0 ? 'env' : I18n.t('password_plaintext');
    var pt2 = pt === I18n.t('password_plaintext') ? '<span class="tg rd">' + pt + '</span>' : '<span class="tg gr">' + pt + '</span>';
    html += '<div class="ucard">';
    html += '<div class="uinfo"><div class="uname"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ' + e(u.username) + ' ' + p + '</div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">' + pt2 + ' ' + d + ' ' + rh + '</div></div>';
    html += '<div class="uacts">';
    html += '<button class="btn btn-o btn-s" onclick="editU(' + i + ')">' + I18n.t('btn_edit') + '</button>';
    html += '<button class="btn btn-d btn-s" onclick="delU(' + i + ')">' + I18n.t('btn_delete') + '</button>';
    html += '</div></div>';
  }
  el.innerHTML = html;
}

function openUser(i) {
  document.getElementById('uIdx').value = i !== undefined ? i : -1;
  document.getElementById('uMovTitle').textContent = i !== undefined ? I18n.t('modal_edit_user') : I18n.t('modal_add_user');
  document.getElementById('muR').innerHTML = '';
  if (i !== undefined && users[i]) {
    var u = users[i];
    v('muUser', u.username);
    v('muPass', u.password);
    v('muDir', u.directory);
    setPerm('muP', u.permissions);
    var ur = u.rules || [];
    for (var j = 0; j < ur.length; j++) addMuR(ur[j]);
  } else {
    v('muUser', '');
    v('muPass', '');
    v('muDir', '');
    setPerm('muP', '');
  }
  document.getElementById('userMov').classList.add('show');
}

function saveUser() {
  var idx = +document.getElementById('uIdx').value;
  var un = v('muUser').trim();
  var pw = v('muPass').trim();
  if (!un || !pw) { toast(I18n.t('toast_user_required'), 'err'); return; }
  var o = { username: un, password: pw };
  var d = v('muDir').trim(); if (d) o.directory = d;
  var pm = getPerm('muP'); if (pm) o.permissions = pm;
  var ur = [];
  var murItems = document.querySelectorAll('#muR .mur');
  for (var i = 0; i < murItems.length; i++) {
    var r = murItems[i];
    var tp = r.querySelector('.mur-t').value;
    var vl = r.querySelector('.mur-v').value.trim();
    var rp = [];
    var rpCbs = r.querySelectorAll('.pc');
    for (var j = 0; j < rpCbs.length; j++) {
      if (rpCbs[j].querySelector('input').checked) rp.push(rpCbs[j].dataset.p);
    }
    if (!vl) continue;
    var rule = tp === 'path' ? { path: vl } : { regex: vl };
    rule.permissions = rp.length ? rp.join('') : 'none';
    ur.push(rule);
  }
  if (ur.length) o.rules = ur;
  if (idx >= 0) users[idx] = o; else users.push(o);
  cfg.users = users;
  renderUsers();
  closeM('userMov');
  toast(idx >= 0 ? I18n.t('toast_user_updated') : I18n.t('toast_user_added'), 'ok');
}

function editU(i) { openUser(i); }

function delU(i) {
  if (!confirm(I18n.t('confirm_delete_user') + ' "' + users[i].username + '"?')) return;
  users.splice(i, 1);
  cfg.users = users;
  renderUsers();
  toast(I18n.t('toast_user_deleted'), 'inf');
}

function addMuR(rule) {
  var d = document.createElement('div');
  d.className = 'mur';
  d.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;align-items:center;background:var(--bg);padding:8px;border-radius:7px;flex-wrap:wrap';

  var ir = rule && rule.regex;
  var vl = rule ? (rule.path || rule.regex || '') : '';
  var rp = rule ? (rule.permissions || '') : '';

  var html = '<select class="mur-t" style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:5px;color:var(--text);font-size:11px">';
  html += '<option value="path"' + (ir ? '' : ' selected') + '>Path</option>';
  html += '<option value="regex"' + (ir ? ' selected' : '') + '>Regex</option>';
  html += '</select>';
  html += '<input class="mur-v" value="' + e(vl) + '" placeholder="' + (ir ? 'regex' : '/path') + '" style="flex:1;min-width:100px;background:var(--bg2);border:1px solid var(--border);border-radius:5px;padding:5px 8px;color:var(--text);font-size:11px">';
  html += '<div class="pcs" style="gap:3px">';

  var permArr = ['C', 'R', 'U', 'D'];
  for (var i = 0; i < permArr.length; i++) {
    var pp = permArr[i];
    var isOn = rp.indexOf(pp) >= 0;
    html += '<label class="pc' + (isOn ? ' on' : '') + '" data-p="' + pp + '" style="padding:3px 7px;font-size:10px">';
    html += '<input type="checkbox"' + (isOn ? ' checked' : '') + '>' + pp;
    html += '</label>';
  }

  html += '</div>';
  html += '<button class="btn btn-d btn-s" onclick="this.parentElement.remove()">X</button>';

  d.innerHTML = html;
  document.getElementById('muR').appendChild(d);
}

// ─── RULES ───
function renderRules() {
  document.getElementById('rCnt').textContent = rules.length;
  var el = document.getElementById('rulesList');
  if (!rules.length) {
    el.innerHTML = '<div class="empty"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px;display:block;opacity:.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg><p>' + I18n.t('empty_rules') + '</p></div>';
    return;
  }
  var html = '<table class="tbl"><thead><tr><th>#</th><th>' + I18n.t('col_type') + '</th><th>' + I18n.t('col_match') + '</th><th>' + I18n.t('col_perms') + '</th><th>' + I18n.t('col_actions') + '</th></tr></thead><tbody>';
  for (var i = 0; i < rules.length; i++) {
    var r = rules[i];
    html += '<tr>';
    html += '<td>' + (i + 1) + '</td>';
    html += '<td>' + (r.path ? '<span class="tg bl">path</span>' : '<span class="tg">regex</span>') + '</td>';
    html += '<td><code>' + e(r.path || r.regex) + '</code></td>';
    html += '<td>' + permBadges(r.permissions) + '</td>';
    html += '<td><button class="btn btn-o btn-s" onclick="editR(' + i + ')">' + I18n.t('btn_edit') + '</button> ';
    html += '<button class="btn btn-d btn-s" onclick="delR(' + i + ')">' + I18n.t('btn_delete') + '</button></td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}

function openRule(i) {
  document.getElementById('rIdx').value = i !== undefined ? i : -1;
  document.getElementById('rMovTitle').textContent = i !== undefined ? I18n.t('modal_edit_rule') : I18n.t('modal_add_rule');
  if (i !== undefined && rules[i]) {
    var r = rules[i];
    document.getElementById('mrType').value = r.regex ? 'regex' : 'path';
    v('mrPath', r.path || '');
    v('mrRegex', r.regex || '');
    setPerm('mrP', r.permissions);
  } else {
    v('mrPath', '');
    v('mrRegex', '');
    setPerm('mrP', '');
    document.getElementById('mrType').value = 'path';
  }
  document.getElementById('mrPG').style.display = '';
  document.getElementById('mrRG').style.display = 'none';
  document.getElementById('ruleMov').classList.add('show');
}

function saveRule() {
  var idx = +document.getElementById('rIdx').value;
  var tp = document.getElementById('mrType').value;
  var rule = {};
  if (tp === 'path') {
    var p = v('mrPath').trim();
    if (!p) { toast(I18n.t('toast_rule_path_empty'), 'err'); return; }
    rule.path = p;
  } else {
    var r = v('mrRegex').trim();
    if (!r) { toast(I18n.t('toast_rule_regex_empty'), 'err'); return; }
    try { new RegExp(r); } catch (e) { toast(I18n.t('toast_rule_regex_invalid'), 'err'); return; }
    rule.regex = r;
  }
  var pm = getPerm('mrP');
  rule.permissions = pm || 'none';
  if (idx >= 0) rules[idx] = rule; else rules.push(rule);
  cfg.rules = rules;
  renderRules();
  closeM('ruleMov');
  toast(idx >= 0 ? I18n.t('toast_rule_updated') : I18n.t('toast_rule_added'), 'ok');
}

function editR(i) { openRule(i); }

function delR(i) {
  if (!confirm(I18n.t('confirm_delete_rule'))) return;
  rules.splice(i, 1);
  cfg.rules = rules;
  renderRules();
  toast(I18n.t('toast_rule_deleted'), 'inf');
}

// ─── RAW ───
async function loadRaw() {
  try {
    var r = await fetch('/api/raw');
    document.getElementById('rawEd').value = await r.text();
    st(I18n.t('toast_yaml_loaded'));
  } catch (e) {
    toast(I18n.t('toast_load_failed'), 'err');
  }
}

async function saveRaw() {
  var c = document.getElementById('rawEd').value;
  try {
    var r = await fetch('/api/raw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: c })
    });
    var d = await r.json();
    if (d.success) { toast(I18n.t('toast_yaml_saved'), 'ok'); loadCfg(); }
    else toast(I18n.t('toast_yaml_error') + ': ' + d.error, 'err');
  } catch (e) {
    toast(I18n.t('toast_error'), 'err');
  }
}

// ─── LOG OUTPUTS ───
function fillOuts(outs) {
  var el = document.getElementById('logOuts');
  el.innerHTML = '';
  var arr = outs || ['stderr'];
  for (var i = 0; i < arr.length; i++) {
    var d = document.createElement('div');
    d.className = 'oi';
    d.innerHTML = '<span class="dot"></span> ' + e(arr[i]) + ' <button class="btn btn-d btn-s" style="margin-left:auto" onclick="this.parentElement.remove()">X</button>';
    el.appendChild(d);
  }
}

function getOuts() {
  var o = [];
  var items = document.querySelectorAll('#logOuts .oi');
  for (var i = 0; i < items.length; i++) {
    var t = items[i].textContent.replace('X', '').trim();
    if (t) o.push(t);
  }
  return o;
}

// ─── SERVICE STATUS ───
async function updateServiceStatus() {
  var dot = document.getElementById('statusDot');
  var label = document.getElementById('statusLabel');
  var uptime = document.getElementById('statusUptime');

  try {
    var res = await fetch('/api/service/status');
    var data = await res.json();

    if (data.state === 'active') {
      dot.className = 'status-dot active';
      label.textContent = I18n.t('status_running');
      uptime.textContent = data.uptime;
    } else {
      dot.className = 'status-dot inactive';
      label.textContent = I18n.t('status_stopped');
      uptime.textContent = data.state;
    }
  } catch (e) {
    label.textContent = I18n.t('status_error');
    dot.className = 'status-dot inactive';
  }
}

// ─── RESTART ───
async function doRestart() {
  if (!confirm(I18n.t('toast_restart_confirm'))) return;
  toast(I18n.t('toast_restarting'), 'inf');
  try {
    var r = await fetch('/api/restart', { method: 'POST' });
    var d = await r.json();
    if (d.success) toast(d.message, 'ok');
    else toast(d.error, 'err');
  } catch (e) {
    toast(I18n.t('toast_request_failed'), 'err');
  }
}
