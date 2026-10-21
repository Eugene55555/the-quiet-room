/* The Quiet Room — local basket UI and BlackSea handoff */
(function () {
  'use strict';

  var Core = window.TQR_CART_CORE;
  var PRODUCTS = window.TQR_PRODUCTS || [];
  if (!Core || !document.getElementById('cart-drawer')) return;

  var CART_KEY = 'tqr-cart-v1';
  var RETURN_KEY = 'tqr-cart-return-v1';
  var CHECKOUT_URL = 'https://5307397047125.blacksea.in.ua/checkout';
  var SITE_URL = window.TQR_SITE || window.location.href;
  var cartToggle = document.getElementById('cart-toggle');
  var cartDrawer = document.getElementById('cart-drawer');
  var cartOverlay = document.getElementById('cart-overlay');
  var cartClose = document.getElementById('cart-close');
  var cartItems = document.getElementById('cart-items');
  var cartCount = document.getElementById('cart-count');
  var cartHeadingCount = document.getElementById('cart-heading-count');
  var cartItemSummary = document.getElementById('cart-item-summary');
  var cartTotal = document.getElementById('cart-total');
  var cartStatus = document.getElementById('cart-status');
  var cartNote = document.getElementById('cart-note');
  var cartCheckout = document.getElementById('cart-checkout');
  var cartClear = document.getElementById('cart-clear');
  var cart = loadCart();
  var returnURL = loadReturnURL();
  var cartFocusReturn = null;

  function storage() {
    try { return window.localStorage; } catch (err) { return null; }
  }

  function loadCart() {
    var store = storage();
    if (!store) return {};
    var raw;
    try { raw = store.getItem(CART_KEY) || '{}'; } catch (err) { return {}; }
    var storedCart;
    try { storedCart = JSON.parse(raw); } catch (err) { return {}; }
    var normalized;
    try { normalized = Core.normalizeCart(storedCart, PRODUCTS); } catch (err) { normalized = {}; }
    var serialized = JSON.stringify(normalized);
    if (raw !== serialized) {
      try { store.setItem(CART_KEY, serialized); } catch (err) {}
    }
    return normalized;
  }

  function loadReturnURL() {
    var store = storage();
    if (!store) return SITE_URL;
    try { return store.getItem(RETURN_KEY) || SITE_URL; } catch (err) { return SITE_URL; }
  }

  function saveCart() {
    var store = storage();
    if (!store) return;
    try {
      store.setItem(CART_KEY, JSON.stringify(cart));
      store.setItem(RETURN_KEY, returnURL || SITE_URL);
    } catch (err) {}
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/'/g, '&#39;');
  }

  function moneyCents(cents) {
    return '$' + (Number(cents || 0) / 100).toFixed(2);
  }

  function setBodyLock() {
    var menu = document.getElementById('menu-drawer');
    var filters = document.getElementById('filter-drawer');
    var open = (cartDrawer && cartDrawer.classList.contains('show')) ||
      (menu && menu.classList.contains('show')) ||
      (filters && filters.classList.contains('show'));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function setPanel(open, restoreFocus, opener) {
    if (!cartDrawer) return;
    if (open) {
      cartFocusReturn = opener || cartToggle;
      ['menu-drawer', 'filter-drawer'].forEach(function (id) {
        var drawer = document.getElementById(id);
        var overlay = document.getElementById(id === 'menu-drawer' ? 'menu-overlay' : 'filter-overlay');
        if (drawer) drawer.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
      });
      var burger = document.getElementById('burger');
      var filterButton = document.getElementById('filter-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      if (filterButton) filterButton.setAttribute('aria-expanded', 'false');
    }
    cartDrawer.classList.toggle('show', open);
    if (cartOverlay) cartOverlay.classList.toggle('show', open);
    cartDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    cartDrawer.inert = !open;
    if (cartToggle) cartToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    setBodyLock();
    if (open && cartClose) cartClose.focus();
    if (!open) {
      var focusTarget = cartFocusReturn || cartToggle;
      if (restoreFocus !== false && focusTarget) focusTarget.focus();
      cartFocusReturn = null;
    }
  }

  window.TQR_CLOSE_CART = function () { setPanel(false, false); };

  function renderCart() {
    var items = Core.listItems(cart, PRODUCTS);
    var itemCount = Core.countProducts(cart, PRODUCTS);
    var subtotal = Core.subtotalCents(cart, PRODUCTS);

    if (cartItems) {
      // All item fields come from the fixed catalog; each known design appears once.
      cartItems.innerHTML = items.length ? items.map(function (item) {
        var lineCents = Math.round(Number(item.price) * 100);
        return '<article class="cart-item" data-cart-line="' + esc(item.id) + '">'
          + '<a class="cart-item-image" href="product.html?id=' + encodeURIComponent(item.id) + '">'
          + '<img src="' + esc(item.img) + '" alt="' + esc(item.name) + '" loading="lazy" width="84" height="105">'
          + '</a>'
          + '<div class="cart-item-details">'
          + '<a class="cart-item-title" href="product.html?id=' + encodeURIComponent(item.id) + '">' + esc(item.name) + '</a>'
          + '<div class="cart-item-controls">'
          + '<span class="cart-line-total">' + moneyCents(lineCents) + '</span>'
          + '<button class="cart-remove" type="button" data-cart-action="remove" data-product-id="' + esc(item.id) + '" aria-label="Remove ' + esc(item.name) + ' from cart"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button>'
          + '</div></div></article>';
      }).join('') : '<p class="cart-empty">Your shopping bag is empty. Add a print from the collection.</p>';
    }

    if (cartCount) {
      cartCount.textContent = String(itemCount);
      cartCount.classList.toggle('is-hidden', itemCount === 0);
    }
    if (cartToggle) {
      cartToggle.setAttribute('aria-label', itemCount ? 'Open shopping cart, ' + itemCount + (itemCount === 1 ? ' item' : ' items') : 'Open shopping cart');
    }
    if (cartHeadingCount) cartHeadingCount.textContent = itemCount ? '(' + itemCount + ')' : '';
    if (cartItemSummary) cartItemSummary.textContent = items.length + (items.length === 1 ? ' product' : ' products');
    if (cartTotal) cartTotal.textContent = moneyCents(subtotal);
    if (cartNote) {
      cartNote.textContent = items.length > 1
        ? 'BlackSea links from this site add one product at a time. Multi-product checkout is disabled to prevent a partial order. Your items stay saved here; removing them in BlackSea does not clear this bag.'
        : 'This bag is saved on this site. Removing a product in BlackSea does not remove it here; use Clear cart to empty this bag.';
    }
    if (cartCheckout) cartCheckout.disabled = items.length !== 1;
    if (cartClear) cartClear.disabled = itemCount === 0;
  }

  function addProduct(id, targetURL, opener) {
    var alreadySelected = Object.prototype.hasOwnProperty.call(cart, id);
    cart = Core.addItem(cart, id, PRODUCTS);
    if (targetURL) returnURL = targetURL;
    saveCart();
    renderCart();
    var product = PRODUCTS.filter(function (item) { return item.id === id; })[0];
    if (cartStatus) cartStatus.textContent = product
      ? product.name + (alreadySelected ? ' is already in your shopping bag.' : ' added to your shopping bag.')
      : '';
    setPanel(true, true, opener);
  }

  function removeProduct(id) {
    cart = Core.removeItem(cart, id, PRODUCTS);
    saveCart();
    renderCart();
    if (cartStatus) cartStatus.textContent = 'Item removed from your shopping bag.';
  }

  function clearCart() {
    if (!Object.keys(cart).length) return;
    cart = {};
    saveCart();
    renderCart();
    if (cartStatus) cartStatus.textContent = 'Shopping bag cleared.';
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var addButton = target.closest('[data-cart-add]');
    if (addButton) {
      event.preventDefault();
      addProduct(addButton.getAttribute('data-cart-add'), addButton.getAttribute('data-cart-return'), addButton);
      return;
    }

    var action = target.closest('[data-cart-action]');
    if (!action) return;
    event.preventDefault();
    var id = action.getAttribute('data-product-id');
    var kind = action.getAttribute('data-cart-action');
    if (kind !== 'remove') return;
    removeProduct(id);
  });

  if (cartToggle) cartToggle.addEventListener('click', function () {
    setPanel(!cartDrawer.classList.contains('show'), true, cartToggle);
  });
  if (cartClose) cartClose.addEventListener('click', function () { setPanel(false); });
  if (cartOverlay) cartOverlay.addEventListener('click', function () { setPanel(false); });
  if (cartClear) cartClear.addEventListener('click', clearCart);
  if (cartCheckout) cartCheckout.addEventListener('click', function (event) {
    event.preventDefault();
    var items = Core.listItems(cart, PRODUCTS);
    if (items.length !== 1) {
      if (items.length > 1 && cartStatus) cartStatus.textContent = 'BlackSea accepts one product per link. No items were sent; remove other designs from this site’s bag before continuing.';
      return;
    }
    var url = Core.buildCheckoutLink(cart, PRODUCTS, returnURL, CHECKOUT_URL, SITE_URL);
    if (!url) {
      if (cartStatus) cartStatus.textContent = 'Could not prepare the BlackSea checkout link. Please try again.';
      return;
    }
    if (window.location && typeof window.location.assign === 'function') window.location.assign(url);
    else if (window.location) window.location.href = url;
  });

  document.addEventListener('keydown', function (event) {
    if (!cartDrawer || !cartDrawer.classList.contains('show')) return;
    if (event.key === 'Escape') {
      setPanel(false);
      return;
    }
    if (event.key !== 'Tab') return;
    var focusable = Array.prototype.slice.call(cartDrawer.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    if (!focusable.length) {
      event.preventDefault();
      if (cartClose) cartClose.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (!cartDrawer.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== CART_KEY && event.key !== RETURN_KEY) return;
    cart = loadCart();
    returnURL = loadReturnURL();
    renderCart();
  });

  renderCart();
})();
