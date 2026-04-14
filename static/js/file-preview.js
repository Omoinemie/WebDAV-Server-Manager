// File Preview module
var Preview = (function() {
  var pvCurrentPath = '';
  var pvCurrentName = '';

  function getFileCategory(name) {
    var ext = (name || '').split('.').pop().toLowerCase();
    var cats = {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
      video: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', '3gp'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus', 'weba'],
      code: ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb', 'php', 'lua', 'swift', 'kt', 'scala', 'dart', 'r', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'sql', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json', 'jsonc', 'yaml', 'yml', 'toml', 'xml', 'ini', 'cfg', 'conf', 'env', 'diff', 'patch', 'graphql', 'proto', 'svelte', 'vue'],
      text: ['txt', 'md', 'markdown', 'rst', 'log', 'csv', 'tsv', 'nfo', 'readme', 'license', 'changelog'],
      pdf: ['pdf'],
      doc: ['doc', 'docx', 'odt', 'rtf'],
      spreadsheet: ['xls', 'xlsx', 'ods', 'csv'],
      presentation: ['ppt', 'pptx', 'odp'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'iso', 'dmg']
    };
    var keys = Object.keys(cats);
    for (var i = 0; i < keys.length; i++) {
      var exts = cats[keys[i]];
      for (var j = 0; j < exts.length; j++) {
        if (exts[j] === ext) return keys[i];
      }
    }
    var lower = (name || '').toLowerCase();
    if (lower === 'dockerfile' || lower === 'makefile' || lower === 'gemfile') return 'code';
    return 'unknown';
  }

  function getFileTypeInfo(name) {
    var icons = {
      image: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      video: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
      audio: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      code: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      text: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      pdf: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      doc: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      spreadsheet: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
      presentation: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
      archive: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      unknown: '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    };
    var info = {
      image: { icon: icons.image, label: I18n.t('type_image'), textMode: false },
      video: { icon: icons.video, label: I18n.t('type_video'), textMode: false },
      audio: { icon: icons.audio, label: I18n.t('type_audio'), textMode: false },
      code: { icon: icons.code, label: I18n.t('type_code'), textMode: true },
      text: { icon: icons.text, label: I18n.t('type_text'), textMode: true },
      pdf: { icon: icons.pdf, label: I18n.t('type_pdf'), textMode: false },
      doc: { icon: icons.doc, label: I18n.t('type_doc'), textMode: false },
      spreadsheet: { icon: icons.spreadsheet, label: I18n.t('type_spreadsheet'), textMode: false },
      presentation: { icon: icons.presentation, label: I18n.t('type_presentation'), textMode: false },
      archive: { icon: icons.archive, label: I18n.t('type_archive'), textMode: false },
      unknown: { icon: icons.unknown, label: I18n.t('type_file'), textMode: false }
    };
    var cat = getFileCategory(name || '');
    return info[cat] || info.unknown;
  }

  function getMime(name) {
    var ext = (name || '').split('.').pop().toLowerCase();
    var m = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif', ico: 'image/x-icon',
      mp4: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', mov: 'video/quicktime',
      avi: 'video/x-msvideo', mkv: 'video/x-matroska',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
      aac: 'audio/aac', m4a: 'audio/mp4', opus: 'audio/opus', weba: 'audio/webm',
      pdf: 'application/pdf'
    };
    return m[ext] || 'application/octet-stream';
  }

  function renderTextPreview(container, text) {
    var lines = text.split('\n');
    var lineCount = lines.length;
    var MAX_LINES = 5000;
    var displayLines = lines;
    var truncated = false;
    if (lineCount > MAX_LINES) {
      displayLines = lines.slice(0, MAX_LINES);
      truncated = true;
    }
    var lineNums = [];
    for (var i = 0; i < displayLines.length; i++) lineNums.push(i + 1);
    var content = e(displayLines.join('\n'));
    var truncMsg = truncated ? '<div style="padding:10px 16px;background:var(--bg4);color:var(--orange);font-size:12px;text-align:center;border-top:1px solid var(--border)">' + I18n.t('err_file_too_large') + ' ' + MAX_LINES + ' ' + I18n.t('lines_shown') + ' (' + lineCount + ' ' + I18n.t('lines_total') + ')</div>' : '';
    container.innerHTML = '<div class="preview-text-wrap"><div class="preview-code"><div class="preview-ln">' + lineNums.join('\n') + '</div><div class="preview-cc">' + content + '</div></div>' + truncMsg + '</div>';
  }

  function renderInfoBox(body, typeInfo, name, size, path, downloadUrl) {
    var html = '<div class="preview-info-box"><div class="ei">' + typeInfo.icon + '</div>';
    html += '<div class="fname">' + e(name) + '</div>';
    html += '<div class="fmeta">' + I18n.t('col_type') + ': ' + typeInfo.label + '<br>';
    if (size) html += I18n.t('col_size') + ': ' + FM.sz(size) + '<br>';
    html += 'Path: ' + e(path) + '</div>';
    html += '<div style="margin-top:16px"><a href="' + downloadUrl + '" class="btn btn-p" target="_blank" download>' + I18n.t('btn_download') + '</a></div></div>';
    body.innerHTML = html;
  }

  function show(path, name, size) {
    pvCurrentPath = path;
    pvCurrentName = name;
    var ov = document.getElementById('previewOv');
    var body = document.getElementById('pvBody');
    var title = document.getElementById('pvTitle');
    var meta = document.getElementById('pvMeta');
    var icon = document.getElementById('pvIcon');
    var dl = document.getElementById('pvDl');

    var typeInfo = getFileTypeInfo(name || path.split('/').pop());
    title.textContent = name || path.split('/').pop();
    icon.innerHTML = typeInfo.icon;
    meta.textContent = typeInfo.label + (size ? ' - ' + FM.sz(size) : '');
    dl.href = 'javascript:void(0)';
    dl.removeAttribute('download');
    dl.onclick = function(ev) {
      ev.preventDefault();
      fetch('/api/files/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [path] })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data[path]) window.open(data[path], '_blank');
      }).catch(function() { toast(I18n.t('toast_sign_failed'), 'err'); });
    };

    body.innerHTML = '<div class="preview-loading"><div class="spinner"></div><p style="color:var(--text2);font-size:13px">' + I18n.t('loading') + '</p></div>';
    ov.classList.add('show');

    var cat = getFileCategory(name || path.split('/').pop());
    var downloadUrl = '/api/files/download?path=' + encodeURIComponent(path);

    if (cat === 'image') {
      body.innerHTML = '<div class="preview-img-wrap"><img src="' + downloadUrl + '" alt="' + e(name) + '"></div>';
      var img = body.querySelector('img');
      img.onerror = function() {
        this.parentElement.innerHTML = '<div class="preview-error"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="margin:0 auto 8px;display:block;width:40px;height:40px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><p>' + I18n.t('err_image') + '</p></div>';
      };
    } else if (cat === 'video') {
      var mime = getMime(name);
      body.innerHTML = '<div class="preview-media"><video controls preload="metadata"><source src="' + downloadUrl + '" type="' + mime + '">Your browser does not support this video format</video></div>';
    } else if (cat === 'audio') {
      var mime = getMime(name);
      body.innerHTML = '<div class="preview-media" style="text-align:center">' +
        '<svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="1.5" style="width:64px;height:64px;margin-bottom:20px;opacity:.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
        '<div style="font-size:14px;font-weight:600;margin-bottom:16px">' + e(name) + '</div>' +
        '<audio controls preload="metadata" style="width:100%;max-width:500px"><source src="' + downloadUrl + '" type="' + mime + '">Your browser does not support this audio format</audio>' +
        '</div>';
    } else if (cat === 'pdf') {
      body.innerHTML = '<iframe src="' + downloadUrl + '" class="preview-pdf" style="width:100%;height:100%;min-height:500px"></iframe>';
    } else if (typeInfo.textMode) {
      fetch(downloadUrl).then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.text();
      }).then(function(text) {
        renderTextPreview(body, text);
      }).catch(function(err) {
        body.innerHTML = '<div class="preview-error"><svg class="icon icon-xl" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="margin:0 auto 8px;display:block;width:40px;height:40px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><p>' + I18n.t('err_load') + ': ' + e(err.message) + '</p></div>';
      });
    } else if (cat === 'unknown') {
      fetch(downloadUrl).then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.text();
      }).then(function(text) {
        if (text.indexOf('\0') === -1) {
          renderTextPreview(body, text);
        } else {
          renderInfoBox(body, typeInfo, name, size, path, downloadUrl);
        }
      }).catch(function() {
        renderInfoBox(body, typeInfo, name, size, path, downloadUrl);
      });
    } else {
      renderInfoBox(body, typeInfo, name, size, path, downloadUrl);
    }
  }

  function close() {
    var body = document.getElementById('pvBody');
    var mediaEls = body.querySelectorAll('video, audio');
    for (var i = 0; i < mediaEls.length; i++) {
      mediaEls[i].pause();
      mediaEls[i].src = '';
    }
    document.getElementById('previewOv').classList.remove('show');
  }

  function initEvents() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('previewOv').classList.contains('show')) {
        close();
      }
    });
    document.getElementById('previewOv').addEventListener('click', function(e) {
      if (e.target.id === 'previewOv' || e.target.classList.contains('preview-body')) {
        close();
      }
    });
  }

  return { show: show, close: close, initEvents: initEvents };
})();
