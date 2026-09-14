/* =========================================================
   Rodrigo Arce — portafolio
   1. Idioma ES / EN sin recargar la página
   2. Modo claro / oscuro
   ========================================================= */

(function () {
  'use strict';

  /* ---------- utilidades de almacenamiento (a prueba de fallos) ---------- */
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* sin permisos: seguimos igual */ }
  }

  /* =======================================================
     IDIOMA
     Cada elemento traducible lleva data-es y data-en.
     Para las imágenes: data-alt-es y data-alt-en.
     ======================================================= */

  var LANGS = ['es', 'en'];
  var langActual = 'es';

  /* Etiquetas del botón de tema en cada idioma */
  var TEMA_TXT = {
    es: { aClaro: 'Claro', aOscuro: 'Oscuro',
          ariaClaro: 'Cambiar a modo claro', ariaOscuro: 'Cambiar a modo oscuro' },
    en: { aClaro: 'Light', aOscuro: 'Dark',
          ariaClaro: 'Switch to light mode', ariaOscuro: 'Switch to dark mode' }
  };

  function detectLang() {
    var saved = read('lang');
    if (LANGS.indexOf(saved) !== -1) return saved;
    var nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
    return nav === 'en' ? 'en' : 'es';
  }

  function applyLang(lang) {
    if (LANGS.indexOf(lang) === -1) lang = 'es';

    document.documentElement.setAttribute('lang', lang);
    langActual = lang;

    var nodes = document.querySelectorAll('[data-es]');
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].getAttribute('data-' + lang);
      if (t !== null) nodes[i].textContent = t;
    }

    var imgs = document.querySelectorAll('[data-alt-es]');
    for (var j = 0; j < imgs.length; j++) {
      var a = imgs[j].getAttribute('data-alt-' + lang);
      if (a !== null) imgs[j].setAttribute('alt', a);
    }

    var metas = document.querySelectorAll('meta[data-es]');
    for (var k = 0; k < metas.length; k++) {
      var c = metas[k].getAttribute('data-' + lang);
      if (c !== null) metas[k].setAttribute('content', c);
    }

    var titleEl = document.querySelector('title[data-es]');
    if (titleEl) {
      var tt = titleEl.getAttribute('data-' + lang);
      if (tt !== null) document.title = tt;
    }

    var buttons = document.querySelectorAll('[data-lang-btn]');
    for (var m = 0; m < buttons.length; m++) {
      var code = buttons[m].getAttribute('data-lang-btn');
      buttons[m].setAttribute('aria-pressed', String(code === lang));
    }

    pintarBotonTema();
    write('lang', lang);
  }

  /* =======================================================
     TEMA
     ======================================================= */

  function pintarBotonTema() {
    var btn = document.querySelector('[data-theme-btn]');
    if (!btn) return;
    var t = TEMA_TXT[langActual] || TEMA_TXT.es;
    var dark = currentlyDark();
    btn.setAttribute('aria-label', dark ? t.ariaClaro : t.ariaOscuro);
    btn.textContent = dark ? t.aClaro : t.aOscuro;
  }

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      theme = 'auto';
    }
    pintarBotonTema();
    write('theme', theme);
  }

  function currentlyDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /* =======================================================
     ARRANQUE
     ======================================================= */

  function init() {
    applyLang(detectLang());
    applyTheme(read('theme') || 'auto');

    var langButtons = document.querySelectorAll('[data-lang-btn]');
    for (var i = 0; i < langButtons.length; i++) {
      langButtons[i].addEventListener('click', function () {
        applyLang(this.getAttribute('data-lang-btn'));
      });
    }

    var themeBtn = document.querySelector('[data-theme-btn]');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        applyTheme(currentlyDark() ? 'light' : 'dark');
      });
    }

    // Si el usuario nunca eligió tema, seguimos al sistema en vivo.
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      if ((read('theme') || 'auto') === 'auto') applyTheme('auto');
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
