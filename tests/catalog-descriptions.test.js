'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const dataSource = fs.readFileSync(require.resolve('../assets/data.js'), 'utf8');
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');

const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext);
const products = dataContext.window.TQR_PRODUCTS;

function makeElement() {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    listeners: {},
    attributes: {},
    classList: {
      add() {},
      remove() {},
      contains() { return false; },
      toggle() { return false; }
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

function renderCatalog() {
  const elements = {
    catalog: makeElement(),
    pagination: makeElement(),
    count: makeElement()
  };
  const document = {
    body: makeElement(),
    title: '',
    listeners: {},
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const window = {
    TQR_PRODUCTS: products,
    location: new URL('https://eugene55555.github.io/the-quiet-room/'),
    pageYOffset: 0,
    localStorage: { removeItem() {} },
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };

  vm.runInNewContext(mainSource, {
    window,
    document,
    URL,
    URLSearchParams,
    Date,
    Number,
    Math,
    Object,
    Array,
    String
  });
  document.listeners.DOMContentLoaded();
  return elements.catalog.innerHTML;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

const markup = renderCatalog();
const cards = {};
for (const match of markup.matchAll(/<article class="card" id="product-card-([^"]+)">([\s\S]*?)<\/article>/g)) {
  cards[match[1]] = match[2];
}

assert.equal(products.length, 5, 'catalog has five source products');
assert.equal(Object.keys(cards).length, 5, 'all five product cards render');

for (const product of products) {
  assert.ok(Array.isArray(product.description) && product.description.length > 0,
    product.id + ' has a source description');
  const card = cards[product.id];
  assert.ok(card, product.id + ' card is rendered');

  const description = card.match(/<div class="card-desc">([\s\S]*?)<\/div>/);
  assert.ok(description, product.id + ' card renders a description block');

  for (const paragraph of product.description) {
    const expected = '<p>' + esc(paragraph) + '</p>';
    assert.ok(description[1].includes(expected),
      product.id + ' card contains its full description paragraph: ' + paragraph.slice(0, 48) + '…');
  }

  for (const other of products) {
    if (other.id === product.id) continue;
    for (const paragraph of other.description) {
      assert.equal(card.includes('<p>' + esc(paragraph) + '</p>'), false,
        product.id + ' card must not contain text from ' + other.id);
    }
  }
}

const descriptionRules = [...cssSource.matchAll(/\.card-desc[^{]*\{([^}]*)\}/g)];
assert.ok(descriptionRules.length > 0, 'catalog description styling exists');
for (const rule of descriptionRules) {
  const body = rule[1];
  assert.doesNotMatch(body, /display\s*:\s*none/i, 'description is not hidden with display:none');
  assert.doesNotMatch(body, /visibility\s*:\s*hidden/i, 'description is not hidden with visibility:hidden');
  assert.doesNotMatch(body, /max-height\s*:/i, 'description is not clamped by max-height');
  assert.doesNotMatch(body, /overflow\s*:\s*hidden/i, 'description is not clipped by overflow:hidden');
  assert.doesNotMatch(body, /(?:-webkit-)?line-clamp\s*:/i, 'description is not truncated with line-clamp');
}

process.stdout.write('PASS each catalog card renders its own complete product description\n');
