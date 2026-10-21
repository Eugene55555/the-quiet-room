'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../assets/cart-core.js');
const uiSource = fs.readFileSync(require.resolve('../assets/cart-ui.js'), 'utf8');

for (const page of ['../index.html', '../product.html']) {
  const html = fs.readFileSync(require.resolve(page), 'utf8');
  assert.match(html, /<aside class="cart-drawer"[^>]*\binert\b/);
}

const document = {
  activeElement: null,
  body: null,
  listeners: {},
  getElementById(id) { return elements[id] || null; },
  addEventListener(type, fn) {
    (this.listeners[type] || (this.listeners[type] = [])).push(fn);
  }
};

function makeElement() {
  const classes = new Set();
  return {
    listeners: {}, attributes: {}, style: {}, innerHTML: '', textContent: '', value: '', inert: false,
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
    contains() { return false; },
    focus() { document.activeElement = this; }
  };
}

const ids = [
  'cart-toggle', 'cart-drawer', 'cart-overlay', 'cart-close', 'cart-items',
  'cart-count', 'cart-heading-count', 'cart-item-summary', 'cart-total',
  'cart-status', 'cart-checkout'
];
const elements = Object.fromEntries(ids.map(id => [id, makeElement()]));
const extraLink = makeElement();
const focusable = [elements['cart-close'], extraLink];
elements['cart-drawer'].inert = true;
elements['cart-drawer'].querySelectorAll = () => focusable;
elements['cart-drawer'].contains = target => focusable.includes(target);
document.body = makeElement();
document.activeElement = document.body;

const window = {
  TQR_PRODUCTS: [{ id: 'baby-tiger', name: 'Baby Tiger', price: 2.6, slug: 'lek', img: 'assets/img/baby-tiger.jpg' }],
  TQR_SITE: 'https://eugene55555.github.io/the-quiet-room/',
  TQR_CART_CORE: core,
  location: { href: 'https://eugene55555.github.io/the-quiet-room/' },
  localStorage: { getItem() { return null; }, setItem() {} },
  addEventListener() {}
};

vm.runInNewContext(uiSource, { window, document, URL, URLSearchParams, Number, Math, Object, Array, String });

elements['cart-toggle'].listeners.click();
assert.equal(elements['cart-drawer'].inert, false, 'open cart is removed from inert state');
assert.equal(document.activeElement, elements['cart-close'], 'opening the cart focuses the dialog');

function pressTab(shiftKey) {
  let prevented = false;
  for (const listener of document.listeners.keydown || []) {
    listener({ key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
  }
  return prevented;
}

document.activeElement = extraLink;
assert.equal(pressTab(false), true, 'Tab from the last control is trapped');
assert.equal(document.activeElement, elements['cart-close']);

document.activeElement = elements['cart-close'];
assert.equal(pressTab(true), true, 'Shift+Tab from the first control is trapped');
assert.equal(document.activeElement, extraLink);

elements['cart-close'].listeners.click();
assert.equal(elements['cart-drawer'].inert, true, 'closed cart is inert');
assert.equal(elements['cart-drawer'].getAttribute('aria-hidden'), 'true');
assert.equal(document.activeElement, elements['cart-toggle'], 'closing a cart opened by the toggle restores focus there');

const addButton = makeElement();
const productCard = makeElement();
addButton.setAttribute('data-cart-add', 'baby-tiger');
addButton.setAttribute('data-cart-return', window.TQR_SITE);
addButton.closest = selector => selector === '[data-cart-add]' ? addButton : selector === '.card' ? productCard : null;
document.activeElement = addButton;
for (const listener of document.listeners.click || []) listener({ target: addButton, preventDefault() {} });
assert.equal(document.activeElement, elements['cart-close'], 'adding a product opens and focuses the cart dialog');
elements['cart-close'].listeners.click();
assert.equal(document.activeElement, addButton, 'closing restores focus to the add-to-cart button that opened the dialog');

process.stdout.write('PASS cart dialog hides from Tab when closed and traps/restores focus to its opener\n');
