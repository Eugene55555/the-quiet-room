/* The Quiet Room — інтеракції v5: паралакс, reveal, tilt, пошук, мови */
(function () {
  'use strict';

  /* --- Мова --- */
  if (window.TQR_I18N) TQR_I18N.init();
  function T(key) {
    return window.TQR_I18N ? TQR_I18N.t(window.TQR_I18N.detect(), key) : key;
  }

  /* --- Мобільне меню --- */
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('site-nav-mobile');
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && mobileNav.classList.contains('open')) {
        mobileNav.classList.remove('open');
        burger.classList.remove('open');
      }
    });
  }

  /* --- Пошук --- */
  var searchForm = document.getElementById('search-form');
  function applySearch(q) {
    var cards = document.querySelectorAll('#catalog .card');
    var ql = q.toLowerCase();
    var any = false;
    cards.forEach(function (card) {
      var hay = (card.getAttribute('data-name') || '').toLowerCase() + ' ' + (card.getAttribute('data-desc') || '').toLowerCase();
      var hit = !ql || hay.indexOf(ql) !== -1;
      card.style.display = hit ? '' : 'none';
      if (hit) any = true;
    });
    var empty = document.getElementById('search-empty');
    if (empty) empty.style.display = any ? 'none' : 'block';
  }
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (searchForm.querySelector('input').value || '').trim();
      if (/collection\.html/.test(location.pathname)) applySearch(q);
      else location.href = 'collection.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }
  var qParam = new URLSearchParams(location.search).get('q');
  if (qParam && searchForm) {
    searchForm.querySelector('input').value = qParam;
    applySearch(qParam);
  }

  /* --- Фільтри колекції --- */
  var activeFilter = 'all';
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      document.querySelectorAll('#catalog .card').forEach(function (card) {
        var cat = card.getAttribute('data-cat') || '';
        card.style.display = (activeFilter === 'all' || cat === activeFilter) ? '' : 'none';
      });
    });
  });

  /* --- Форма (заглушка) --- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = document.getElementById('form-status');
      if (s) s.classList.add('show');
    });
  }

  /* --- Reveal on scroll --- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* --- Паралакс hero (тільки на пристроях з мишею) --- */
  var fine = window.matchMedia('(pointer: fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduced) {
    var heroBg = document.querySelector('.hero-bg');
    var heroMoon = document.querySelector('.hero-moon');
    var heroVisual = document.querySelector('.hero-visual');
    if (heroBg || heroMoon) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          var h = window.innerHeight;
          if (y < h * 1.15) {
            if (heroBg) heroBg.style.transform = 'translateY(' + y * 0.28 + 'px)';
            if (heroMoon) heroMoon.style.transform = 'translateY(' + y * 0.42 + 'px)';
          }
          if (heroVisual) heroVisual.style.transform = 'translateY(' + -y * 0.1 + 'px)';
          ticking = false;
        });
      }, { passive: true });
    }
  }

  /* --- Tilt карток (десктоп) --- */
  if (fine && !reduced) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateY(' + (x * 7) + 'deg) rotateX(' + (-y * 7) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });
    });
  }
})();