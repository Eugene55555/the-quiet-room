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

function blockText(block) {
  const inlineText = nodes => (Array.isArray(nodes) ? nodes : [])
    .map(node => node && (node.t === 'br' ? ' ' : node.v))
    .filter(Boolean)
    .join('');
  if (block && Array.isArray(block.items)) {
    return block.items.map(inlineText).join(' ');
  }
  return block ? inlineText(block.content) : '';
}

const markup = renderCatalog();
const cards = {};
for (const match of markup.matchAll(/<article class="card" id="product-card-([^"]+)">([\s\S]*?)<\/article>/g)) {
  cards[match[1]] = match[2];
}

assert.equal(products.length, 5, 'catalog has five source products');
assert.equal(Object.keys(cards).length, 5, 'all five product cards render');

for (const product of products) {
  assert.equal(typeof product.summary, 'string', product.id + ' has a summary');
  const summary = product.summary.trim();
  assert.ok(summary.length > 0 && summary.length <= 120,
    product.id + ' summary is a short subtitle');
  assert.doesNotMatch(summary, /\n/, product.id + ' summary is a single paragraph');

  const fullText = product.description.map(blockText).join(' ');
  assert.notEqual(summary, fullText, product.id + ' summary is not the full description');
  assert.ok(fullText.length > summary.length * 2,
    product.id + ' summary is clearly shorter than the detail description');

  const images = Array.isArray(product.images) && product.images.length ? product.images : [product.img];
  assert.ok(images.length > 0, product.id + ' has source images');
  const card = cards[product.id];
  assert.ok(card, product.id + ' card is rendered');
  const cardImages = [...card.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(cardImages, Array.from(images, esc), product.id + ' card shows all of its source images in order');
  if (images.length > 1) {
    assert.equal((card.match(/class="card-dot(?: is-active)?"/g) || []).length, images.length,
      product.id + ' card has one gallery indicator per image');
    assert.match(card, /class="card-dot is-active"/, product.id + ' card starts with its first indicator active');
  } else {
    assert.doesNotMatch(card, /card-dots|card-dot/, product.id + ' single-image card has no gallery indicators');
  }
  const descriptions = [...card.matchAll(/<p class="card-desc">([\s\S]*?)<\/p>/g)];
  assert.equal(descriptions.length, 1, product.id + ' card renders exactly one summary paragraph');
  assert.equal(descriptions[0][1], esc(summary), product.id + ' card renders its own summary');
  assert.doesNotMatch(card, /<div class="card-desc">/, product.id + ' card does not render a full description block');
  assert.doesNotMatch(card, /<h[1-3]>|<ul>|<ol>|<li>|<strong>|<em>|<br>/,
    product.id + ' card contains no rich detail markup');

  const cardWithoutTitle = card
    .replace(/<a class="card-title"[^>]*>[\s\S]*?<\/a>/, '')
    .replace(/\salt="[^"]*"/g, '');
  for (const block of product.description) {
    const text = blockText(block);
    if (text.length < 30) continue;
    assert.equal(cardWithoutTitle.includes(esc(text)), false,
      product.id + ' card does not return the full description text');
  }
}

const descriptionRules = [...cssSource.matchAll(/\.card-desc[^{]*\{([^}]*)\}/g)];
assert.ok(descriptionRules.length > 0, 'catalog subtitle styling exists');
for (const rule of descriptionRules) {
  const body = rule[1];
  assert.doesNotMatch(body, /display\s*:\s*none/i, 'subtitle is not hidden with display:none');
  assert.doesNotMatch(body, /visibility\s*:\s*hidden/i, 'subtitle is not hidden with visibility:hidden');
  assert.doesNotMatch(body, /max-height\s*:/i, 'subtitle is not clamped by max-height');
  assert.doesNotMatch(body, /overflow\s*:\s*hidden/i, 'subtitle is not clipped by overflow:hidden');
  assert.doesNotMatch(body, /(?:-webkit-)?line-clamp\s*:/i, 'subtitle is not truncated with line-clamp');
}

process.stdout.write('PASS catalog cards show only short individual summaries\n');
