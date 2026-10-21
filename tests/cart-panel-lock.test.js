'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../assets/cart-core.js');
const cartSource = fs.readFileSync(require.resolve('../assets/cart-ui.js'), 'utf8');
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');

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
    querySelectorAll() { return []; },
    focus() {}
  };
}

const ids = [
  'cart-toggle', 'cart-drawer', 'cart-overlay', 'cart-close', 'cart-items',
  'cart-count', 'cart-heading-count', 'cart-item-summary', 'cart-total',
  'cart-status', 'cart-checkout', 'menu-drawer', 'menu-overlay', 'burger',
  'menu-close', 'filter-drawer', 'filter-overlay', 'filter-open', 'filter-close'
];
const elements = Object.fromEntries(ids.map(id => [id, makeElement()]));
const document = {
  body: makeElement(),
  listeners: {},
  getElementById(id) { return elements[id] || null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener(type, fn) { this.listeners[type] = fn; }
};
const window = {
  TQR_PRODUCTS: [],
  TQR_SITE: 'https://eugene55555.github.io/the-quiet-room/',
  TQR_CART_CORE: core,
  location: {
    href: 'https://eugene55555.github.io/the-quiet-room/',
    pathname: '/the-quiet-room/', hash: '', search: ''
  },
  pageYOffset: 0,
  addEventListener() {},
  requestAnimationFrame(fn) { fn(); }
};

vm.runInNewContext(cartSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String });
vm.runInNewContext(mainSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String, Date });
document.listeners.DOMContentLoaded();

function openCart() {
  elements['cart-toggle'].listeners.click();
  assert.equal(elements['cart-drawer'].classList.contains('show'), true);
  assert.equal(document.body.style.overflow, 'hidden');
}

openCart();
elements.burger.listeners.click();
assert.equal(elements['cart-drawer'].classList.contains('show'), false, 'opening the menu closes the cart');
assert.equal(elements['menu-drawer'].classList.contains('show'), true);
assert.equal(document.body.style.overflow, 'hidden', 'menu keeps body scroll locked');
elements['menu-close'].listeners.click();
assert.equal(document.body.style.overflow, '', 'body unlocks only after all panels close');

openCart();
elements['filter-open'].listeners.click();
assert.equal(elements['cart-drawer'].classList.contains('show'), false, 'opening filters closes the cart');
assert.equal(elements['filter-drawer'].classList.contains('show'), true);
assert.equal(document.body.style.overflow, 'hidden', 'filter panel keeps body scroll locked');
elements['filter-close'].listeners.click();
assert.equal(document.body.style.overflow, '', 'body unlocks after the filter panel closes');

process.stdout.write('PASS cart, menu, and filter panels close each other without unlocking body scroll\n');
