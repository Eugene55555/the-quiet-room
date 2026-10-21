'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const core = require('../assets/cart-core.js');
const uiSource = fs.readFileSync(require.resolve('../assets/cart-ui.js'), 'utf8');

function makeElement() {
  const classes = new Set();
  return {
    listeners: {}, attributes: {}, style: {}, innerHTML: '', textContent: '', value: '',
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        const shouldAdd = force === undefined ? !classes.has(name) : Boolean(force);
        if (shouldAdd) classes.add(name); else classes.delete(name);
        return shouldAdd;
      }
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] || null; },
    querySelector() { return null; },
    focus() { this.focused = true; }
  };
}

const products = [
  { id: 'tiger', slug: 'lek', name: 'Baby Tiger', cat: 'Tropical', img: 'assets/tiger.png', price: 2.60 },
  { id: 'butterfly', slug: 'ksi', name: 'Golden Butterfly Cat', cat: 'Butterfly', img: 'assets/butterfly.png', price: 1.30 }
];
const siteUrl = 'https://eugene55555.github.io/the-quiet-room/';
const elementIds = [
  'cart-toggle', 'cart-drawer', 'cart-overlay', 'cart-close', 'cart-items',
  'cart-count', 'cart-heading-count', 'cart-item-summary', 'cart-total',
  'cart-note', 'cart-status', 'cart-checkout', 'cart-clear'
];
const elements = Object.fromEntries(elementIds.map(id => [id, makeElement()]));
const saved = {};
const assigned = [];
const storage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : null; },
  setItem(key, value) { saved[key] = String(value); }
};
const document = {
  body: makeElement(),
  listeners: {},
  getElementById(id) { return elements[id] || null; },
  addEventListener(type, fn) { this.listeners[type] = fn; }
};
const location = {
  href: siteUrl,
  assign(url) { assigned.push(url); }
};
const window = {
  TQR_PRODUCTS: products,
  TQR_SITE: siteUrl,
  TQR_CART_CORE: core,
  location,
  localStorage: storage,
  addEventListener() {}
};

vm.runInNewContext(uiSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String });
assert.equal(elements['cart-clear'].disabled, true, 'clear button starts disabled while cart is empty');

const legacyCartKey = 'tqr-cart-v1';
saved[legacyCartKey] = JSON.stringify({ tiger: 4 });
vm.runInNewContext(uiSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String });
assert.deepEqual(JSON.parse(saved[legacyCartKey]), { tiger: true }, 'legacy quantities are persisted as one copy of the design');
saved[legacyCartKey] = JSON.stringify({ tiger: { toString: null, valueOf: null }, butterfly: 2 });
vm.runInNewContext(uiSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String });
assert.deepEqual(JSON.parse(saved[legacyCartKey]), { butterfly: true }, 'corrupt cart values are discarded without breaking cart initialization');

function clickAdd(id) {
  const button = {
    getAttribute(name) {
      return {
        'data-cart-add': id,
        'data-cart-return': siteUrl + '#product-card-' + id
      }[name] || null;
    },
    closest(selector) {
      if (selector === '[data-cart-add]') return this;
      if (selector === '.card') return { querySelector() { return null; } };
      return null;
    }
  };
  document.listeners.click({ target: button, preventDefault() {} });
}

clickAdd('tiger');
clickAdd('butterfly');
clickAdd('tiger');
const cartKey = Object.keys(saved).find(key => key.indexOf('tqr-cart') === 0);
assert.ok(cartKey, 'cart is saved in localStorage');
assert.deepEqual(JSON.parse(saved[cartKey]), { tiger: true, butterfly: true });
assert.equal(elements['cart-toggle'].getAttribute('aria-expanded'), 'true');
assert.equal(elements['cart-count'].textContent, '2');
assert.equal(elements['cart-item-summary'].textContent, '2 products');
assert.equal(elements['cart-total'].textContent, '$3.90');
assert.equal(elements['cart-clear'].disabled, false, 'clear button is enabled when cart contains designs');
assert.doesNotMatch(elements['cart-items'].innerHTML, /quantity|data-cart-qty|type="number"| each/);
assert.equal(elements['cart-checkout'].disabled, true, 'checkout remains blocked for multiple designs');
assert.match(elements['cart-note'].textContent, /Multi-product checkout is disabled/);
assert.match(elements['cart-status'].textContent, /already in your shopping bag/);
elements['cart-checkout'].listeners.click({ preventDefault() {} });
assert.equal(assigned.length, 0, 'multiple designs are not sent as a partial checkout');
assert.match(elements['cart-status'].textContent, /No items were sent/);

function clickCartAction(kind, id) {
  const button = {
    getAttribute(name) {
      return { 'data-cart-action': kind, 'data-product-id': id }[name] || null;
    },
    closest(selector) { return selector === '[data-cart-action]' ? this : null; }
  };
  document.listeners.click({ target: button, preventDefault() {} });
}

clickCartAction('remove', 'butterfly');
assert.deepEqual(JSON.parse(saved[cartKey]), { tiger: true });
assert.equal(elements['cart-count'].textContent, '1');
assert.equal(elements['cart-total'].textContent, '$2.60');
assert.equal(elements['cart-checkout'].disabled, false, 'a single design can be checked out');
assert.match(elements['cart-note'].textContent, /Removing a product in BlackSea does not remove it here/);
elements['cart-checkout'].listeners.click({ preventDefault() {} });
assert.equal(assigned.length, 1);
const singleProduct = new URL(assigned[0]);
assert.equal(singleProduct.searchParams.get('product'), 'lek');
assert.equal(singleProduct.searchParams.has('quantity'), false);
assert.equal(singleProduct.searchParams.has('products'), false);

 elements['cart-clear'].listeners.click({ preventDefault() {} });
assert.deepEqual(JSON.parse(saved[cartKey]), {}, 'clear button empties persisted local cart');
assert.equal(elements['cart-count'].textContent, '0');
assert.equal(elements['cart-total'].textContent, '$0.00');
assert.equal(elements['cart-checkout'].disabled, true);
assert.equal(elements['cart-clear'].disabled, true);
assert.match(elements['cart-items'].innerHTML, /Your shopping bag is empty/);
assert.equal(elements['cart-status'].textContent, 'Shopping bag cleared.');
process.stdout.write('PASS one-copy local cart removes quantity controls and blocks partial multi-design checkout\n');
