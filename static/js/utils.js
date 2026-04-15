// Utility functions
function v(id, x) {
  var el = document.getElementById(id);
  if (x !== undefined) { el.value = x == null ? '' : x; return; }
  return el.value;
}

function ckd(id, x) {
  var el = document.getElementById(id);
  if (x !== undefined) { el.checked = !!x; return; }
  return el.checked;
}

function e(s) {
  return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function a2t(id, a) {
  document.getElementById(id).value = (a || []).join('\n');
}

function t2a(id) {
  var raw = document.getElementById(id).value.split('\n');
  var result = [];
  for (var i = 0; i < raw.length; i++) {
    var s = raw[i].trim();
    if (s) result.push(s);
  }
  return result;
}

function permBadges(p) {
  if (!p) return '';
  p = p.toUpperCase();
  if (p === 'NONE') return '<span class="pb"><span class="n">X</span></span>';
  var html = '<span class="pb">';
  var permArr = ['C', 'R', 'U', 'D'];
  for (var i = 0; i < permArr.length; i++) {
    var x = permArr[i];
    html += '<span class="' + (p.indexOf(x) >= 0 ? x.toLowerCase() : 'n') + '">' + x + '</span>';
  }
  html += '</span>';
  return html;
}

function closeM(id) {
  document.getElementById(id).classList.remove('show');
}

function toast(m, t) {
  var el = document.getElementById('toast');
  el.textContent = m;
  el.className = 'toast ' + t + ' show';
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}

function st(t) {
  document.getElementById('stxt').textContent = t;
}

function tick() {
  document.getElementById('stime').textContent = new Date().toLocaleString();
}

function genPw(id) {
  var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var a = new Uint32Array(24);
  crypto.getRandomValues(a);
  var p = '';
  for (var i = 0; i < 24; i++) p += c.charAt(a[i] % c.length);
  document.getElementById(id).value = p;
  toast(I18n.t('toast_pw_generated'), 'ok');
}

function genSecretKey() {
  var a = new Uint8Array(32);
  crypto.getRandomValues(a);
  var hex = '';
  for (var i = 0; i < a.length; i++) hex += a[i].toString(16).padStart(2, '0');
  document.getElementById('setSecretKey').value = hex;
  toast(I18n.t('toast_pw_generated'), 'ok');
}

function togPw(id) {
  var el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function getPerm(id) {
  var r = '';
  var pcs = document.querySelectorAll('#' + id + ' .pc');
  for (var i = 0; i < pcs.length; i++) {
    if (pcs[i].querySelector('input').checked) r += pcs[i].dataset.p;
  }
  return r || undefined;
}

function setPerm(id, p) {
  if (!p) return;
  p = p.toUpperCase();
  var pcs = document.querySelectorAll('#' + id + ' .pc');
  for (var i = 0; i < pcs.length; i++) {
    var on = p.indexOf(pcs[i].dataset.p) >= 0;
    pcs[i].querySelector('input').checked = on;
    pcs[i].classList.toggle('on', on);
  }
}

function validateCfg(config) {
  var errors = [];
  if (config.port) {
    var port = config.port;
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      errors.push('Port must be a number between 1 and 65535');
  }
  if (config.tls && (!config.cert || !config.key))
    errors.push('TLS enabled but cert/key not specified');
  if (config.permissions && !/^[CRUDcrud]+$/.test(config.permissions))
    errors.push('Permissions must only contain C, R, U, D characters');
  var permRe = /^[CRUDcrud]+$/;
  (config.users || []).forEach(function(u, i) {
    if (!u.username) errors.push('User ' + (i + 1) + ': username is required');
    if (!u.password) errors.push('User ' + (i + 1) + ': password is required');
    if (u.permissions && !permRe.test(u.permissions))
      errors.push('User ' + (i + 1) + ' (' + (u.username || '?') + '): invalid permissions');
  });
  return { valid: errors.length === 0, errors: errors };
}
