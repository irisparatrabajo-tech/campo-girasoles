(function () {
  'use strict';

  /* Si el JS está corriendo, marcamos <html> como js-enabled.
     CSS usa .no-js para "mostrar todo si el script falla". */
  var htmlEl = document.documentElement;
  htmlEl.classList.remove('no-js');
  htmlEl.classList.add('js');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 880;
  var cursorX = window.innerWidth / 2;
  var cursorY = window.innerHeight / 2;
  var mouseOnPage = false;
  var lastMove = 0;

  /* 1. MENÚ HAMBURGER + NAV ACTIVO */
  var hamburger = document.getElementById('hamburger');
  var nav = document.getElementById('nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath === '' || currentPath === '/') currentPath = 'index.html';
  if (nav) {
    nav.querySelectorAll('a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var linkFile = href.split('/').pop().split('#')[0] || '';
      var isActive = (linkFile === currentPath)
        || (currentPath.indexOf('blog') !== -1 && href.indexOf('blog') !== -1);
      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  /* Breadcrumb: aria-current="page" en el span actual */
  document.querySelectorAll('.breadcrumb > span:last-child').forEach(function (s) {
    s.setAttribute('aria-current', 'page');
  });

  if (reducedMotion) {
    /* Sin animación: muestra todo ya */
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  /* 2. HELIOTROPISMO (declarativo via CSS custom props) */
  var helioTargets = [];

  function collectHelioTargets() {
    helioTargets = [];
    var els = document.querySelectorAll('.md-helio, .md-helio-soft');
    els.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      helioTargets.push({
        el: el,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2
      });
      el.classList.add('is-tracking');
    });
  }

  function updateHelioTargets() {
    helioTargets.forEach(function (item) {
      var rect = item.el.getBoundingClientRect();
      item.cx = rect.left + rect.width / 2;
      item.cy = rect.top + rect.height / 2;
    });
  }

  var helioDirty = false;
  function helioTick() {
    if (mouseOnPage) {
      helioTargets.forEach(function (item) {
        var dx = cursorX - item.cx;
        var dy = cursorY - item.cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var maxDist = 700;
        if (d >= maxDist) {
          item.el.style.setProperty('--hd', '0');
          item.el.style.setProperty('--hx', '0');
          item.el.style.setProperty('--hy', '0');
          return;
        }
        var factor = 1 - d / maxDist;
        var nx = (dx / maxDist) * factor;
        var ny = (dy / maxDist) * factor;
        item.el.style.setProperty('--hd', String(factor));
        item.el.style.setProperty('--hx', String(nx));
        item.el.style.setProperty('--hy', String(ny));
      });
    }
    helioDirty = false;
  }

  function scheduleHelio() {
    if (helioDirty) return;
    helioDirty = true;
    requestAnimationFrame(helioTick);
  }

  /* 3. SCROLL REVEAL — ahora SOLO añade clase .is-visible */
  function scrollReveal() {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var baseDelay = parseInt(el.getAttribute('data-reveal-delay'), 10) || 0;
        var staggerDelay = index * 80;
        var totalDelay = baseDelay + staggerDelay;
        setTimeout(function () { el.classList.add('is-visible'); }, totalDelay);
        observer.unobserve(el);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (t) { observer.observe(t); });
  }

  /* 4. TIPOGRAFÍA CINÉTICA HERO */
  function heroKinetic() {
    var lineas = document.querySelectorAll('.hero-linea');
    if (!lineas.length) return;
    if (sessionStorage.getItem('hero-animado')) return;

    /* ElCSS ya define .hero-linea con opacity:0 y transform
       (ver CSS). Aquí solo revelamos en secuencia. */
    lineas.forEach(function (linea, i) {
      setTimeout(function () {
        linea.classList.add('is-visible');
        var forma = linea.querySelector('.forma');
        if (forma) {
          forma.classList.add('pulse');
          setTimeout(function () { forma.classList.remove('pulse'); }, 400);
        }
      }, 250 + i * 220);
    });

    sessionStorage.setItem('hero-animado', '1');
  }

  /* 5. CONTADOR DE CIFRAS */
  function startCounters() {
    var counters = document.querySelectorAll('.counter-animate');
    if (!counters.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var targetVal = parseInt(el.getAttribute('data-target'), 10);
        var duration = 1800;
        var startTime = null;

        function step(ts) {
          if (!startTime) startTime = ts;
          var elapsed = ts - startTime;
          var progress = Math.min(elapsed / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = Math.floor(eased * targetVal);
          el.textContent = current + '%';
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = targetVal + '%';
        }

        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.4 });

    counters.forEach(function (c) { observer.observe(c); });
  }

  /* 6. MICRO-INTERACCIONES HOVER — via class toggle, no inline */
  document.addEventListener('mouseover', function (e) {
    var sello = e.target.closest && e.target.closest('.sello');
    if (sello) {
      var forma = sello.querySelector('.forma');
      if (forma) forma.classList.add('sello-hover');
    }
    var tl = e.target.closest && e.target.closest('.tl-item');
    if (tl) {
      var anio = tl.querySelector('.anio');
      if (anio) anio.classList.add('tl-hover');
    }
  });
  document.addEventListener('mouseout', function (e) {
    var sello = e.target.closest && e.target.closest('.sello');
    if (sello) {
      var forma = sello.querySelector('.forma');
      if (forma) forma.classList.remove('sello-hover');
    }
    var tl = e.target.closest && e.target.closest('.tl-item');
    if (tl) {
      var anio = tl.querySelector('.anio');
      if (anio) anio.classList.remove('tl-hover');
    }
  });

  /* 7b. CURSOR-SOL + EASTER EGG DEL GIRASOL */
  function initCursorSol() {
    if (isMobile || reducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var body = document.body;
    body.classList.add('cursor-sol-activo');

    var cursor = document.createElement('div');
    cursor.id = 'cursor-sol';
    cursor.setAttribute('aria-hidden', 'true');
    body.appendChild(cursor);

    /* Easter egg: girasol efímero al estar quieto sobre hero */
    var easterContainer = null;
    var heroInicio = document.querySelector('.hero-inicio');
    var quietoTimer = null;
    var enHero = false;

    function buildEasterEgg() {
      if (easterContainer) return;
      easterContainer = document.createElement('div');
      easterContainer.id = 'easter-egg-girasol';
      easterContainer.setAttribute('aria-hidden', 'true');
      var centro = document.createElement('div');
      centro.className = 'centro-ee';
      easterContainer.appendChild(centro);
      for (var i = 0; i < 8; i++) {
        var p = document.createElement('div');
        p.className = 'petalo-ee';
        p.style.setProperty('--rot', (i * 45) + 'deg');
        easterContainer.appendChild(p);
      }
      body.appendChild(easterContainer);
    }

    /* Rastreo del cursor con rAF */
    var rafPending = false;
    var tx = -100, ty = -100;
    function onMove(e) {
      tx = e.clientX; ty = e.clientY;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(flushCursor);
      }
      var t = e.target;
      var elem = (t.closest && (t.closest('a, button, input, textarea, label, [role="button"]') || t.closest('.sello, .blog-card, .via')));
      cursor.classList.toggle('is-over-interactive', !!(elem && !elem.matches('.btn, .cta')));
      cursor.classList.toggle('is-over-cta', !!(elem && elem.matches('.btn, .cta, .btn-claro')));
    }

    function flushCursor() {
      cursor.style.transform = 'translate3d(' + (tx - 18) + 'px, ' + (ty - 18) + 'px, 0)';
      cursor.classList.add('is-visible');
      if (easterContainer && easterContainer.classList.contains('is-active')) {
        easterContainer.style.transform = 'translate3d(' + (tx - 1) + 'px, ' + (ty - 1) + 'px, 0)';
      }
      rafPending = false;
    }

    function onClick() {
      cursor.classList.add('is-clicking');
      setTimeout(function () { cursor.classList.remove('is-clicking'); }, 250);
    }

    function onMouseOut() {
      cursor.classList.remove('is-visible');
    }

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('click', onClick);
    document.addEventListener('mouseleave', onMouseOut);
    window.addEventListener('blur', onMouseOut);

    /* Easter egg: 4s quieto sobre el hero de inicio */
    if (heroInicio) {
      heroInicio.addEventListener('mouseenter', function () { enHero = true; scheduleEaster(); });
      heroInicio.addEventListener('mouseleave', function () { enHero = false; clearEaster(); });
      heroInicio.addEventListener('mousemove', function () { clearEaster(); scheduleEaster(); }, { passive: true });
    }

    function scheduleEaster() {
      clearEaster();
      if (!enHero) return;
      quietoTimer = setTimeout(function () {
        buildEasterEgg();
        easterContainer.style.transform = 'translate3d(' + (tx - 1) + 'px, ' + (ty - 1) + 'px, 0)';
        requestAnimationFrame(function () {
          easterContainer.classList.add('is-active');
        });
      }, 4000);
    }
    function clearEaster() {
      if (quietoTimer) { clearTimeout(quietoTimer); quietoTimer = null; }
      if (easterContainer) {
        easterContainer.classList.remove('is-active');
        setTimeout(function () {
          if (easterContainer && !easterContainer.classList.contains('is-active')) {
            easterContainer.remove();
            easterContainer = null;
          }
        }, 700);
      }
    }
  }

  function ampliarHeliotargets() {
    var extra = document.querySelectorAll('.sello, .principio .dot, .via .forma');
    extra.forEach(function (el) {
      if (el.classList.contains('md-helio')) return;
      el.classList.add('md-helio-soft');
    });
  }

  /* 7. VALIDACIÓN DEL FORMULARIO DE CONTACTO */
  function initContactForm() {
    var form = document.querySelector('form[name="contacto"]');
    if (!form) return;

    var fields = [
      { input: form.querySelector('#nombre'),    errorEl: form.querySelector('#error-nombre'),  validate: function (v) { return v.trim().length >= 2; } },
      { input: form.querySelector('#email'),     errorEl: form.querySelector('#error-email'),  validate: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); } },
      { input: form.querySelector('#mensaje'),  errorEl: form.querySelector('#error-mensaje'), validate: function (v) { return v.trim().length >= 10; } }
    ];
    var tipoApoyoError = form.querySelector('#error-tipo');
    var tipoApoyoInputs = form.querySelectorAll('input[name="tipo-apoyo"]');
    var errorGeneral = form.querySelector('#error-general');

    function showError(field, msg) {
      if (!field.input || !field.errorEl) return;
      if (msg) field.errorEl.textContent = msg;
      field.errorEl.hidden = false;
      field.input.setAttribute('aria-invalid', 'true');
      field.input.classList.add('invalid');
    }
    function clearError(field) {
      if (!field.input || !field.errorEl) return;
      field.errorEl.hidden = true;
      field.input.removeAttribute('aria-invalid');
      field.input.classList.remove('invalid');
    }

    /* Limpia el error al corregir */
    fields.forEach(function (field) {
      if (field.input) {
        field.input.addEventListener('input', function () { clearError(field); });
        field.input.addEventListener('blur', function () {
          var val = field.input.value;
          if (val.length > 0 && !field.validate(val)) showError(field);
        });
      }
    });
    tipoApoyoInputs.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (tipoApoyoError) tipoApoyoError.hidden = true;
      });
    });

    form.addEventListener('submit', function (e) {
      var valid = true;
      var firstInvalid = null;
      errorGeneral.hidden = true;

      fields.forEach(function (field) {
        if (!field.input) return;
        var val = field.input.value;
        if (!field.validate(val)) {
          showError(field);
          valid = false;
          if (!firstInvalid) firstInvalid = field.input;
        } else {
          clearError(field);
        }
      });

      /* Validar radio "tipo-apoyo" */
      var tipoSelected = Array.prototype.some.call(tipoApoyoInputs, function (r) { return r.checked; });
      if (!tipoSelected) {
        if (tipoApoyoError) tipoApoyoError.hidden = false;
        valid = false;
        if (!firstInvalid) firstInvalid = tipoApoyoInputs[0];
      } else if (tipoApoyoError) {
        tipoApoyoError.hidden = true;
      }

      /* Honeypot: si bot-field tiene texto, es bot — no mostrar error */
      var botField = form.querySelector('[name="bot-field"]');
      if (botField && botField.value) {
        e.preventDefault();
        return;
      }

      if (!valid) {
        e.preventDefault();
        if (firstInvalid) firstInvalid.focus();
        if (errorGeneral) {
          errorGeneral.textContent = 'Revisa los campos señalados arriba.';
          errorGeneral.hidden = false;
        }
        return;
      }

      /* Honeypot final check (silencioso) */
      var botField = form.querySelector('[name="bot-field"]');
      if (botField && botField.value) {
        e.preventDefault();
        return;
      }

      /* Cargar token CSRF antes de enviar, si el backend PHP existe.
         Si /csrf.php no responde (hosting estático tipo Netlify),
         el form se envía sin token y Netlify Forms se encarga del
         anti-spam con su honeypot nativo (netlify-honeypot="bot-field"). */
      var csrfInput = form.querySelector('#csrf_token');
      var btn = form.querySelector('#btn-enviar');
      if (csrfInput && !csrfInput.value) {
        e.preventDefault();
        if (btn) btn.setAttribute('aria-busy', 'true');
        fetch('/csrf.php', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('no-php')); })
          .then(function (data) {
            csrfInput.value = data.token || '';
            if (!csrfInput.value) throw new Error('no-token');
            if (btn) btn.removeAttribute('aria-busy');
            form.requestSubmit ? form.requestSubmit() : form.submit();
          })
          .catch(function () {
            /* Sin PHP (Netlify): enviar el form tal cual.
               Netlify Forms intercepta el POST por el atributo data-netlify. */
            if (btn) btn.removeAttribute('aria-busy');
            form.requestSubmit ? form.requestSubmit() : form.submit();
          });
        return;
      }

      /* Token ya presente: marcar botón como busy y dejar enviar */
      if (btn) btn.setAttribute('aria-busy', 'true');
    });
  }

  /* EVENTOS GLOBALES */
  document.addEventListener('mousemove', function (e) {
    cursorX = e.clientX;
    cursorY = e.clientY;
    mouseOnPage = true;
    lastMove = Date.now();
    scheduleHelio();
  });

  document.addEventListener('mouseleave', function () {
    mouseOnPage = false;
    helioTargets.forEach(function (item) {
      item.el.classList.remove('is-tracking');
      item.el.style.setProperty('--hd', '0');
      item.el.style.setProperty('--hx', '0');
      item.el.style.setProperty('--hy', '0');
    });
  });

  /* Respiración al cursor quieto: cuando el ratón está quieto
     un tiempo, las formas "respiran" (loop sutil via .breathe). */
  setInterval(function () {
    if (mouseOnPage && Date.now() - lastMove > 2500) {
      helioTargets.forEach(function (item) {
        item.el.classList.add('breathe');
        item.el.classList.remove('is-tracking');
      });
      mouseOnPage = false;
    }
  }, 1000);

  document.addEventListener('mousemove', function () {
    helioTargets.forEach(function (item) { item.el.classList.remove('breathe'); });
  });

  window.addEventListener('resize', function () {
    updateHelioTargets();
    isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 880;
  });

  /* BOOT */
  function boot() {
    scrollReveal();
    startCounters();
    heroKinetic();
    initContactForm();
    initCursorSol();
    ampliarHeliotargets();
    if (!isMobile) {
      collectHelioTargets();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
