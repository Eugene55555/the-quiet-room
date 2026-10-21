'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const siteRoot = 'https://eugene55555.github.io/the-quiet-room/';
const checkoutRoot = 'https://5307397047125.blacksea.in.ua/checkout';
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');
const htmlFiles = ['../index.html', '../product.html'];
const products = [
  { id: 'tiger', slug: 'lek', name: 'Baby Tiger', cat: 'Tropical', img: 'assets/tiger.png', images: ['assets/tiger.png'], formats: 'PNG + PDF', price: 2.60, order: 1 },
  { id: 'butterfly', slug: 'ksi', name: 'Golden Butterfly Cat', cat: 'Butterfly', img: 'assets/butterfly.png', images: ['assets/butterfly.png'], formats: 'PNG + PDF', price: 1.30, order: 2 }
];

function makeElement() {
  const classes = new Set();
  return {
    innerHTML: '', textContent: '', value: '', style: {}, listeners: {}, attributes: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      }
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    contains() { return false; }
  };
}

function renderPage(href, type) {
  const elements = {};
  if (type === 'catalog') {
    elements.catalog = makeElement();
    elements.pagination = makeElement();
    elements.count = makeElement();
  } else {
    elements['product-page'] = makeElement();
  }
  const scrolledTo = [];
  const historyUpdates = [];
  const removedStorageKeys = [];
  const stored = new Map([['tqr-cart-v1', '{"tiger":true}'], ['tqr-cart-return-v1', siteRoot + '#product-card-tiger'], ['unrelated', 'keep']]);
  const location = new URL(href);
  const document = {
    body: makeElement(),
    title: '',
    listeners: {},
    getElementById(id) {
      if (elements[id]) return elements[id];
      for (const root of [elements.catalog, elements['product-page']]) {
        if (root && root.innerHTML.includes('id="' + id + '"')) {
          return { scrollIntoView() { scrolledTo.push(id); } };
        }
      }
      return null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const window = {
    TQR_PRODUCTS: products,
    location,
    history: {
      state: null,
      replaceState(state, title, url) {
        historyUpdates.push(url);
        location.href = url;
      }
    },
    pageYOffset: 0,
    localStorage: { removeItem(key) { removedStorageKeys.push(key); stored.delete(key); } },
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };
  vm.runInNewContext(mainSource, { window, document, URL, URLSearchParams, Date, Number, Math, Object, Array, String });
  document.listeners.DOMContentLoaded();
  return {
    markup: type === 'catalog' ? elements.catalog.innerHTML : elements['product-page'].innerHTML,
    scrolledTo,
    historyUpdates,
    location,
    document,
    removedStorageKeys,
    stored
  };
}

function extractLink(markup, className, index) {
  const matches = [...markup.matchAll(new RegExp('<a class="' + className + '" href="([^"]+)"([^>]*)>([^<]*)</a>', 'g'))];
  assert.ok(matches[index || 0], 'expected direct link with class ' + className);
  const href = matches[index || 0][1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { url: new URL(href), text: matches[index || 0][3], tag: matches[index || 0][0] };
}

function assertBlackSeaLink(link, slug, referrer) {
  assert.equal(link.url.origin + link.url.pathname, checkoutRoot);
  assert.equal(link.url.searchParams.get('product'), slug);
  assert.equal(link.url.searchParams.get('quantity'), '1');
  assert.equal(link.url.searchParams.get('referrer'), referrer);
  assert.doesNotMatch(link.tag, /target="_blank"/, 'checkout must stay in the same tab for browser Back');
}

function dispatchCheckoutClick(page, link) {
  const encoded = link.tag.match(/data-return-url="([^"]+)"/);
  assert.ok(encoded, 'purchase link exposes its same-place browser-back target');
  const returnURL = encoded[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const anchor = {
    getAttribute(name) { return name === 'data-return-url' ? returnURL : null; },
    closest(selector) { return selector === 'a[data-return-url]' ? this : null; }
  };
  assert.equal(typeof page.document.listeners.click, 'function', 'site updates the current history entry before checkout navigation');
  page.document.listeners.click({ target: anchor, button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false });
  return returnURL;
}

const catalog = renderPage(siteRoot + '?campaign=quiet', 'catalog');
const catalogBuy = extractLink(catalog.markup, 'card-btn');
const catalogReturn = siteRoot + '?campaign=quiet#product-card-tiger';
assertBlackSeaLink(catalogBuy, 'lek', catalogReturn);
assert.equal(catalogBuy.text, 'Buy now');
assert.match(catalog.markup, /id="product-card-tiger"/);
assert.equal(dispatchCheckoutClick(catalog, catalogBuy), catalogReturn);
assert.deepEqual(catalog.historyUpdates, [catalogReturn], 'browser Back keeps the home-page card anchor and query');
assert.equal(catalog.location.hash, '#product-card-tiger');
assert.deepEqual(catalog.removedStorageKeys.sort(), ['tqr-cart-return-v1', 'tqr-cart-v1']);
assert.equal(catalog.stored.has('unrelated'), true, 'legacy cleanup preserves unrelated localStorage keys');

const returnedCatalog = renderPage(siteRoot + '#product-card-tiger', 'catalog');
assert.deepEqual(returnedCatalog.scrolledTo, ['product-card-tiger'], 'return anchor scrolls to the same catalog card after dynamic rendering');

const productUrl = siteRoot + 'product.html?id=tiger';
const product = renderPage(productUrl, 'product');
const productBuy = extractLink(product.markup, 'product-buy');
assertBlackSeaLink(productBuy, 'lek', productUrl + '#product-card-tiger');
assert.match(product.markup, /<div class="product-layout" id="product-card-tiger">/);
assert.equal(dispatchCheckoutClick(product, productBuy), productUrl + '#product-card-tiger');
assert.deepEqual(product.historyUpdates, [productUrl + '#product-card-tiger']);

const relatedBuy = extractLink(product.markup, 'card-btn');
assertBlackSeaLink(relatedBuy, 'ksi', productUrl + '#product-card-butterfly');
assert.equal(dispatchCheckoutClick(product, relatedBuy), productUrl + '#product-card-butterfly');
assert.deepEqual(product.historyUpdates, [productUrl + '#product-card-tiger', productUrl + '#product-card-butterfly']);
const returnedProduct = renderPage(productUrl + '#product-card-tiger', 'product');
assert.deepEqual(returnedProduct.scrolledTo, ['product-card-tiger'], 'return anchor scrolls to the same product detail after dynamic rendering');
const returnedRelatedCard = renderPage(productUrl + '#product-card-butterfly', 'product');
assert.deepEqual(returnedRelatedCard.scrolledTo, ['product-card-butterfly'], 'related-card checkout returns to its source card');

for (const path of htmlFiles) {
  const html = fs.readFileSync(require.resolve(path), 'utf8');
  assert.doesNotMatch(html, /cart-fab|cart-drawer|cart-toggle|cart-clear|assets\/cart-(?:core|ui)\.js/);
  assert.match(html, /assets\/main\.js\?v=24/);
  assert.match(html, /assets\/style\.css\?v=25/);
}
assert.doesNotMatch(mainSource, /TQR_CLOSE_CART|data-cart-add|cart-drawer|cart-toggle/);
assert.doesNotMatch(cssSource, /cart-fab|cart-drawer|cart-count|cart-items|cart-clear|cart-checkout/);

process.stdout.write('PASS direct BlackSea links preserve card-specific return anchors; local cart removed\n');
