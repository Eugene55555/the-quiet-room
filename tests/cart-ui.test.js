'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const indexMarkup = fs.readFileSync(require.resolve('../index.html'), 'utf8');
const productDocument = fs.readFileSync(require.resolve('../product.html'), 'utf8');
const source = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');

function makeElement() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    listeners: {},
    attributes: {},
    classList: {
      add() {}, remove() {}, contains() { return false; }, toggle() { return false; }
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] || null; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    contains() { return false; }
  };
}

function renderCatalogCard() {
  const elements = {
    catalog: makeElement(),
    pagination: makeElement(),
    count: makeElement()
  };
  const document = {
    body: makeElement(),
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners = this.listeners || {}; this.listeners[type] = fn; }
  };
  const window = {
    TQR_PRODUCTS: [{
      id: 'tiger', name: 'Baby Tiger', cat: 'Tropical', img: 'assets/tiger.png',
      images: ['assets/tiger.png'], formats: 'PNG + PDF', price: 2.60, slug: 'lek', order: 1
    }],
    TQR_SITE: 'https://eugene55555.github.io/the-quiet-room/',
    location: {
      href: 'https://eugene55555.github.io/the-quiet-room/',
      pathname: '/the-quiet-room/', hash: '', search: ''
    },
    pageYOffset: 0,
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, Date });
  document.listeners.DOMContentLoaded();
  return elements.catalog.innerHTML;
}

function renderProductPage() {
  const elements = { 'product-page': makeElement() };
  const document = {
    body: makeElement(),
    title: '',
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners = this.listeners || {}; this.listeners[type] = fn; }
  };
  const productUrl = 'https://eugene55555.github.io/the-quiet-room/product.html?id=tiger';
  const window = {
    TQR_PRODUCTS: [{
      id: 'tiger', name: 'Baby Tiger', cat: 'Tropical', img: 'assets/tiger.png',
      images: ['assets/tiger.png'], formats: 'PNG + PDF', price: 2.60, slug: 'lek', order: 1
    }],
    TQR_SITE: 'https://eugene55555.github.io/the-quiet-room/',
    location: { href: productUrl, pathname: '/the-quiet-room/product.html', hash: '', search: '?id=tiger' },
    pageYOffset: 0,
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };
  vm.runInNewContext(source, { window, document, URL, URLSearchParams, Date });
  document.listeners.DOMContentLoaded();
  return elements['product-page'].innerHTML;
}

const markup = renderCatalogCard();
assert.match(markup, /data-cart-add="tiger"/);
assert.match(markup, /data-quantity-input/);
process.stdout.write('PASS rendered cards expose add-to-cart and quantity controls\n');

const productMarkup = renderProductPage();
assert.match(productMarkup, /data-cart-add="tiger"/);
assert.match(productMarkup, /data-quantity-input/);
process.stdout.write('PASS product details expose add-to-cart and quantity controls\n');

for (const [name, html] of [['catalog', indexMarkup], ['product page', productDocument]]) {
  assert.match(html, /id="cart-toggle"/);
  assert.match(html, /id="cart-drawer"/);
  assert.match(html, /id="cart-checkout"/);
  assert.match(html, /id="cart-clear"/);
  assert.ok(html.includes('assets/cart-core.js?v=2'));
  assert.ok(html.includes('BlackSea links add one product at a time'));
  assert.ok(html.includes('multi-product checkout is disabled to prevent a partial order'));
  assert.ok(html.includes('aria-describedby="cart-note"'));
  assert.match(html, /assets\/cart-ui\.js\?v=3/);
  assert.match(html, /assets\/style\.css\?v=23/);
  const coreIndex = html.indexOf('assets/cart-core.js');
  const uiIndex = html.indexOf('assets/cart-ui.js');
  const mainIndex = html.indexOf('assets/main.js');
  assert.ok(coreIndex >= 0 && uiIndex > coreIndex && mainIndex > uiIndex, 'cart scripts must load before main.js');
  console.log('PASS ' + name + ' includes the shared cart drawer and ordered cart scripts');
}
