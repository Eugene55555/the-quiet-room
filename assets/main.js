/* The Quiet Room — header scroll, search, filters, sorting, pagination, product page, newsletter */
(function () {
  'use strict';

  var PRODUCTS = window.TQR_PRODUCTS || [];
  var PER_PAGE = 8;
  var state = { q: '', cat: '', price: '', sort: 'featured', page: 1 };
  var CHECKOUT_URL = 'https://5307397047125.blacksea.in.ua/checkout';

  try {
    var oldCartStorage = window.localStorage;
    if (oldCartStorage && typeof oldCartStorage.removeItem === 'function') {
      oldCartStorage.removeItem('tqr-cart-v1');
      oldCartStorage.removeItem('tqr-cart-return-v1');
    }
  } catch (err) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
  }

  function money(n) {
    return '$' + Number(n).toFixed(2);
  }

  function productImages(p) {
    return (p.images && p.images.length) ? p.images : [p.img];
  }

  /* ---------- Swipe galleries ---------- */
  var SWIPE_MIN = 32;
  var SWIPE_RATIO = 1.2;

  function wrapIndex(index, length) {
    if (!length) return 0;
    return ((index % length) + length) % length;
  }

  function swipeDirection(dx, dy) {
    if (Math.abs(dx) < SWIPE_MIN) return 0;
    if (Math.abs(dx) <= Math.abs(dy) * SWIPE_RATIO) return 0;
    return dx < 0 ? 1 : -1;
  }

  function bindSwipe(el, onSwipe) {
    if (!el) return;
    var start = null;
    var suppressClickUntil = 0;

    el.addEventListener('pointerdown', function (e) {
      if (e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
      suppressClickUntil = 0;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY, horizontal: false };
      if (el.setPointerCapture) {
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }, { passive: true });

    el.addEventListener('pointermove', function (e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
        start.horizontal = true;
      } else if (Math.abs(dy) > Math.abs(dx) * SWIPE_RATIO) {
        start = null;
      }
    }, { passive: true });

    el.addEventListener('pointerup', function (e) {
      if (!start || e.pointerId !== start.id) return;
      var dx = e.clientX - start.x;
      var dy = e.clientY - start.y;
      var horizontal = start.horizontal;
      start = null;
      var dir = horizontal ? swipeDirection(dx, dy) : 0;
      if (!dir) return;
      suppressClickUntil = Date.now() + 400;
      onSwipe(dir);
    });

    el.addEventListener('pointercancel', function () { start = null; });

    el.addEventListener('click', function (e) {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  function setCardIndex(media, index) {
    var slides = media.querySelectorAll('.card-slide');
    var dots = media.querySelectorAll('.card-dot');
    if (!slides.length) return;
    index = wrapIndex(index, slides.length);
    media.setAttribute('data-gallery-index', String(index));
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
  }

  function bindCardGalleries(root) {
    if (!root) return;
    root.querySelectorAll('.card-media').forEach(function (media) {
      var count = parseInt(media.getAttribute('data-gallery-count'), 10) || 1;
      if (count < 2) return;
      bindSwipe(media, function (dir) {
        var current = parseInt(media.getAttribute('data-gallery-index'), 10) || 0;
        setCardIndex(media, current + dir);
      });
    });
  }

  var pendingProductCardScroll = window.location.hash.indexOf('#product-card-') === 0;

  function cardReferrer(id) {
    var url = new URL(window.location.href);
    url.hash = 'product-card-' + encodeURIComponent(id);
    return url.href;
  }

  function buyURL(p, referrer) {
    var url = new URL(CHECKOUT_URL);
    url.searchParams.set('product', p.slug);
    url.searchParams.set('quantity', '1');
    url.searchParams.set('referrer', referrer);
    return url.href;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || (typeof e.button === 'number' && e.button !== 0) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target && e.target.closest ? e.target.closest('a[data-return-url]') : null;
    if (!link) return;
    var returnURL = link.getAttribute('data-return-url');
    if (!returnURL || !window.history || typeof window.history.replaceState !== 'function') return;
    try {
      var current = new URL(window.location.href);
      var target = new URL(returnURL, current);
      if (target.origin !== current.origin) return;
      window.history.replaceState(window.history.state, '', target.href);
    } catch (err) {}
  });


  var header = document.getElementById('site-header');
  var grid = document.getElementById('catalog');
  var pag = document.getElementById('pagination');
  var count = document.getElementById('count');

  /* ---------- Header: hides on scroll down, returns on scroll up ---------- */
  var lastY = window.pageYOffset;
  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset;
    if (!ticking) {
      window.requestAnimationFrame(function () {
        if (!header) return;
        if (y > lastY && y > 120) header.classList.add('hidden');
        else header.classList.remove('hidden');
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Slide-out panels ---------- */
  var burger = document.getElementById('burger');
  var menuDrawer = document.getElementById('menu-drawer');
  var menuOverlay = document.getElementById('menu-overlay');
  var menuClose = document.getElementById('menu-close');

  var filterDrawer = document.getElementById('filter-drawer');
  var filterOverlay = document.getElementById('filter-overlay');
  var filterClose = document.getElementById('filter-close');
  var filterOpenBtn = document.getElementById('filter-open');

  function syncBodyLock() {
    var open = (menuDrawer && menuDrawer.classList.contains('show')) ||
               (filterDrawer && filterDrawer.classList.contains('show'));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function setMenu(open) {
    if (!menuDrawer) return;
    menuDrawer.classList.toggle('show', open);
    if (menuOverlay) menuOverlay.classList.toggle('show', open);
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    syncBodyLock();
  }

  function setFilterPanel(open) {
    if (!filterDrawer) return;
    filterDrawer.classList.toggle('show', open);
    if (filterOverlay) filterOverlay.classList.toggle('show', open);
    if (filterOpenBtn) filterOpenBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    syncBodyLock();
  }

  if (burger) burger.addEventListener('click', function () { setMenu(true); });
  if (menuClose) menuClose.addEventListener('click', function () { setMenu(false); });
  if (menuOverlay) menuOverlay.addEventListener('click', function () { setMenu(false); });
  if (filterOpenBtn) filterOpenBtn.addEventListener('click', function () { setFilterPanel(true); });
  if (filterClose) filterClose.addEventListener('click', function () { setFilterPanel(false); });
  if (filterOverlay) filterOverlay.addEventListener('click', function () { setFilterPanel(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (menuDrawer && menuDrawer.classList.contains('show')) setMenu(false);
    if (filterDrawer && filterDrawer.classList.contains('show')) setFilterPanel(false);
    if (sp && sp.classList.contains('open')) {
      sp.classList.remove('open');
      if (st) st.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- Search: the magnifier opens the field ---------- */
  var st = document.getElementById('search-toggle');
  var sp = document.getElementById('search-panel');
  var si = document.getElementById('search-input');

  function goToSearch() {
    var q = si ? si.value.trim() : '';
    if (!q) return;
    if (grid) {
      state.q = q.toLowerCase();
      state.page = 1;
      renderGrid();
      updateResetVisibility();
    } else {
      window.location.href = 'index.html?q=' + encodeURIComponent(q);
    }
  }

  if (st && sp) {
    st.addEventListener('click', function (e) {
      e.stopPropagation();
      sp.classList.toggle('open');
      st.setAttribute('aria-expanded', sp.classList.contains('open') ? 'true' : 'false');
      if (sp.classList.contains('open') && si) si.focus();
    });
    document.addEventListener('click', function (e) {
      if (sp.classList.contains('open') && !sp.contains(e.target) && !st.contains(e.target)) {
        sp.classList.remove('open');
        st.setAttribute('aria-expanded', 'false');
      }
    });
  }
  if (si) {
    si.addEventListener('input', function () {
      if (!grid) return;
      state.q = si.value.trim().toLowerCase();
      state.page = 1;
      renderGrid();
      updateResetVisibility();
    });
    si.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        goToSearch();
      }
    });
    si.addEventListener('change', function () {
      if (!grid) goToSearch();
    });
  }

  /* ---------- Filters and sorting ---------- */
  function syncSelects() {
    var pairs = { cat: ['f-cat'], price: ['f-price'], sort: ['f-sort', 'm-sort'] };
    Object.keys(pairs).forEach(function (key) {
      pairs[key].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.value !== state[key]) el.value = state[key];
      });
    });
    var rc = document.querySelector('input[name="p-cat"][value="' + state.cat + '"]');
    if (rc) rc.checked = true;
    var rp = document.querySelector('input[name="p-price"][value="' + state.price + '"]');
    if (rp) rp.checked = true;
  }
  function bindSelect(id, key) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', function () {
      state[key] = el.value;
      state.page = 1;
      renderGrid();
      syncSelects();
      updateResetVisibility();
    });
  }
  bindSelect('f-cat', 'cat');
  bindSelect('f-price', 'price');
  bindSelect('f-sort', 'sort');
  bindSelect('m-sort', 'sort');

  /* Panel radios apply immediately; Apply closes the panel */
  ['p-cat', 'p-price'].forEach(function (name) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.addEventListener('change', function () {
        state[name === 'p-cat' ? 'cat' : 'price'] = r.value;
        state.page = 1;
        renderGrid();
        syncSelects();
        updateResetVisibility();
      });
    });
  });

  /* Accordions */
  document.querySelectorAll('.acc-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = document.getElementById(btn.getAttribute('data-acc')).parentElement;
      var open = group.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  var applyBtn = document.getElementById('m-apply');
  if (applyBtn) applyBtn.addEventListener('click', function () { setFilterPanel(false); });

  /* ---------- Reset all filters ---------- */
  function resetFilters() {
    state.q = '';
    state.cat = '';
    state.price = '';
    state.sort = 'featured';
    state.page = 1;
    if (si) si.value = '';
    syncSelects();
    renderGrid();
    updateResetVisibility();
  }
  var fReset = document.getElementById('f-reset');
  var mRemove = document.getElementById('m-remove');
  if (fReset) fReset.addEventListener('click', resetFilters);
  if (mRemove) mRemove.addEventListener('click', resetFilters);

  /* Reset is visible only when something can be reset */
  function updateResetVisibility() {
    var dirty = state.q || state.cat || state.price || (state.sort && state.sort !== 'featured');
    if (fReset) fReset.style.display = dirty ? '' : 'none';
    var fc = document.getElementById('f-live-count');
    if (fc) {
      var n = applyFilters().length;
      fc.textContent = n + (n === 1 ? ' result' : ' results');
    }
  }

  /* ---------- Filtering and sorting ---------- */
  function applyFilters() {
    var list = PRODUCTS.slice();
    if (state.q) list = list.filter(function (p) {
      return (p.name + ' ' + p.cat).toLowerCase().indexOf(state.q) !== -1;
    });
    if (state.cat) list = list.filter(function (p) { return p.cat === state.cat; });
    if (state.price === 'under2') list = list.filter(function (p) { return p.price < 2; });
    if (state.price === 'over2') list = list.filter(function (p) { return p.price >= 2; });
    switch (state.sort) {
      case 'az': list.sort(function (a, b) { return a.name.localeCompare(b.name, 'en'); }); break;
      case 'za': list.sort(function (a, b) { return b.name.localeCompare(a.name, 'en'); }); break;
      case 'lo': list.sort(function (a, b) { return a.price - b.price; }); break;
      case 'hi': list.sort(function (a, b) { return b.price - a.price; }); break;
      case 'new': list.sort(function (a, b) { return b.order - a.order; }); break;
      default: list.sort(function (a, b) { return a.order - b.order; });
    }
    return list;
  }

  /* ---------- Product card ---------- */
  function cardHTML(p, referrer) {
    var images = productImages(p);
    var summary = typeof p.summary === 'string' ? p.summary.trim() : '';
    var slides = images.map(function (src, i) {
      return '<img class="card-slide' + (i === 0 ? ' is-active' : '') + '"'
        + ' loading="lazy" draggable="false" src="' + esc(src) + '"'
        + ' alt="' + esc(p.name) + ' — image ' + (i + 1) + ' of ' + images.length + '"'
        + ' width="500" height="625">';
    }).join('');
    var dots = images.length > 1
      ? '<span class="card-dots" aria-hidden="true">' + images.map(function (src, i) {
          return '<span class="card-dot' + (i === 0 ? ' is-active' : '') + '"></span>';
        }).join('') + '</span>'
      : '';
    return '<article class="card" id="product-card-' + esc(p.id) + '">'
      + '<a class="card-media" href="product.html?id=' + esc(p.id) + '"'
      + ' data-gallery-index="0" data-gallery-count="' + images.length + '">'
      + '<span class="card-badge">' + esc(p.cat) + '</span>'
      + '<span class="card-slides">' + slides + '</span>'
      + dots
      + '</a>'
      + '<div class="card-body">'
      + '<a class="card-title" href="product.html?id=' + esc(p.id) + '">' + esc(p.name) + '</a>'
      + (summary ? '<p class="card-desc">' + esc(summary) + '</p>' : '')
      + '<div class="card-price-row">'
      + '<span class="price-sale">' + money(p.price) + '</span>'
      + '</div>'
      + '<div class="card-actions">'
      + '<a class="card-btn" href="' + esc(buyURL(p, referrer)) + '" data-return-url="' + esc(referrer) + '">Buy now</a>'
      + '</div>'
      + '</div></article>';
  }

  function productCardIdFromHash() {
    var hash = window.location.hash;
    if (hash.indexOf('#product-card-') !== 0) return '';
    var id = hash.slice('#product-card-'.length);
    try { id = decodeURIComponent(id); } catch (err) {}
    return id;
  }

  function scrollToProductCard() {
    if (!pendingProductCardScroll) return;
    pendingProductCardScroll = false;
    var id = productCardIdFromHash();
    if (!id) return;
    window.requestAnimationFrame(function () {
      var el = document.getElementById('product-card-' + id);
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    });
  }

  function selectCatalogPageForHash() {
    if (!grid) return;
    var id = productCardIdFromHash();
    if (!id) return;
    var list = applyFilters();
    var index = list.findIndex(function (p) { return p.id === id; });
    if (index >= 0) state.page = Math.floor(index / PER_PAGE) + 1;
  }

  /* ---------- Grid and pagination ---------- */
  function renderGrid() {
    if (!grid) return;
    var list = applyFilters();
    var totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * PER_PAGE;
    var pageItems = list.slice(start, start + PER_PAGE);

    if (count) {
      var n = list.length;
      count.textContent = n + (n === 1 ? ' product' : ' products');
    }

    grid.innerHTML = pageItems.length
      ? pageItems.map(function (p) { return cardHTML(p, cardReferrer(p.id)); }).join('')
      : '<p class="empty-state">No prints match your search. Try a different search or reset the filters.</p>';

    bindCardGalleries(grid);

    if (pag) {
      var p = '';
      if (state.page > 1) {
        p += '<button type="button" data-p="' + (state.page - 1) + '" aria-label="Previous page">←</button>';
      }
      for (var i = 1; i <= totalPages; i++) {
        p += i === state.page
          ? '<span class="cur" aria-current="page">' + i + '</span>'
          : '<button type="button" data-p="' + i + '" aria-label="Page ' + i + '">' + i + '</button>';
      }
      if (state.page < totalPages) {
        p += '<button type="button" data-p="' + (state.page + 1) + '" aria-label="Next page">→</button>';
      }
      pag.innerHTML = p;
    }

    scrollToProductCard();
  }
  if (pag) {
    pag.addEventListener('click', function (e) {
      var a = e.target.closest('button[data-p]');
      if (!a) return;
      state.page = parseInt(a.getAttribute('data-p'), 10);
      renderGrid();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Read more ---------- */
  var rm = document.getElementById('read-more');
  var hd = document.getElementById('head-desc');
  if (rm && hd) {
    if (hd.scrollHeight <= hd.clientHeight + 4) rm.style.display = 'none';
    rm.addEventListener('click', function () {
      var open = hd.classList.toggle('open');
      rm.textContent = open ? 'Show less ▲' : 'Read more ▼';
      rm.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Newsletter: no backend is connected, so never claim success ---------- */
  var sf = document.getElementById('sub-form');
  var sok = document.getElementById('sub-ok');
  if (sf) {
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('sub-email');
      if (!email || !email.value || email.value.indexOf('@') < 1 || !email.checkValidity()) return;
      if (sok) {
        sok.textContent = 'Newsletter signup isn’t connected yet — your email wasn’t sent anywhere.';
        sok.hidden = false;
      }
    });
  }

  /* ---------- Safe rich description renderer ---------- */
  function richInline(nodes) {
    if (!Array.isArray(nodes)) return '';
    return nodes.map(function (node) {
      if (!node || typeof node !== 'object') return '';
      if (node.t === 'br') return '<br>';
      var value = typeof node.v === 'string' ? node.v : '';
      if (!value) return '';
      if (node.t === 'strong') return '<strong>' + esc(value) + '</strong>';
      if (node.t === 'em') return '<em>' + esc(value) + '</em>';
      return esc(value);
    }).join('');
  }

  function richDescriptionHTML(blocks) {
    if (!Array.isArray(blocks)) return '';
    return blocks.map(function (block) {
      if (!block || typeof block !== 'object') return '';
      if (block.type === 'p' || block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
        return '<' + block.type + '>' + richInline(block.content) + '</' + block.type + '>';
      }
      if (block.type === 'ul' || block.type === 'ol') {
        var items = Array.isArray(block.items) ? block.items : [];
        return '<' + block.type + '>' + items.map(function (item) {
          return '<li>' + richInline(item) + '</li>';
        }).join('') + '</' + block.type + '>';
      }
      return '';
    }).join('');
  }

  /* ---------- Product page ---------- */
  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.setAttribute('content', value);
  }

  function renderProduct() {
    var page = document.getElementById('product-page');
    if (!page) return;
    var params = new URLSearchParams(window.location.search);
    var p = null;
    var id = params.get('id');
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) { p = PRODUCTS[i]; break; }
    }
    if (!p) {
      document.title = 'Print not found — The Quiet Room';
      page.innerHTML = '<p class="product-missing">Print not found. <a href="index.html">Back to the collection</a></p>';
      return;
    }

    var title = p.name + ' — The Quiet Room';
    var description = typeof p.summary === 'string' && p.summary.trim()
      ? p.summary.trim()
      : 'Digital print file “' + p.name + '” in PNG and PDF. Delivered instantly by email after purchase.';
    var detailDescriptionHTML = richDescriptionHTML(p.description);
    if (!detailDescriptionHTML && typeof p.summary === 'string' && p.summary.trim()) {
      detailDescriptionHTML = '<p>' + esc(p.summary.trim()) + '</p>';
    }
    var images = productImages(p);
    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', window.location.href);
    setMeta('meta[property="og:image"]', new URL(images[0], window.location.href).href);
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);

    var related = PRODUCTS.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
    var thumbs = images.map(function (src, i) {
      return '<button type="button" class="product-thumb' + (i === 0 ? ' is-active' : '') + '"'
        + ' data-index="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '"'
        + ' aria-label="Show image ' + (i + 1) + ' of ' + images.length + '">'
        + '<img src="' + esc(src) + '" alt="' + esc(p.name) + ' — view ' + (i + 1) + '" width="160" height="160">'
        + '</button>';
    }).join('');
    var dots = images.length > 1
      ? '<div class="product-dots" role="group" aria-label="Product image pagination">' + images.map(function (src, i) {
          return '<button type="button" class="product-dot' + (i === 0 ? ' is-active' : '') + '"'
            + ' data-index="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '"'
            + ' aria-label="Show image ' + (i + 1) + ' of ' + images.length + '"></button>';
        }).join('') + '</div>'
      : '';
    var lightboxNav = images.length > 1
      ? '<button type="button" class="product-lightbox-arrow product-lightbox-prev" id="product-lightbox-prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>'
        + '<button type="button" class="product-lightbox-arrow product-lightbox-next" id="product-lightbox-next" aria-label="Next image"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>'
      : '';
    var lightboxCount = images.length > 1
      ? '<span class="product-lightbox-count" id="product-lightbox-count" aria-live="polite">1 / ' + images.length + '</span>'
      : '';
    var lightboxMarkup =
      '<dialog class="product-lightbox" id="product-lightbox" aria-modal="true" aria-labelledby="product-lightbox-title" aria-describedby="product-lightbox-hint">'
      + '<div class="product-lightbox-stage" id="product-lightbox-stage">'
      + '<img class="product-lightbox-image" id="product-lightbox-image" draggable="false" src="' + esc(images[0]) + '" alt="' + esc(p.name) + ' — image 1 of ' + images.length + '">'
      + '</div>'
      + lightboxNav
      + '<button type="button" class="product-lightbox-close" id="product-lightbox-close" aria-label="Close image viewer"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>'
      + lightboxCount
      + '<h2 class="product-lightbox-sr" id="product-lightbox-title">' + esc(p.name) + ' — image 1 of ' + images.length + '</h2>'
      + '<p class="product-lightbox-sr" id="product-lightbox-hint">Use the mouse wheel, pinch or plus and minus to zoom. Drag to pan. Press Escape to close.</p>'
      + '</dialog>';
    // Product fields are escaped and gallery indices are generated integers.
    page.innerHTML =
      '<div class="product-layout" id="product-card-' + esc(p.id) + '">'
      + '<div class="product-visual">'
      + '<div class="product-gallery">'
      + '<div class="product-media" data-gallery-index="0" data-gallery-count="' + images.length + '">'
      + '<button type="button" class="product-main-trigger" id="product-main-trigger" aria-haspopup="dialog" aria-controls="product-lightbox" aria-label="Open larger view of ' + esc(p.name) + ' — image 1 of ' + images.length + '">'
      + '<img id="product-main-image" draggable="false" src="' + esc(images[0]) + '" alt="' + esc(p.name) + ' — image 1 of ' + images.length + '">'
      + '<span class="product-zoom-hint" aria-hidden="true"><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom</span>'
      + '</button></div>'
      + dots
      + '<div class="product-thumbs" role="group" aria-label="Product images">' + thumbs + '</div>'
      + '</div>'
      + '<div class="product-buy-row">'
      + '<a class="product-buy" href="' + esc(buyURL(p, cardReferrer(p.id))) + '" data-return-url="' + esc(cardReferrer(p.id)) + '">Buy now — ' + money(p.price) + '</a>'
      + '</div>'
      + '</div>'
      + '<div class="product-info">'
      + '<p class="product-cat">' + esc(p.cat) + '</p>'
      + '<h1>' + esc(p.name) + '</h1>'
      + '<div class="product-price">'
      + '<span class="price-sale">' + money(p.price) + '</span>'
      + '</div>'
      + '<p class="product-formats">Formats: ' + esc(p.formats) + '</p>'
      + '<div class="product-desc">'
      + detailDescriptionHTML
      + '</div>'
      + '<ul class="product-feats">'
      + '<li><i class="fa-solid fa-circle-check"></i>Instant email delivery after payment</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>Ready to upload to Printify, Printful and Redbubble</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>For personal use and small businesses</li>'
      + '<li><i class="fa-solid fa-circle-check"></i>Digital download — no physical item is shipped</li>'
      + '</ul>'
      + '<p class="product-safe"><i class="fa-solid fa-lock"></i> Secure card payment · 3-D Secure</p>'
      + '<p class="product-checkout-note">Checkout is hosted by BlackSea. You can add more prints to your BlackSea basket before paying.</p>'
      + '</div></div>'
      + '<section class="product-related"><h2>You may also like</h2><div class="grid">'
      + related.map(function (x) { return cardHTML(x, cardReferrer(x.id)); }).join('')
      + '</div></section>'
      + lightboxMarkup;

    var mainImage = document.getElementById('product-main-image');
    var media = page.querySelector('.product-media');
    var thumbButtons = page.querySelectorAll('.product-thumb');
    var dotButtons = page.querySelectorAll('.product-dot');
    var trigger = document.getElementById('product-main-trigger');
    var lightbox = document.getElementById('product-lightbox');
    var lightboxImage = document.getElementById('product-lightbox-image');
    var lightboxStage = document.getElementById('product-lightbox-stage');
    var lightboxTitle = document.getElementById('product-lightbox-title');
    var countLabel = document.getElementById('product-lightbox-count');
    var closeButton = document.getElementById('product-lightbox-close');
    var prevButton = document.getElementById('product-lightbox-prev');
    var nextButton = document.getElementById('product-lightbox-next');
    var current = 0;
    var ZOOM_MIN = 1;
    var ZOOM_MAX = 4;
    var ZOOM_STEP = 0.5;
    var lightboxZoom = ZOOM_MIN;
    var panX = 0;
    var panY = 0;
    var lightboxOpen = false;
    var lightboxLastTrigger = null;
    var savedBodyOverflow = '';
    var savedStageTouchAction = '';
    var panStart = null;
    var pinchStart = null;
    var touchPointers = {};
    var lastTap = null;
    var suppressClickUntil = 0;

    function updateLightboxImage() {
      if (lightboxImage && images[current]) {
        lightboxImage.src = images[current];
        lightboxImage.alt = p.name + ' — image ' + (current + 1) + ' of ' + images.length;
      }
      if (lightboxTitle) {
        lightboxTitle.textContent = p.name + ' — image ' + (current + 1) + ' of ' + images.length;
      }
      if (countLabel) {
        countLabel.textContent = (current + 1) + ' / ' + images.length;
      }
    }

    function applyZoom() {
      var zoomed = lightboxZoom > ZOOM_MIN;
      if (!zoomed) {
        panX = 0;
        panY = 0;
      }
      if (lightboxImage) {
        lightboxImage.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + lightboxZoom + ')';
        lightboxImage.style.cursor = zoomed ? (panStart ? 'grabbing' : 'grab') : 'zoom-in';
      }
      if (lightboxStage) {
        lightboxStage.classList.toggle('is-zoomed', zoomed);
        lightboxStage.classList.toggle('is-panning', !!panStart);
      }
      if (lightbox) {
        lightbox.setAttribute('data-zoom', String(lightboxZoom));
        lightbox.setAttribute('data-pan-x', String(panX));
        lightbox.setAttribute('data-pan-y', String(panY));
      }
    }

    function resetZoom() {
      lightboxZoom = ZOOM_MIN;
      panX = 0;
      panY = 0;
      applyZoom();
    }

    function zoomAt(next, clientX, clientY) {
      var previous = lightboxZoom;
      next = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) * 10) / 10;
      if (next === previous) {
        if (next === ZOOM_MIN) {
          panX = 0;
          panY = 0;
          applyZoom();
        }
        return;
      }
      if (typeof clientX === 'number' && typeof clientY === 'number' && lightboxStage && typeof lightboxStage.getBoundingClientRect === 'function') {
        var rect = lightboxStage.getBoundingClientRect();
        var anchorX = clientX - (rect.left + rect.width / 2);
        var anchorY = clientY - (rect.top + rect.height / 2);
        var ratio = next / previous;
        panX = anchorX - ratio * (anchorX - panX);
        panY = anchorY - ratio * (anchorY - panY);
      } else {
        panX = panX * next / previous;
        panY = panY * next / previous;
      }
      lightboxZoom = next;
      if (next === ZOOM_MIN) {
        panX = 0;
        panY = 0;
      }
      applyZoom();
    }

    function onLightboxWheel(e) {
      if (!lightboxOpen) return;
      if (e && e.preventDefault) e.preventDefault();
      if (!e || !e.deltaY) return;
      zoomAt(lightboxZoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP), e.clientX, e.clientY);
    }

    function onLightboxDoubleClick(e) {
      if (!lightboxOpen) return;
      if (e && e.preventDefault) e.preventDefault();
      zoomAt(lightboxZoom > ZOOM_MIN ? ZOOM_MIN : 2, e && e.clientX, e && e.clientY);
    }

    function touchPointCount() {
      var count = 0;
      for (var key in touchPointers) {
        if (Object.prototype.hasOwnProperty.call(touchPointers, key)) count++;
      }
      return count;
    }

    function firstTouchPoints() {
      var points = [];
      for (var key in touchPointers) {
        if (!Object.prototype.hasOwnProperty.call(touchPointers, key)) continue;
        points.push(touchPointers[key]);
        if (points.length === 2) break;
      }
      return points;
    }

    function touchDistance(a, b) {
      var dx = a.x - b.x;
      var dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function eventTime(e) {
      return e && typeof e.timeStamp === 'number' && e.timeStamp > 0 ? e.timeStamp : Date.now();
    }

    function clearPan() {
      panStart = null;
      if (lightboxStage) lightboxStage.classList.remove('is-panning');
      applyZoom();
    }

    function clearPinch() {
      pinchStart = null;
      if (lightboxStage) lightboxStage.classList.remove('is-pinching');
    }

    function beginPinch(points) {
      pinchStart = {
        distance: Math.max(1, touchDistance(points[0], points[1])),
        zoom: lightboxZoom,
        panX: panX,
        panY: panY,
        centerX: (points[0].x + points[1].x) / 2,
        centerY: (points[0].y + points[1].y) / 2
      };
      clearPan();
      if (lightboxStage) lightboxStage.classList.add('is-pinching');
    }

    function applyPinch(points) {
      if (!pinchStart) return;
      var distance = Math.max(1, touchDistance(points[0], points[1]));
      var next = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStart.zoom * distance / pinchStart.distance)) * 10) / 10;
      var ratio = next / pinchStart.zoom;
      if (lightboxStage && typeof lightboxStage.getBoundingClientRect === 'function') {
        var rect = lightboxStage.getBoundingClientRect();
        var anchorX = pinchStart.centerX - (rect.left + rect.width / 2);
        var anchorY = pinchStart.centerY - (rect.top + rect.height / 2);
        panX = anchorX - ratio * (anchorX - pinchStart.panX);
        panY = anchorY - ratio * (anchorY - pinchStart.panY);
      } else {
        panX = pinchStart.panX * ratio;
        panY = pinchStart.panY * ratio;
      }
      lightboxZoom = next;
      if (next === ZOOM_MIN) {
        panX = 0;
        panY = 0;
      }
      applyZoom();
    }

    function toggleTapZoom(x, y) {
      zoomAt(lightboxZoom > ZOOM_MIN ? ZOOM_MIN : 2, x, y);
    }

    function cleanupLightbox() {
      if (document.body) {
        document.body.style.overflow = savedBodyOverflow;
        document.body.classList.remove('lightbox-open');
      }
      if (lightbox) lightbox.classList.remove('is-open', 'product-lightbox--fallback');
      if (lightboxStage) {
        lightboxStage.classList.remove('is-panning', 'is-pinching', 'is-zoomed');
        if (lightboxStage.style) lightboxStage.style.touchAction = savedStageTouchAction;
      }
      panStart = null;
      pinchStart = null;
      touchPointers = {};
      lastTap = null;
      suppressClickUntil = 0;
    }

    function returnLightboxFocus() {
      var target = lightboxLastTrigger || trigger;
      lightboxLastTrigger = null;
      if (target && typeof target.focus === 'function') target.focus();
    }

    function closeLightbox() {
      if (!lightboxOpen) return;
      lightboxOpen = false;
      cleanupLightbox();
      if (lightbox) {
        if (typeof lightbox.close === 'function' && lightbox.open) {
          try { lightbox.close(); } catch (err) { lightbox.removeAttribute('open'); }
        } else if (typeof lightbox.removeAttribute === 'function') {
          lightbox.removeAttribute('open');
        }
      }
      returnLightboxFocus();
    }

    function openLightbox() {
      if (!lightbox || !lightboxImage || lightboxOpen) return;
      lightboxOpen = true;
      lastTap = null;
      suppressClickUntil = 0;
      if (lightboxStage && lightboxStage.style) {
        savedStageTouchAction = lightboxStage.style.touchAction || '';
        lightboxStage.style.touchAction = 'none';
      }
      lightboxLastTrigger = trigger || document.activeElement;
      savedBodyOverflow = document.body && document.body.style ? document.body.style.overflow : '';
      if (document.body) {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('lightbox-open');
      }
      updateLightboxImage();
      resetZoom();
      lightbox.classList.add('is-open');
      var modalShown = false;
      if (typeof lightbox.showModal === 'function') {
        try {
          if (!lightbox.open) lightbox.showModal();
          modalShown = true;
        } catch (err) {
          modalShown = false;
        }
      }
      if (!modalShown) {
        lightbox.classList.add('product-lightbox--fallback');
        if (typeof lightbox.setAttribute === 'function') lightbox.setAttribute('open', '');
      }
      var focusTarget = closeButton || lightboxImage;
      if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
    }

    function trapLightboxFocus(e) {
      var focusable = [prevButton, nextButton, closeButton].filter(function (el) {
        return el && !el.disabled && !el.hidden;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      var index = focusable.indexOf(document.activeElement);
      if (e.shiftKey && index <= 0) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (index === -1 || index === focusable.length - 1)) {
        e.preventDefault();
        first.focus();
      }
    }

    function showImage(index) {
      index = wrapIndex(index, images.length);
      current = index;
      if (mainImage && images[index]) {
        mainImage.src = images[index];
        mainImage.alt = p.name + ' — image ' + (index + 1) + ' of ' + images.length;
      }
      if (trigger && typeof trigger.setAttribute === 'function') {
        trigger.setAttribute('aria-label', 'Open larger view of ' + p.name + ' — image ' + (index + 1) + ' of ' + images.length);
      }
      if (media) media.setAttribute('data-gallery-index', String(index));
      thumbButtons.forEach(function (b) {
        var active = parseInt(b.getAttribute('data-index'), 10) === index;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      dotButtons.forEach(function (b) {
        var active = parseInt(b.getAttribute('data-index'), 10) === index;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (lightboxOpen) {
        updateLightboxImage();
        resetZoom();
      }
    }

    thumbButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        showImage(parseInt(btn.getAttribute('data-index'), 10));
      });
    });
    dotButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        showImage(parseInt(btn.getAttribute('data-index'), 10));
      });
    });
    if (media && images.length > 1) {
      bindSwipe(media, function (dir) { showImage(current + dir); });
    }
    function listen(el, type, fn, options) {
      if (el && typeof el.addEventListener === 'function') el.addEventListener(type, fn, options);
    }

    function startPan(e) {
      panStart = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        panX: panX,
        panY: panY,
        moved: false
      };
      if (lightboxStage && lightboxStage.setPointerCapture) {
        try { lightboxStage.setPointerCapture(e.pointerId); } catch (err) {}
      }
      applyZoom();
    }

    function onStagePointerDown(e) {
      if (!lightboxOpen || !e) return;
      if (e.pointerType === 'touch') {
        touchPointers[e.pointerId] = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          startX: e.clientX,
          startY: e.clientY,
          startTime: eventTime(e),
          moved: false
        };
        if (lightboxStage && lightboxStage.setPointerCapture) {
          try { lightboxStage.setPointerCapture(e.pointerId); } catch (err) {}
        }
        var points = firstTouchPoints();
        if (points.length === 2) {
          beginPinch(points);
          lastTap = null;
          if (e.preventDefault) e.preventDefault();
          return;
        }
        if (lightboxZoom > ZOOM_MIN) startPan(e);
        return;
      }
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      if (e.button !== undefined && e.button !== 0) return;
      if (lightboxZoom <= ZOOM_MIN) return;
      startPan(e);
    }

    function onStagePointerMove(e) {
      if (!lightboxOpen || !e) return;
      if (e.pointerType === 'touch') {
        var point = touchPointers[e.pointerId];
        if (!point) return;
        if (Math.abs(e.clientX - point.startX) > 8 || Math.abs(e.clientY - point.startY) > 8) point.moved = true;
        point.x = e.clientX;
        point.y = e.clientY;
        if (pinchStart) {
          var points = firstTouchPoints();
          if (points.length === 2) applyPinch(points);
          if (e.preventDefault) e.preventDefault();
          return;
        }
        if (panStart && panStart.id === e.pointerId) {
          if (Math.abs(e.clientX - panStart.x) > 2 || Math.abs(e.clientY - panStart.y) > 2) panStart.moved = true;
          panX = panStart.panX + (e.clientX - panStart.x);
          panY = panStart.panY + (e.clientY - panStart.y);
          if (e.preventDefault) e.preventDefault();
          applyZoom();
        }
        return;
      }
      if (!panStart || e.pointerId !== panStart.id) return;
      if (Math.abs(e.clientX - panStart.x) > 2 || Math.abs(e.clientY - panStart.y) > 2) panStart.moved = true;
      panX = panStart.panX + (e.clientX - panStart.x);
      panY = panStart.panY + (e.clientY - panStart.y);
      if (e.preventDefault) e.preventDefault();
      applyZoom();
    }

    function onStagePointerUp(e, cancelled) {
      if (!e) return;
      var now = eventTime(e);
      if (e.pointerType === 'touch') {
        var point = touchPointers[e.pointerId];
        delete touchPointers[e.pointerId];
        if (lightboxStage && lightboxStage.releasePointerCapture) {
          try { lightboxStage.releasePointerCapture(e.pointerId); } catch (err) {}
        }
        if (pinchStart && touchPointCount() < 2) {
          clearPinch();
          lastTap = null;
          return;
        }
        var wasPanning = panStart && panStart.id === e.pointerId;
        if (wasPanning) {
          if (panStart.moved) suppressClickUntil = now + 400;
          clearPan();
        }
        if (cancelled) {
          lastTap = null;
          return;
        }
        if (point && !point.moved && now - point.startTime <= 500) {
          if (lastTap && now - lastTap.time <= 320 && touchDistance(point, lastTap) <= 30) {
            toggleTapZoom(point.x, point.y);
            suppressClickUntil = now + 400;
            lastTap = null;
          } else {
            lastTap = { time: now, x: point.x, y: point.y };
          }
        } else {
          lastTap = null;
        }
        return;
      }
      if (!panStart || e.pointerId !== panStart.id) return;
      if (panStart.moved) suppressClickUntil = now + 400;
      clearPan();
    }

    if (trigger && lightbox) {
      listen(trigger, 'click', openLightbox);
    }
    if (lightbox) {
      listen(lightbox, 'click', function (e) {
        if (eventTime(e) <= suppressClickUntil) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          return;
        }
        if (e.target === lightbox || e.target === lightboxStage) closeLightbox();
      });
      listen(lightbox, 'cancel', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        closeLightbox();
      });
      listen(lightbox, 'close', function () {
        if (!lightboxOpen) return;
        lightboxOpen = false;
        cleanupLightbox();
        returnLightboxFocus();
      });
      listen(lightbox, 'keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeLightbox();
          return;
        }
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          zoomAt(lightboxZoom + ZOOM_STEP);
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomAt(lightboxZoom - ZOOM_STEP);
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          resetZoom();
          return;
        }
        if (e.key === 'ArrowLeft' && images.length > 1) {
          e.preventDefault();
          showImage(current - 1);
          return;
        }
        if (e.key === 'ArrowRight' && images.length > 1) {
          e.preventDefault();
          showImage(current + 1);
          return;
        }
        if (e.key === 'Tab') trapLightboxFocus(e);
      });
    }
    if (closeButton) {
      listen(closeButton, 'click', function (e) {
        if (e && e.preventDefault) e.preventDefault();
        closeLightbox();
      });
    }
    listen(prevButton, 'click', function () { showImage(current - 1); });
    listen(nextButton, 'click', function () { showImage(current + 1); });
    if (lightboxStage) {
      listen(lightboxStage, 'wheel', onLightboxWheel, { passive: false });
      listen(lightboxStage, 'dblclick', onLightboxDoubleClick);
      listen(lightboxStage, 'pointerdown', onStagePointerDown);
      listen(lightboxStage, 'pointermove', onStagePointerMove);
      listen(lightboxStage, 'pointerup', function (e) { onStagePointerUp(e, false); });
      listen(lightboxStage, 'pointercancel', function (e) { onStagePointerUp(e, true); });
    }
    bindCardGalleries(page);

    scrollToProductCard();
  }

  /* ---------- Start ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var initialQ = new URLSearchParams(window.location.search).get('q');
    if (initialQ && grid) {
      state.q = initialQ.trim().toLowerCase();
      if (si) si.value = initialQ.trim();
      if (sp) {
        sp.classList.add('open');
        if (st) st.setAttribute('aria-expanded', 'true');
      }
    }
    selectCatalogPageForHash();
    renderGrid();
    syncSelects();
    updateResetVisibility();
    renderProduct();
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  });
})();
