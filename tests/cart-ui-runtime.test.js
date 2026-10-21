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
  href: 'https://eugene55555.github.io/the-quiet-room/',
  assign(url) { assigned.push(url); }
};
const window = {
  TQR_PRODUCTS: products,
  TQR_SITE: 'https://eugene55555.github.io/the-quiet-room/',
  TQR_CART_CORE: core,
  location,
  localStorage: storage,
  addEventListener() {}
};

vm.runInNewContext(uiSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String });
assert.equal(elements['cart-clear'].disabled, true, 'clear button starts disabled while cart is empty');

function clickAdd(id, amount) {
  const qtyInput = { value: String(amount) };
  const card = { querySelector(selector) { return selector === '[data-quantity-input]' ? qtyInput : null; } };
  const button = {
    getAttribute(name) {
      return {
        'data-cart-add': id,
        'data-cart-return': 'https://eugene55555.github.io/the-quiet-room/#product-card-' + id
      }[name] || null;
    },
    closest(selector) {
      if (selector === '[data-cart-add]') return this;
      if (selector === '.card') return card;
      return null;
    }
  };
  document.listeners.click({ target: button, preventDefault() {} });
}

clickAdd('tiger', 2);
clickAdd('butterfly', 3);
const cartKey = Object.keys(saved).find(key => key.indexOf('tqr-cart') === 0);
assert.ok(cartKey, 'cart is saved in localStorage');
assert.deepEqual(JSON.parse(saved[cartKey]), { tiger: 2, butterfly: 3 });
assert.equal(elements['cart-toggle'].getAttribute('aria-expanded'), 'true');
assert.equal(elements['cart-count'].textContent, '5');
assert.equal(elements['cart-total'].textContent, '$9.10');
assert.equal(elements['cart-clear'].disabled, false, 'clear button is enabled when cart contains items');

function clickCartAction(kind, id) {
  const button = {
    getAttribute(name) {
      return { 'data-cart-action': kind, 'data-product-id': id }[name] || null;
    },
    closest(selector) { return selector === '[data-cart-action]' ? this : null; }
  };
  document.listeners.click({ target: button, preventDefault() {} });
}

clickCartAction('increase', 'tiger');
assert.deepEqual(JSON.parse(saved[cartKey]), { tiger: 3, butterfly: 3 });
const quantityInput = {
  value: '4',
  getAttribute(name) { return name === 'data-product-id' ? 'tiger' : null; },
  closest(selector) { return selector === '[data-cart-qty]' ? this : null; }
};
document.listeners.change({ target: quantityInput });
assert.deepEqual(JSON.parse(saved[cartKey]), { tiger: 4, butterfly: 3 });
assert.equal(elements['cart-total'].textContent, '$14.30');

const checkout = elements['cart-checkout'];
checkout.listeners.click({ preventDefault() {} });
assert.equal(assigned.length, 1);
const first = new URL(assigned[0]);
const second = new URL(first.searchParams.get('referrer'));
assert.equal(first.searchParams.get('product'), 'lek');
assert.equal(first.searchParams.get('quantity'), '4');
assert.equal(second.searchParams.get('product'), 'ksi');
assert.equal(second.searchParams.get('quantity'), '3');

clickCartAction('remove', 'butterfly');
assert.deepEqual(JSON.parse(saved[cartKey]), { tiger: 4 });
assert.equal(elements['cart-count'].textContent, '4');
assert.equal(elements['cart-total'].textContent, '$10.40');

elements['cart-clear'].listeners.click({ preventDefault() {} });
assert.deepEqual(JSON.parse(saved[cartKey]), {}, 'clear button empties persisted local cart');
assert.equal(elements['cart-count'].textContent, '0');
assert.equal(elements['cart-total'].textContent, '$0.00');
assert.equal(elements['cart-checkout'].disabled, true);
assert.equal(elements['cart-clear'].disabled, true);
assert.match(elements['cart-items'].innerHTML, /Your shopping bag is empty/);
assert.equal(elements['cart-status'].textContent, 'Shopping bag cleared.');
process.stdout.write('PASS cart persists quantities, totals correctly, and creates a two-product BlackSea handoff\n');
