'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');

const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), dataContext);
const products = dataContext.window.TQR_PRODUCTS;

assert.equal(products.length, 10, 'all ten product routes are covered');

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
  function blockHTML(block) {
    if (block.type === 'p' || block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      return '<' + block.type + '>' + expectedInline(block.content) + '</' + block.type + '>';
    }
    if (block.type === 'ul' || block.type === 'ol') {
      return '<' + block.type + '>' + (block.items || []).map(item => '<li>' + expectedInline(item) + '</li>').join('') + '</' + block.type + '>';
    }
    return '';
  }
  let html = '';
  let sectionIndex = 0;
  let inSection = false;
  for (const block of product.description) {
    if (block.type === 'h2') {
      if (inSection) html += '</div></details>';
      sectionIndex += 1;
      html += '<details class="product-desc-section"' + (sectionIndex === 1 ? ' open' : '') + '>'
        + '<summary><h2>' + expectedInline(block.content) + '</h2></summary>'
        + '<div class="product-desc-section-body">';
      inSection = true;
    } else {
      html += blockHTML(block);
    }
  }
  if (inSection) html += '</div></details>';
  return html;
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
  const visualOpen = openingTag(markup, 'product-visual', 'div');
  const infoOpen = openingTag(markup, 'product-info', 'div');
  const infoEnd = elementEnd(markup, infoOpen, 'div');
  const detailsOpen = openingTag(markup, 'product-details', 'section');
  const detailsEnd = elementEnd(markup, detailsOpen, 'section');
  const relatedOpen = markup.indexOf('<section class="product-related">');
  const descOpen = openingTag(markup, 'product-desc', 'div');
  const descEnd = elementEnd(markup, descOpen, 'div');
  const buyRowOpen = openingTag(markup, 'product-buy-row', 'div');
  const buyRowEnd = elementEnd(markup, buyRowOpen, 'div');
  const buyAnchor = markup.indexOf('<a class="product-buy"');

  assert.ok(layoutOpen >= 0 && layoutEnd > layoutOpen, product.id + ': product layout renders');
  assert.ok(infoOpen > layoutOpen && infoEnd > infoOpen && infoEnd <= layoutEnd,
    product.id + ': information column stays inside the two-column product layout');
  assert.ok(buyRowOpen > infoOpen && buyAnchor > buyRowOpen && buyRowEnd > buyRowOpen && buyRowEnd <= detailsOpen,
    product.id + ': primary Buy button is in the right information column before the description');
  assert.ok(detailsOpen >= buyRowEnd && detailsEnd > detailsOpen && detailsEnd <= infoEnd,
    product.id + ': full product details are nested inside the right information column');
  assert.ok(relatedOpen >= layoutEnd,
    product.id + ': related products follow the complete two-column product layout');
  assert.ok(descOpen > detailsOpen && descEnd <= detailsEnd && descEnd <= infoEnd,
    product.id + ': .product-desc lives inside the right-column .product-details section');

  const descInner = markup.slice(markup.indexOf('>', descOpen) + 1, descEnd - '</div>'.length);
  assert.equal(descInner, expectedDescriptionHTML(product),
    product.id + ': full structured source description markup is preserved exactly');
  const sourceH2Count = product.description.filter(block => block.type === 'h2').length;
  const accordionAttributes = [...descInner.matchAll(/<details class="product-desc-section"( open)?>/g)].map(match => match[1] || '');
  assert.equal(accordionAttributes.length, sourceH2Count,
    product.id + ': each source description section becomes one native accordion');
  assert.equal((descInner.match(/<summary><h2>/g) || []).length, sourceH2Count,
    product.id + ': every accordion summary retains its source heading');
  if (sourceH2Count > 0) {
    assert.equal(accordionAttributes[0], ' open', product.id + ': the first description section is expanded by default');
    assert.ok(accordionAttributes.slice(1).every(attribute => attribute === ''),
      product.id + ': remaining description sections start collapsed');
  }

  const featsOpen = markup.indexOf('<ul class="product-feats">', detailsOpen);
  const safeOpen = markup.indexOf('<p class="product-safe">', detailsOpen);
  const checkoutOpen = markup.indexOf('<p class="product-checkout-note">', detailsOpen);
  assert.ok(featsOpen > descOpen && featsOpen < detailsEnd, product.id + ': features follow the description in the detail section');
  assert.ok(safeOpen > featsOpen && safeOpen < detailsEnd, product.id + ': secure-payment note follows the features in the detail section');
  assert.ok(checkoutOpen > safeOpen && checkoutOpen < detailsEnd, product.id + ': checkout note follows the secure-payment note in the detail section');

  const galleryOpen = openingTag(markup, 'product-gallery', 'div');
  const galleryEnd = elementEnd(markup, galleryOpen, 'div');
  assert.ok(galleryOpen > visualOpen && galleryEnd < infoOpen,
    product.id + ': gallery stays in the left image column, separate from the Buy row');

  const thumbCount = (markup.match(/class="product-thumb(?: is-active)?"/g) || []).length;
  assert.equal(thumbCount, images.length,
    product.id + ': every source image is preserved in the gallery');
}

assert.equal(renderedImageTotal, 38, 'all 38 gallery images across the ten product routes are preserved');

const detailsRule = ruleBody('.product-details');
assert.ok(detailsRule, 'the right-column detail section has a CSS rule');
assert.match(detailsRule, /max-width\s*:\s*100%/, 'the detail section is not width-constrained');
assert.doesNotMatch(detailsRule, /(?:^|;)\s*width\s*:\s*\d{3,}px/, 'the detail section does not use a fixed desktop width');
assert.doesNotMatch(detailsRule, /margin-left\s*:\s*-|margin-right\s*:\s*-/, 'the detail section cannot create horizontal overflow with negative margins');

const descRule = ruleBody('.product-desc');
assert.ok(descRule, 'the full-width description keeps its existing styling');
assert.match(descRule, /overflow-wrap\s*:\s*anywhere/, 'long unbroken description text can wrap instead of overflowing');
assert.doesNotMatch(descRule, /(?:^|;)\s*width\s*:\s*\d{3,}px/, 'the description does not use a fixed desktop width');
assert.match(cssSource, /\.product-desc-section\s*>\s*summary\s*\{[^}]*cursor\s*:\s*pointer/,
  'native description accordions expose an interactive summary');
assert.match(cssSource, /\.product-desc-section\s*>\s*summary::after/,
  'description accordions show a visible disclosure indicator');

assert.match(cssSource, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-layout\s*\{\s*grid-template-columns\s*:\s*1fr/,
  'mobile keeps a one-column layout with unchanged reading order');

for (const [file, label] of [['../index.html', 'home'], ['../product.html', 'product']]) {
  const html = fs.readFileSync(require.resolve(file), 'utf8');
  assert.match(html, /assets\/main\.js\?v=40/, label + ' loads the cache-busted right-column detail renderer');
  assert.match(html, /assets\/style\.css\?v=38/, label + ' loads the cache-busted desktop layout CSS');
  assert.match(html, /assets\/data\.js\?v=25/, label + ' loads the updated catalog data');
}

process.stdout.write('PASS product descriptions render in the information column with features, payment and checkout notes in order for all ten routes\n');
