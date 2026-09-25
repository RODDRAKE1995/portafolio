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

    var arias = document.querySelectorAll('[data-aria-es]:not([data-theme-btn])');
    for (var q = 0; q < arias.length; q++) {
      var al = arias[q].getAttribute('data-aria-' + lang);
      if (al !== null) arias[q].setAttribute('aria-label', al);
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
    btn.setAttribute('title', dark ? t.aClaro : t.aOscuro);
    // el boton es un icono: sol cuando la pagina esta oscura, luna cuando esta clara
    btn.classList.toggle('is-dark', dark);
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


  /* =======================================================
     CARRUSEL DE PROYECTOS
     Las tarjetas se colocan sobre una curva y avanzan solas.
     Arrastrar, flechas y teclado lo controlan; el cursor lo pausa.
     ======================================================= */

  function initCarousel() {
    var stage = document.querySelector('[data-carousel]');
    if (!stage) return;
    var track = stage.querySelector('.work-track');
    var originals = [].slice.call(track.children);
    var n = originals.length;
    if (!n) return;

    // Copias para que la curva nunca se quede vacía en pantallas anchas.
    // Las copias no se leen ni se enfocan: solo son decorado.
    for (var k = 0; k < 2; k++) {
      originals.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        var a = c.querySelector('a');
        if (a) a.setAttribute('tabindex', '-1');
        track.appendChild(c);
      });
    }
    var cards = [].slice.call(track.children);
    var total = cards.length;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SPEED = reduce ? 0 : 26;          // px por segundo
    var cardW = 0, step = 0, L = 0, vw = 0;
    var pos = 0, vel = 0, target = null;
    var hover = false, dragging = false, captured = false;
    var startX = 0, lastX = 0, lastT = 0, moved = 0, pid = null;
    var running = true, raf = null, last = performance.now();
    var hoverEl = null, lifts = [];

    function measure() {
      cardW = cards[0].offsetWidth;
      step = cardW * 1.2;
      L = total * step;
      vw = stage.clientWidth;
      // en pantallas angostas el tambor se cierra para que se vean las vecinas
      var small = vw < 640;
      ANG = (small ? 32 : 26) * Math.PI / 180;
      RADIUS = small ? 2.0 : 3.0;
    }

    function wrap(x) { return ((x + L / 2) % L + L) % L - L / 2; }

    // Geometria de tambor: las tarjetas van sobre un cilindro visto desde
    // afuera. Al alejarse del centro giran, se hunden y se achican, hasta
    // desaparecer de perfil por los costados.
    var ANG = 26 * Math.PI / 180;     // separacion angular entre tarjetas
    var RADIUS = 3.0;                  // radio del tambor, en anchos de tarjeta

    function layout() {
      var R = cardW * RADIUS;
      for (var i = 0; i < total; i++) {
        var st = cards[i].style;
        var d = wrap(i * step - pos) / step;      // distancia al centro, en tarjetas
        var phi = d * ANG;
        var aphi = Math.abs(phi);
        if (aphi > 1.5) { st.visibility = 'hidden'; st.opacity = '0'; continue; }
        var lf = lifts[i] || 0;                   // 0 = normal, 1 = con el cursor encima
        var tx = R * Math.sin(phi);
        var tz = R * (Math.cos(phi) - 1) + 70 * lf;
        var rot = phi * 180 / Math.PI * (1 - 0.35 * lf);
        var sc = (1 - 0.055 * Math.abs(d)) * (1 + 0.07 * lf);   // se achican al irse a los lados
        st.visibility = 'visible';
        st.opacity = String(Math.max(0, Math.min(1, (1.5 - aphi) / 0.32)));
        st.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,' + tz.toFixed(1) + 'px) rotateY(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
        st.zIndex = String(lf > 0.02 ? 400 : 200 - Math.round(Math.abs(d) * 10));
      }
    }

    function tick(t) {
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      for (var h = 0; h < total; h++) {
        var goal = (cards[h] === hoverEl && !dragging) ? 1 : 0;
        lifts[h] = (lifts[h] || 0) + (goal - (lifts[h] || 0)) * Math.min(1, dt * 9);
      }
      if (target !== null) {
        var diff = target - pos;
        pos += diff * Math.min(1, dt * 7);
        if (Math.abs(diff) < 0.4) { pos = target; target = null; }
      } else if (!dragging) {
        if (Math.abs(vel) > 4) { pos += vel * dt; vel *= Math.pow(0.03, dt); }
        else { vel = 0; if (!hover) pos += SPEED * dt; }
      }
      layout();
      raf = running ? requestAnimationFrame(tick) : null;
    }
    function start() { if (!raf) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } }
    function stop() { running = false; }

    function goTo(p) { target = p; vel = 0; start(); }
    function nudge(dir) { goTo(Math.round(pos / step) * step + dir * step); }
    function center(i) {
      var base = i * step;
      goTo(base + L * Math.round((pos - base) / L));
    }

    // --- arrastre con mouse o dedo ---
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; captured = false; moved = 0; pid = e.pointerId;
      startX = lastX = e.clientX; lastT = performance.now(); target = null; vel = 0;
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var dx = e.clientX - lastX;
      if (!captured && Math.abs(e.clientX - startX) > 6) {
        captured = true;
        try { stage.setPointerCapture(pid); } catch (err) {}
        stage.classList.add('is-drag');
      }
      if (!captured) return;
      var now = performance.now();
      pos -= dx; moved += Math.abs(dx);
      vel = -dx / Math.max(0.008, (now - lastT) / 1000);
      lastX = e.clientX; lastT = now;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('is-drag');
      if (performance.now() - lastT > 90) vel = 0;
      vel = Math.max(-2200, Math.min(2200, vel));
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    // si fue arrastre, no abrir el proyecto al soltar
    stage.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);

    // --- pausa con el cursor encima ---
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    stage.addEventListener('pointerleave', function () { hover = false; setHover(null); });

    // --- realce de la tarjeta bajo el cursor ---
    function setHover(card) {
      if (card === hoverEl) return;
      if (hoverEl) hoverEl.classList.remove('is-hover');
      hoverEl = card;
      if (hoverEl) hoverEl.classList.add('is-hover');
      stage.classList.toggle('has-hover', !!hoverEl);
    }
    stage.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse' || dragging) return;
      var c = e.target.closest ? e.target.closest('.work-card') : null;
      setHover(c);
    });
    stage.addEventListener('pointerout', function (e) {
      var to = e.relatedTarget;
      if (!to || !stage.contains(to) || !to.closest('.work-card')) setHover(null);
    });

    // --- teclado: al enfocar una tarjeta, se centra ---
    originals.forEach(function (li, i) {
      var a = li.querySelector('a');
      if (a) a.addEventListener('focus', function () { hover = true; center(i); setHover(li); });
      if (a) a.addEventListener('blur', function () { hover = false; setHover(null); });
    });

    // --- flechas ---
    var btns = document.querySelectorAll('.work-btn[data-dir]');
    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener('click', function () { nudge(parseInt(this.getAttribute('data-dir'), 10)); });
    }

    // --- ahorrar batería: solo animar cuando se ve ---
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(stage);
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    window.addEventListener('resize', function () { measure(); layout(); });
    measure(); layout(); start();
  }


  /* =======================================================
     ENTRADAS AL DESPLAZAR
     El hero entra al cargar; el resto, cuando llega a pantalla.
     ======================================================= */

  function initReveal() {
    var root = document.documentElement;
    if (!root.classList.contains('anim')) return;
    var els = [].slice.call(document.querySelectorAll('.rvl'));
    if (!els.length) return;

    function mostrar(el) { el.classList.remove('from-top'); el.classList.add('in'); }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) {
      els.forEach(mostrar); return;
    }

    // Entran al aparecer y se repliegan al salir, así que la animación
    // ocurre igual bajando que subiendo. El lado por el que vuelven a
    // entrar depende de por dónde se fueron.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting && e.intersectionRatio >= 0.1) {
          if (!el.classList.contains('in')) mostrar(el);
        } else if (!e.isIntersecting && el.classList.contains('in')) {
          el.classList.remove('in');
          el.classList.toggle('from-top', el.getBoundingClientRect().top < 0);
        }
      });
    }, { threshold: [0, 0.1, 0.3], rootMargin: '-4% 0px -8% 0px' });

    els.forEach(function (el) { io.observe(el); });
  }


  /* =======================================================
     FORMULARIO DE CONTACTO
     Si hay un servicio configurado en action="", el mensaje se envía
     sin salir de la página. Si no, se abre el programa de correo con
     el mensaje ya escrito.
     ======================================================= */

  var FORM_TXT = {
    es: {
      falta: 'Faltan datos: revisa los campos marcados.',
      correo: 'Ese correo no parece válido.',
      enviando: 'Enviando…',
      ok: '¡Gracias! Te respondo pronto.',
      error: 'No se pudo enviar. Escríbeme a RodArCen@outlook.com.',
      correoAbierto: 'Abrí tu programa de correo con el mensaje listo para enviar.',
      faltaWa: 'Escribe tu nombre y tu mensaje para abrir WhatsApp.',
      waAbierto: 'Abrí WhatsApp con el mensaje listo. Solo dale enviar.'
    },
    en: {
      falta: 'Some fields are missing — check the ones marked.',
      correo: 'That email address does not look valid.',
      enviando: 'Sending…',
      ok: 'Thank you! I’ll get back to you soon.',
      error: 'It could not be sent. Write to me at RodArCen@outlook.com.',
      correoAbierto: 'I opened your email app with the message ready to send.',
      faltaWa: 'Add your name and your message to open WhatsApp.',
      waAbierto: 'I opened WhatsApp with the message ready. Just hit send.'
    }
  };

  function initForm() {
    var form = document.querySelector('.contact .form');
    if (!form) return;
    var msg = form.querySelector('.form-msg');
    var CORREO = 'RodArCen@outlook.com';
    var WHATSAPP = '529994472850';   // solo digitos, con clave de pais

    function txt() { return FORM_TXT[langActual] || FORM_TXT.es; }
    function aviso(t, malo) {
      msg.textContent = t;
      msg.classList.toggle('is-bad', !!malo);
    }
    function campo(nombre) { return form.querySelector('[name="' + nombre + '"]'); }
    function marcar(el, malo) {
      if (el && el.parentNode) el.parentNode.classList.toggle('is-bad', !!malo);
    }

    // al escribir se quita la marca de error
    ['name', 'email', 'message'].forEach(function (n) {
      var el = campo(n);
      if (el) el.addEventListener('input', function () { marcar(el, false); });
    });

    // --- WhatsApp: abre la conversación con el mensaje ya escrito ---
    var botonWa = form.querySelector('[data-wa]');
    if (botonWa) {
      botonWa.addEventListener('click', function () {
        var t = txt();
        var nombre = campo('name'), correo = campo('email'), mensaje = campo('message');
        // para WhatsApp basta con el nombre y el mensaje; el correo es opcional
        var falta = false;
        [nombre, mensaje].forEach(function (el) {
          var mal = !el.value.trim();
          marcar(el, mal);
          if (mal) falta = true;
        });
        if (falta) { aviso(t.faltaWa, true); return; }

        var lineas = (langActual === 'en')
          ? ['Hi Rodrigo, I saw your portfolio.', 'I am ' + nombre.value.trim() + '.', '', mensaje.value.trim()]
          : ['Hola Rodrigo, vi tu portafolio.', 'Soy ' + nombre.value.trim() + '.', '', mensaje.value.trim()];
        if (correo.value.trim()) {
          lineas.push('', (langActual === 'en' ? 'My email: ' : 'Mi correo: ') + correo.value.trim());
        }
        var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lineas.join('\n'));
        window.open(url, '_blank', 'noopener');
        aviso(t.waAbierto, false);
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = txt();
      var nombre = campo('name'), correo = campo('email'), mensaje = campo('message');
      var vacio = false;
      [nombre, correo, mensaje].forEach(function (el) {
        var mal = !el.value.trim();
        marcar(el, mal);
        if (mal) vacio = true;
      });
      if (vacio) { aviso(t.falta, true); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.value.trim())) {
        marcar(correo, true); aviso(t.correo, true); return;
      }

      var destino = form.getAttribute('action');
      if (!destino) {           // todavía sin servicio: abrimos el correo
        var asunto = encodeURIComponent('Portafolio — ' + nombre.value.trim());
        var cuerpo = encodeURIComponent(
          mensaje.value.trim() + '\n\n' + nombre.value.trim() + '\n' + correo.value.trim());
        window.location.href = 'mailto:' + CORREO + '?subject=' + asunto + '&body=' + cuerpo;
        aviso(t.correoAbierto, false);
        return;
      }

      aviso(t.enviando, false);
      fetch(destino, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      }).then(function (r) {
        if (!r.ok) throw new Error('http');
        form.reset();
        aviso(t.ok, false);
      }).catch(function () { aviso(t.error, true); });
    });
  }

  /* Video de la portada de cada proyecto.
     Solo se descarga y se reproduce en pantallas grandes: en celular, con
     ahorro de datos activado o si el visitante pidió menos movimiento en su
     sistema, se queda la imagen fija y el video ni siquiera se baja. */
  function initPortadaVideo() {
    var v = document.querySelector('.proj-media video');
    if (!v) return;
    var src = v.getAttribute('data-src');
    if (!src) return;

    var con = navigator.connection || {};
    var chica  = window.matchMedia('(max-width:700px)').matches;
    var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (con.saveData === true || chica || quieto) return;

    var s = document.createElement('source');
    s.src = src;
    s.type = 'video/mp4';
    v.appendChild(s);
    v.load();
    var t = v.play();
    if (t && t.catch) t.catch(function () {});
  }

  /* Animaciones sin sonido del catálogo: se descargan y arrancan cuando
     entran a la pantalla, y se pausan al salir para no gastar batería.
     Con ahorro de datos o menos movimiento se quedan en su imagen fija. */
  function initLoops() {
    var vids = document.querySelectorAll('.plate--loop video');
    if (!vids.length) return;

    var con = navigator.connection || {};
    var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (con.saveData === true || quieto) return;
    if (!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entradas) {
      for (var i = 0; i < entradas.length; i++) {
        var v = entradas[i].target;
        if (entradas[i].isIntersecting) {
          if (!v.querySelector('source')) {
            var f = document.createElement('source');
            f.src = v.getAttribute('data-src');
            f.type = 'video/mp4';
            v.appendChild(f);
            v.load();
          }
          var t = v.play();
          if (t && t.catch) t.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      }
    }, { rootMargin: '250px 0px' });

    for (var j = 0; j < vids.length; j++) io.observe(vids[j]);
  }

  function init() {
    applyLang(detectLang());
    applyTheme(read('theme') || 'auto');
    initCarousel();
    initReveal();
    initForm();
    initPortadaVideo();
    initLoops();

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
