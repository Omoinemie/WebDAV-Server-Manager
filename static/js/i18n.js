// i18n module — loads language JSON directly
var I18n = (function() {

  var _currentLang = 'en';
  var _dict = {};
  var _cache = {};

  function load(lang) {
    _currentLang = lang || _currentLang;
    localStorage.setItem('lang', _currentLang);
    console.log('[i18n] load()', _currentLang, 'stack:', new Error().stack.split('\n')[2].trim());

    if (_cache[_currentLang]) {
      _dict = _cache[_currentLang];
      console.log('[i18n] cache hit, keys:', Object.keys(_dict).length);
      return Promise.resolve(_dict);
    }

    var url = '/lang/' + _currentLang + '.json?' + Date.now();
    console.log('[i18n] fetching', url);

    return fetch(url)
      .then(function(r) {
        console.log('[i18n] response', r.status, r.url);
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function(data) {
        var keys = Object.keys(data);
        console.log('[i18n] parsed JSON, keys:', keys.length, 'lang:', _currentLang);
        _cache[_currentLang] = data;
        _dict = data;
        console.log('[i18n] _dict set, keys now:', Object.keys(_dict).length);
        return _dict;
      })
      .catch(function(err) {
        console.error('[i18n] load error:', err);
        if (_currentLang !== 'en') {
          _currentLang = 'en';
          return load('en');
        }
        _dict = {};
        return _dict;
      });
  }

  function t(key) {
    return _dict[key] || key;
  }

  function applyToDOM() {
    var n = document.querySelectorAll('[data-i18n]');
    console.log('[i18n] applyToDOM, _dict keys:', Object.keys(_dict).length, 'data-i18n elements:', n.length);
    n.forEach(function(el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  function switchLang(lang) {
    console.log('[i18n] switchLang()', lang);
    return load(lang).then(function() {
      applyToDOM();
      document.documentElement.lang = lang;
    });
  }

  function getLang() {
    return _currentLang;
  }

  return {
    load: load,
    t: t,
    applyToDOM: applyToDOM,
    switchLang: switchLang,
    getLang: getLang,
    ready: function() { return Object.keys(_dict).length > 0; }
  };
})();
