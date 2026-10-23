'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');

const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), dataContext);
const products = dataContext.window.TQR_PRODUCTS;

assert.equal(products.length, 5, 'all five product routes are covered');

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
    querySelectorAll() { return []; },
    contains() { return false; }
  };
}

function renderProduct(product) {
  const page = makeElement();
  const document = {
    body: makeElement(),
    title: '',
    listeners: {},
    getElementById(id) { return id === 'product-page' ? page : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const window = {
    TQR_PRODUCTS: products,
    location: new URL('https://eugene55555.github.io/the-quiet-room/product.html?id=' + encodeURIComponent(product.id)),
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
  return page.innerHTML;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

function expectedInline(nodes) {
  return (Array.isArray(nodes) ? nodes : []).map(node => {
    if (!node || typeof node !== 'object') return '';
    if (node.t === 'br') return '<br>';
    const value = typeof node.v === 'string' ? node.v : '';
    if (!value) return '';
    if (node.t === 'strong') return '<strong>' + esc(value) + '</strong>';
    if (node.t === 'em') return '<em>' + esc(value) + '</em>';
    return esc(value);
  }).join('');
}

function expectedDescriptionHTML(product) {
  return product.description.map(block => {
    if (block.type === 'p' || block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      return '<' + block.type + '>' + expectedInline(block.content) + '</' + block.type + '>';
    }
    if (block.type === 'ul' || block.type === 'ol') {
      return '<' + block.type + '>' + (block.items || []).map(item => '<li>' + expectedInline(item) + '</li>').join('') + '</' + block.type + '>';
    }
    return '';
  }).join('');
}

function openingTag(html, className, tag) {
  return html.indexOf('<' + tag + ' class="' + className + '"');
}

function elementEnd(html, openIndex, tag) {
  assert.ok(openIndex >= 0, tag + ' opening tag is present');
  const pattern = new RegExp('</?' + tag + '\\b[^>]*>', 'g');
  pattern.lastIndex = openIndex;
  let depth = 0;
  let match;
  while ((match = pattern.exec(html))) {
    if (match[0].indexOf('</') === 0) depth -= 1;
    else depth += 1;
    if (depth === 0) return pattern.lastIndex;
  }
  return -1;
}

function ruleBody(selector) {
  const clean = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = clean.match(new RegExp('(?:^|\\})\\s*' + escaped + '\\s*\\{([^}]*)\\}'));
  return match ? match[1] : '';
}

let renderedImageTotal = 0;

for (const product of products) {
  const markup = renderProduct(product);
  const images = product.images && product.images.length ? product.images : [product.img];
  renderedImageTotal += images.length;

  const layoutOpen = openingTag(markup, 'product-layout', 'div');
  const layoutEnd = elementEnd(markup, layoutOpen, 'div');
  const infoOpen = openingTag(markup, 'product-info', 'div');
  const infoEnd = elementEnd(markup, infoOpen, 'div');
  const detailsOpen = openingTag(markup, 'product-details', 'section');
  const relatedOpen = markup.indexOf('<section class="product-related">');
  const descOpen = openingTag(markup, 'product-desc', 'div');
  const descEnd = elementEnd(markup, descOpen, 'div');

  assert.ok(layoutOpen >= 0 && layoutEnd > layoutOpen, product.id + ': product layout renders');
  assert.ok(infoOpen > layoutOpen && infoEnd > infoOpen, product.id + ': summary column renders');
  assert.ok(!(descOpen >= infoOpen && descOpen < infoEnd),
    product.id + ': full product description is not constrained inside the right .product-info column');

  const detailsEnd = elementEnd(markup, detailsOpen, 'section');
  assert.ok(detailsOpen >= layoutEnd && detailsEnd > detailsOpen,
    product.id + ': a full-width .product-details section is a sibling immediately after the closing .product-layout');
  assert.ok(relatedOpen >= detailsEnd && relatedOpen >= 0,
    product.id + ': .product-details is before .product-related');
  assert.ok(descOpen > detailsOpen && descEnd <= detailsEnd,
    product.id + ': .product-desc lives inside the full-width .product-details section');

  const descInner = markup.slice(markup.indexOf('>', descOpen) + 1, descEnd - '</div>'.length);
  assert.equal(descInner, expectedDescriptionHTML(product),
    product.id + ': full structured source description markup is preserved exactly');
  assert.doesNotMatch(markup.slice(infoOpen, infoEnd), /class="product-desc"/,
    product.id + ': the right summary column no longer owns .product-desc');

  const featsOpen = markup.indexOf('<ul class="product-feats">', detailsOpen);
  const safeOpen = markup.indexOf('<p class="product-safe">', detailsOpen);
  const checkoutOpen = markup.indexOf('<p class="product-checkout-note">', detailsOpen);
  assert.ok(featsOpen > descOpen && featsOpen < detailsEnd, product.id + ': features follow the description in the detail section');
  assert.ok(safeOpen > featsOpen && safeOpen < detailsEnd, product.id + ': secure-payment note follows the features in the detail section');
  assert.ok(checkoutOpen > safeOpen && checkoutOpen < detailsEnd, product.id + ': checkout note follows the secure-payment note in the detail section');

  const galleryOpen = openingTag(markup, 'product-gallery', 'div');
  const galleryEnd = elementEnd(markup, galleryOpen, 'div');
  const buyRowOpen = openingTag(markup, 'product-buy-row', 'div');
  const buyRowEnd = elementEnd(markup, buyRowOpen, 'div');
  const buyAnchor = markup.indexOf('<a class="product-buy"');
  assert.ok(galleryOpen > layoutOpen && galleryEnd <= buyRowOpen,
    product.id + ': gallery stays before the Buy row');
  assert.ok(buyAnchor > buyRowOpen && buyRowEnd > buyRowOpen,
    product.id + ': Buy button stays directly under the gallery');
  assert.ok(buyRowEnd <= infoOpen,
    product.id + ': Buy button stays in the image column before the summary');

  const thumbCount = (markup.match(/class="product-thumb(?: is-active)?"/g) || []).length;
  assert.equal(thumbCount, images.length,
    product.id + ': every source image is preserved in the gallery');
}

assert.equal(renderedImageTotal, 17, 'all 17 gallery images across the five product routes are preserved');

const detailsRule = ruleBody('.product-details');
assert.ok(detailsRule, 'the full-width detail section has a CSS rule');
assert.match(detailsRule, /max-width\s*:\s*100%/, 'the detail section is not width-constrained');
assert.doesNotMatch(detailsRule, /(?:^|;)\s*width\s*:\s*\d{3,}px/, 'the detail section does not use a fixed desktop width');
assert.doesNotMatch(detailsRule, /margin-left\s*:\s*-|margin-right\s*:\s*-/, 'the detail section cannot create horizontal overflow with negative margins');

const descRule = ruleBody('.product-desc');
assert.ok(descRule, 'the full-width description keeps its existing styling');
assert.match(descRule, /overflow-wrap\s*:\s*anywhere/, 'long unbroken description text can wrap instead of overflowing');
assert.doesNotMatch(descRule, /(?:^|;)\s*width\s*:\s*\d{3,}px/, 'the description does not use a fixed desktop width');

assert.match(cssSource, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-layout\s*\{\s*grid-template-columns\s*:\s*1fr/,
  'mobile keeps a one-column layout with unchanged reading order');

for (const [file, label] of [['../index.html', 'home'], ['../product.html', 'product']]) {
  const html = fs.readFileSync(require.resolve(file), 'utf8');
  assert.match(html, /assets\/main\.js\?v=38/, label + ' loads the cache-busted full-width detail renderer');
  assert.match(html, /assets\/style\.css\?v=36/, label + ' loads the cache-busted full-width detail CSS');
  assert.match(html, /assets\/data\.js\?v=24/, label + ' keeps the unchanged data cache version');
}

process.stdout.write('PASS product descriptions render full-width after the two-column layout with features, payment and checkout notes in order for all five routes\n');
