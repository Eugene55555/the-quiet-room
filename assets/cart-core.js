(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TQR_CART_CORE = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  function productById(id, products) {
    products = Array.isArray(products) ? products : [];
    for (var i = 0; i < products.length; i++) {
      if (products[i] && products[i].id === id) return products[i];
    }
    return null;
  }

  function normalizeCart(cart, products) {
    var normalized = {};
    if (!cart || typeof cart !== 'object') return normalized;
    if (Array.isArray(cart)) {
      cart.forEach(function (id) {
        if (productById(id, products)) normalized[id] = true;
      });
      return normalized;
    }
    Object.keys(cart).forEach(function (id) {
      if (!productById(id, products)) return;
      var storedValue;
      try { storedValue = Number(cart[id]); } catch (err) { return; }
      if (Number.isFinite(storedValue) && storedValue >= 1) normalized[id] = true;
    });
    return normalized;
  }

  function addItem(cart, id, products) {
    var next = normalizeCart(cart, products);
    if (!productById(id, products)) return next;
    next[id] = true;
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
      return sum + Math.round(Number(product.price) * 100);
    }, 0);
  }

  function listItems(cart, products) {
    var normalized = normalizeCart(cart, products);
    return Object.keys(normalized).map(function (id) {
      var product = productById(id, products);
      var item = {};
      Object.keys(product).forEach(function (key) { item[key] = product[key]; });
      return item;
    });
  }

  function countProducts(cart, products) {
    var normalized = normalizeCart(cart, products);
    return Object.keys(normalized).length;
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
    url.searchParams.delete('quantity');
    url.searchParams.set('product', product.slug);
    url.searchParams.set('referrer', referrer);
    return url.href;
  }

  return {
    addItem: addItem,
    buildCheckoutLink: buildCheckoutLink,
    countProducts: countProducts,
    listItems: listItems,
    normalizeCart: normalizeCart,
    removeItem: removeItem,
    subtotalCents: subtotalCents
  };
});
