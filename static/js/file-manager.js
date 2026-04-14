// File Manager module
var FM = (function() {
  var fmCur = '/';

  function go() {
    var inp = document.getElementById('fmP');
    var d = inp.value.trim() || '/';
    if (d.charAt(0) !== '/') d = '/' + d;
    fmCur = d;
    inp.value = d;
    var el = document.getElementById('fmC');
    el.innerHTML = '<div class="empty"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px;display:block;opacity:.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>' + I18n.t('loading') + '</p></div>';

    fetch('/api/files?path=' + encodeURIComponent(d)).then(function(r) {
      return r.json();
    }).then(function(data) {
      if (data.error) {
        el.innerHTML = '<div class="empty"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" style="margin:0 auto 10px;display:block"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><p>' + e(data.error) + '</p></div>';
        return;
      }

      var bc = document.getElementById('fmBc');
      var ps = d.split('/').filter(Boolean);
      var bh = '<a onclick="FM.nav(\'/\')">' + I18n.t('breadcrumb_root') + '</a>';
      var cp = '';
      for (var bi = 0; bi < ps.length; bi++) {
        cp += '/' + ps[bi];
        bh += ' / <a onclick="FM.nav(\'' + cp + '\')">' + e(ps[bi]) + '</a>';
      }
      bc.innerHTML = bh;

      var items = data.items || [];
      if (!items.length) {
        el.innerHTML = '<div class="empty"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 10px;display:block;opacity:.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg><p>' + I18n.t('empty_dir') + '</p></div>';
        return;
      }

      items.sort(function(a, b) {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      var h = '<table class="tbl"><thead><tr><th style="width:32px"></th><th>' + I18n.t('col_name') + '</th><th style="width:90px">' + I18n.t('col_size') + '</th><th style="width:150px">' + I18n.t('col_modified') + '</th><th style="width:110px">' + I18n.t('col_actions') + '</th></tr></thead><tbody>';

      if (d !== '/') {
        var par = d.split('/').slice(0, -1).join('/') || '/';
        h += '<tr><td>' + FM.icoFolder() + '</td><td><a onclick="FM.nav(\'' + par + '\')" style="cursor:pointer;color:var(--accent2)">..</a></td><td>-</td><td>-</td><td></td></tr>';
      }

      for (var idx = 0; idx < items.length; idx++) {
        var it = items[idx];
        var ic = it.is_dir ? FM.icoFolder() : FM.ico(it.name);
        var fp = d === '/' ? '/' + it.name : d + '/' + it.name;
        var sz = it.is_dir ? '-' : FM.sz(it.size);
        var tm = it.mod_time ? new Date(it.mod_time * 1000).toLocaleString() : '-';
        var escapedName = e(it.name);

        var nl;
        if (it.is_dir) {
          nl = '<a onclick="FM.nav(\'' + fp + '\')" style="cursor:pointer;color:var(--accent2)">' + escapedName + '</a>';
        } else {
          nl = '<span class="fm-name" data-fp="' + e(fp) + '" data-fn="' + escapedName + '" data-fs="' + (it.size || 0) + '">' + escapedName + '</span>';
        }

        h += '<tr><td>' + ic + '</td><td>' + nl + '</td>';
        h += '<td style="color:var(--text2);font-size:11px">' + sz + '</td>';
        h += '<td style="color:var(--text2);font-size:11px">' + tm + '</td><td>';

        if (!it.is_dir) {
          h += '<button class="btn btn-o btn-s fm-pv-btn" data-fp="' + e(fp) + '" data-fn="' + escapedName + '" data-fs="' + (it.size || 0) + '" title="' + I18n.t('btn_preview') + '"><svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button> ';
          h += '<a href="javascript:void(0)" class="btn btn-o btn-s fm-dl-btn" data-fp="' + e(fp) + '" title="' + I18n.t('btn_download') + '"><svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>';
        }

        h += '</td></tr>';
      }

      h += '</tbody></table>';
      el.innerHTML = h;

    }).catch(function(err) {
      el.innerHTML = '<div class="empty"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.5" style="margin:0 auto 10px;display:block"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><p>' + e(err.message) + '</p></div>';
    });
  }

  function nav(p) {
    document.getElementById('fmP').value = p;
    go();
  }

  function ico(n) {
    var svg = {
      folder: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
      image: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      video: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
      audio: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      code: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      file: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      archive: '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>'
    };
    var ext = n.split('.').pop().toLowerCase();
    var m = {
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', ico: 'image', avif: 'image',
      mp4: 'video', mkv: 'video', avi: 'video', mov: 'video', webm: 'video',
      mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', aac: 'audio',
      pdf: 'file', doc: 'file', docx: 'file', xls: 'file', xlsx: 'file', ppt: 'file', pptx: 'file',
      zip: 'archive', rar: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive',
      js: 'code', ts: 'code', py: 'code', go: 'code', rs: 'code', java: 'code', c: 'code', cpp: 'code', h: 'code',
      html: 'code', css: 'code', json: 'code', yaml: 'code', yml: 'code', toml: 'code', xml: 'code',
      sh: 'code', sql: 'code', rb: 'code', php: 'code', lua: 'code',
      txt: 'file', md: 'file', log: 'file', csv: 'file',
      ini: 'code', cfg: 'code', conf: 'code', env: 'code'
    };
    var cat = m[ext] || 'file';
    return svg[cat] || svg.file;
  }

  function sz(b) {
    if (!b) return '0 B';
    var u = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(b) / Math.log(1024));
    return (b / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i];
  }

  function initEvents() {
    document.getElementById('fmC').addEventListener('click', function(e) {
      var dlBtn = e.target.closest('.fm-dl-btn');
      if (dlBtn) {
        var fp = dlBtn.dataset.fp;
        var dlSvg = '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        dlBtn.innerHTML = '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        fetch('/api/files/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [fp] })
        }).then(function(r) { return r.json(); }).then(function(data) {
          dlBtn.innerHTML = dlSvg;
          if (data[fp]) window.open(data[fp], '_blank');
        }).catch(function() {
          dlBtn.innerHTML = dlSvg;
          toast(I18n.t('toast_sign_failed'), 'err');
        });
        return;
      }
      var btn = e.target.closest('.fm-pv-btn');
      if (btn) {
        Preview.show(btn.dataset.fp, btn.dataset.fn, parseInt(btn.dataset.fs) || 0);
        return;
      }
      var nameEl = e.target.closest('.fm-name');
      if (nameEl) {
        Preview.show(nameEl.dataset.fp, nameEl.dataset.fn, parseInt(nameEl.dataset.fs) || 0);
      }
    });
  }

  return { go: go, nav: nav, ico: ico, icoFolder: function() { return '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>'; }, sz: sz, initEvents: initEvents };
})();
