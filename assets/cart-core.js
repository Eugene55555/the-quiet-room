(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TQR_CART_CORE = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var MAX_QUANTITY = 99;

  function productById(id, products) {
    products = Array.isArray(products) ? products : [];
    for (var i = 0; i < products.length; i++) {
      if (products[i] && products[i].id === id) return products[i];
    }
    return null;
  }

  function quantity(value, fallback) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(MAX_QUANTITY, Math.floor(parsed));
  }

  function normalizeCart(cart, products) {
    var normalized = {};
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) return normalized;
    Object.keys(cart).forEach(function (id) {
      if (!productById(id, products)) return;
      var qty = quantity(cart[id], 0);
      if (qty) normalized[id] = qty;
    });
    return normalized;
  }

  function addItem(cart, id, amount, products) {
    var next = normalizeCart(cart, products);
    if (!productById(id, products)) return next;
    var qty = quantity(amount, 1);
    next[id] = Math.min(MAX_QUANTITY, (next[id] || 0) + qty);
    return next;
  }

  function setQuantity(cart, id, amount, products) {
    var next = normalizeCart(cart, products);
    if (!productById(id, products)) return next;
    next[id] = quantity(amount, 1);
    return next;
  }

  function removeItem(cart, id, products) {
    var next = normalizeCart(cart, products);
    delete next[id];
    return next;
  }

  function subtotalCents(cart, products) {
    var normalized = normalizeCart(cart, products);
    return Object.keys(normalized).reduce(function (sum, id) {
      var product = productById(id, products);
      return sum + Math.round(Number(product.price) * 100) * normalized[id];
    }, 0);
  }

  function listItems(cart, products) {
    var normalized = normalizeCart(cart, products);
    return Object.keys(normalized).map(function (id) {
      var product = productById(id, products);
      var item = {};
      Object.keys(product).forEach(function (key) { item[key] = product[key]; });
      item.quantity = normalized[id];
      return item;
    });
  }

  function countUnits(cart, products) {
    var normalized = normalizeCart(cart, products);
    return Object.keys(normalized).reduce(function (sum, id) { return sum + normalized[id]; }, 0);
  }

  function safeReturnURL(candidate, siteURL) {
    var home;
    try {
      home = new URL(siteURL);
    } catch (err) {
      return '';
    }
    var sitePath = home.pathname.endsWith('/') ? home.pathname : home.pathname + '/';
    try {
      var target = new URL(candidate || home.href, home);
      if (target.origin !== home.origin || target.pathname.indexOf(sitePath) !== 0) return home.href;
      return target.href;
    } catch (err) {
      return home.href;
    }
  }

  function buildCheckoutLink(cart, products, returnURL, checkoutURL, siteURL) {
    var normalized = normalizeCart(cart, products);
    var ids = Object.keys(normalized);
    if (ids.length !== 1) return '';

    var product = productById(ids[0], products);
    if (!product || typeof product.slug !== 'string' || !product.slug.trim()) return '';
    var referrer = safeReturnURL(returnURL, siteURL);
    if (!referrer) return '';
    var url;
    try {
      url = new URL(checkoutURL);
    } catch (err) {
      return '';
    }
    if (url.protocol !== 'https:') return '';
    url.searchParams.set('product', product.slug);
    url.searchParams.set('quantity', String(normalized[ids[0]]));
    url.searchParams.set('referrer', referrer);
    return url.href;
  }

  return {
    MAX_QUANTITY: MAX_QUANTITY,
    addItem: addItem,
    buildCheckoutLink: buildCheckoutLink,
    countUnits: countUnits,
    listItems: listItems,
    normalizeCart: normalizeCart,
    removeItem: removeItem,
    setQuantity: setQuantity,
    subtotalCents: subtotalCents
  };
});
