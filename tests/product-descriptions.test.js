'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = path.join(__dirname, '..');

const dataSource = fs.readFileSync(require.resolve('../assets/data.js'), 'utf8');
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');

const dataContext = { window: {} };
vm.runInNewContext(dataSource, dataContext);
const products = dataContext.window.TQR_PRODUCTS;

const expected = {
  'white-wolf': { h1: 1, h2: 6, p: 14, ul: 3, li: 16, strong: 14, em: 2, br: 0, h3: 0, ol: 0 },
  'baby-tiger': { h1: 1, h2: 6, p: 16, ul: 3, li: 20, strong: 16, em: 2, br: 0, h3: 0, ol: 0 },
  'golden-butterfly-cat': { h1: 1, h2: 6, p: 19, ul: 2, li: 12, strong: 15, em: 1, br: 0, h3: 0, ol: 0 },
  'enchanted-rainbow-cat': { h1: 1, h2: 0, p: 15, ul: 1, li: 7, strong: 10, em: 2, br: 3, h3: 0, ol: 0 },
  'cat-tree-dreams': { h1: 1, h2: 6, p: 16, ul: 3, li: 18, strong: 15, em: 2, br: 0, h3: 0, ol: 0 }
};

const expectedImages = {
  'white-wolf': [
    ['assets/img/white-wolf.png', '7d2c5911c574a9756c0fe070e98f9e7692cda02af87d93c3405c4aed42d58661'],
    ['assets/img/white-wolf-2.jpg', '658d13e504722b53ebd2dc5a4d355dbd1d1e6e0a0ee9b0f3cdd0dea9884b815b'],
    ['assets/img/white-wolf-3.jpg', '3cd9935387c0fa3841486169cd4186f4c686114128d80e7d54eddc0ab6d2aec6'],
    ['assets/img/white-wolf-4.jpg', '5b3d31ede9d3d56b28522b2685baad215e3d60b73ac07c838d7b7740a377afc6']
  ],
  'baby-tiger': [
    ['assets/img/baby-tiger.png', '3d804aeb9107c8d4bb5e7604a85708c1494d98bba33221371a1589641bffba25'],
    ['assets/img/baby-tiger-2.jpg', '4fdff020cad7db2d06dafe9968ae40c267679ac6413ae0d965a545e9c1d92d00'],
    ['assets/img/baby-tiger-3.jpg', 'b574e8e333203c9948422cd6cebe440ef2cbaf45a6fab62d82c75bd84cbe3b8c'],
    ['assets/img/baby-tiger-4.jpg', 'cb5455f21aba98a6b95130ff3be43c11063ac329bb2f196a562c2cc7191a828a']
  ],
  'golden-butterfly-cat': [
    ['assets/img/golden-butterfly-cat.png', '5e2ba781e1a0324813c43260ee8097665519afa8d72447c1bafb2169221c9099'],
    ['assets/img/golden-butterfly-cat-2.jpg', 'dee06a3e81db4d4404cefe8aca4832b6ede37280d1441afefa52429fc44ba0f1'],
    ['assets/img/golden-butterfly-cat-3.jpg', '0577bfeb48ccddb3cde4edc06b8056e50ca68e7da90093278ce1d2f50e360660']
  ],
  'enchanted-rainbow-cat': [
    ['assets/img/enchanted-rainbow-cat.png', 'ae72581a5b47fd524931776a1f05b5bf6d535c1c436386f725b308c6bb1e6de0'],
    ['assets/img/enchanted-rainbow-cat-2.jpg', 'ccb0dc10cf49f5cef2558fad13c537f69c130b158699af5fecde0458d69f5216'],
    ['assets/img/enchanted-rainbow-cat-3.jpg', 'dff3d43e30e2e17bdb67447575dfd9432af95bca8358c4aa81c55b597e16393c']
  ],
  'cat-tree-dreams': [
    ['assets/img/cat-tree-dreams.jpg', 'ef03ec0a0fdb3cc9e7daedf6398fcfefaf428c7cf648e55d079755a1bed5438b'],
    ['assets/img/cat-tree-dreams-2.jpg', '742bfa716e571d5186532727e86294d20565064ba665127680d1f283754bfa6d'],
    ['assets/img/cat-tree-dreams-3.jpg', '64a81af1b69726443470abb51222d542bba1074ae9673b5b4744f85bd41394d9']
  ]
};

const sourceSignals = {
  'white-wolf': ['✨ Design Highlights', '👕 Suggested Applications', '📐 Digital File Specifications', '⚠️ IMPORTANT — DIGITAL PRODUCT ONLY', '💎 The Inspiration Behind the Design', 'Arctic Spirit — The untamed beauty of the wild.'],
  'baby-tiger': ['✨ Design Highlights', '👕 Suggested Applications', '📐 Digital File Specifications', '⚠️ IMPORTANT — DIGITAL PRODUCT ONLY', '💫 The Inspiration Behind the Design', 'Wild at heart. Beautiful by nature.'],
  'golden-butterfly-cat': ['✨ Design Highlights', '👕 Perfect For', '🎨 Art Style & Inspiration', '💫 The Story Behind the Design', 'Product Details', 'Ideal For: Cat lovers, fans of elegant aesthetics, golden accents, and distinctive artistic designs.'],
  'enchanted-rainbow-cat': ['✨ Design Highlights', '👕 Perfect For', '🎨 Style & Inspiration', '💫 The Story Behind the Design', 'Make your style magical. Wear a little wonder.'],
  'cat-tree-dreams': ['✨ Design Highlights', '👕 Suggested Applications', '📐 Digital File Specifications', '⚠️ IMPORTANT — DIGITAL PRODUCT ONLY', '💫 The Inspiration Behind the Design', 'A little magic. A world of color. An extraordinary spirit.']
};

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

function renderProduct(id, list) {
  const page = makeElement();
  const document = {
    body: makeElement(),
    title: '',
    listeners: {},
    getElementById(elementId) { return elementId === 'product-page' ? page : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const window = {
    TQR_PRODUCTS: list,
    location: new URL('https://eugene55555.github.io/the-quiet-room/product.html?id=' + encodeURIComponent(id)),
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

function visibleText(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function inlineText(nodes) {
  return (Array.isArray(nodes) ? nodes : [])
    .map(node => node && (node.t === 'br' ? ' ' : node.v))
    .filter(Boolean)
    .join('');
}

function blockTexts(blocks) {
  return blocks.map(block => Array.isArray(block.items)
    ? block.items.map(inlineText).join(' ')
    : inlineText(block.content));
}

function counts(blocks) {
  const result = { h1: 0, h2: 0, h3: 0, p: 0, ul: 0, ol: 0, li: 0, strong: 0, em: 0, br: 0 };
  for (const block of blocks) {
    if (result[block.type] !== undefined) result[block.type] += 1;
    const walk = nodes => (Array.isArray(nodes) ? nodes : []).forEach(node => {
      if (node && result[node.t] !== undefined) result[node.t] += 1;
    });
    if (Array.isArray(block.items)) {
      result.li += block.items.length;
      block.items.forEach(walk);
    } else {
      walk(block.content);
    }
  }
  return result;
}

assert.equal(products.length, 5, 'catalog has five source products');

for (const product of products) {
  assert.ok(Array.isArray(product.description) && product.description.length > 0,
    product.id + ' has a structured description');
  assert.equal(typeof product.description[0], 'object', product.id + ' description is structured, not plain strings');
  for (const block of product.description) {
    assert.ok(['h1', 'h2', 'h3', 'p', 'ul', 'ol'].includes(block.type),
      product.id + ' description uses only allowed block types');
    const nodes = Array.isArray(block.items) ? block.items.flat() : block.content;
    for (const node of nodes || []) {
      assert.ok(['text', 'strong', 'em', 'br'].includes(node.t),
        product.id + ' description inline nodes use only text, strong, em, br');
      if (node.t !== 'br') assert.equal(typeof node.v, 'string', product.id + ' inline node has text');
    }
  }

  assert.deepEqual(counts(product.description), expected[product.id],
    product.id + ' description preserves the full source structure');
  const texts = blockTexts(product.description);
  const allText = texts.join(' ');
  for (const signal of sourceSignals[product.id]) {
    assert.ok(allText.includes(signal), product.id + ' description includes source text: ' + signal.slice(0, 40));
  }

  const gallery = expectedImages[product.id];
  assert.deepEqual(JSON.parse(JSON.stringify(product.images)), gallery.map(item => item[0]),
    product.id + ' keeps every source image in source order');
  assert.equal(product.img, gallery[0][0], product.id + ' uses the first source image as its cover');
  for (const [asset, hash] of gallery) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(siteRoot, asset))).digest('hex');
    assert.equal(actual, hash, product.id + ' image bytes match the source asset ' + asset);
  }

  const markup = renderProduct(product.id, products);
  const detailMarkup = markup.split('<section class="product-related">')[0];
  assert.match(detailMarkup, new RegExp('<img id="product-main-image"[^>]*src="' + gallery[0][0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"'),
    product.id + ' detail page opens on the first source image');
  const thumbSources = [...detailMarkup.matchAll(/<button[^>]*class="product-thumb[^"]*"[^>]*>[\s\S]*?<img src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(thumbSources, gallery.map(item => item[0]),
    product.id + ' detail page exposes every source image as a thumbnail');
  assert.equal((detailMarkup.match(/class="product-dot(?: is-active)?"/g) || []).length, gallery.length,
    product.id + ' detail page has one gallery dot per source image');
  assert.match(detailMarkup, new RegExp('data-gallery-count="' + gallery.length + '"'),
    product.id + ' gallery count matches the source image count');
  const description = markup.match(/<div class="product-desc">([\s\S]*?)<\/div>/);
  assert.ok(description, product.id + ' detail page renders a description block');
  const section = description[1];

  assert.equal((section.match(/<h1>/g) || []).length, expected[product.id].h1,
    product.id + ' detail page renders source h1');
  assert.equal((section.match(/<h2>/g) || []).length, expected[product.id].h2,
    product.id + ' detail page renders source h2 headings');
  assert.equal((section.match(/<p>/g) || []).length, expected[product.id].p,
    product.id + ' detail page renders every source paragraph');
  assert.equal((section.match(/<ul>/g) || []).length, expected[product.id].ul,
    product.id + ' detail page renders every source list');
  assert.equal((section.match(/<li>/g) || []).length, expected[product.id].li,
    product.id + ' detail page renders every source list item');
  assert.equal((section.match(/<strong>/g) || []).length, expected[product.id].strong,
    product.id + ' detail page renders source bold text');
  assert.equal((section.match(/<em>/g) || []).length, expected[product.id].em,
    product.id + ' detail page renders source italic text');
  assert.equal((section.match(/<br>/g) || []).length, expected[product.id].br,
    product.id + ' detail page renders source line breaks');
  assert.doesNotMatch(section, /Buy once and print as often as you like/,
    product.id + ' detail page does not append text missing from the source');

  const renderedText = visibleText(section);
  for (const signal of sourceSignals[product.id]) {
    assert.ok(renderedText.includes(signal), product.id + ' rendered detail includes: ' + signal.slice(0, 40));
  }
}

const payload = {
  id: 'xss-test', slug: 'xss', name: 'XSS Test', cat: 'Test',
  img: 'assets/img/white-wolf.png', images: ['assets/img/white-wolf.png'],
  formats: 'PNG', price: 1, order: 99, summary: 'Short subtitle.',
  description: [
    { type: 'h2', content: [{ t: 'text', v: '<img src=x onerror=alert(1)>' }] },
    { type: 'p', content: [
      { t: 'strong', v: '<script>alert(1)</script>' },
      { t: 'text', v: ' safe' },
      { t: 'br' },
      { t: 'em', v: '<b>bold</b>' }
    ] },
    { type: 'ul', items: [[{ t: 'text', v: '<svg onload=alert(1)>' }]] },
    { type: 'script', content: [{ t: 'text', v: 'alert(1)' }] },
    { type: 'p', content: [{ t: 'text', v: '<a href="javascript:alert(1)">x</a>' }] }
  ]
};
products.push(payload);
const xssMarkup = renderProduct('xss-test', products);
products.pop();

assert.doesNotMatch(xssMarkup, /<script/i, 'detail renderer never emits source-supplied scripts');
assert.doesNotMatch(xssMarkup, /<svg/i, 'detail renderer never emits source-supplied SVG');
assert.doesNotMatch(xssMarkup, /<img\b[^>]*onerror/i, 'detail renderer never emits source-supplied event handlers');
assert.doesNotMatch(xssMarkup, /<a\b[^>]*href="javascript:/i, 'detail renderer never emits source-supplied javascript URLs');
assert.match(xssMarkup, /&lt;img src=x onerror=alert\(1\)&gt;/, 'unknown text is escaped');
assert.match(xssMarkup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/, 'script text is escaped inside allowed markup');
assert.match(xssMarkup, /&lt;b&gt;bold&lt;\/b&gt;/, 'inline text is escaped');
assert.match(xssMarkup, /&lt;svg onload=alert\(1\)&gt;/, 'list text is escaped');
assert.match(xssMarkup, /&lt;a href=&quot;javascript:alert\(1\)&quot;&gt;x&lt;\/a&gt;/, 'unsafe links remain text');

const productRules = [...cssSource.matchAll(/\.product-desc[^{]*\{([^}]*)\}/g)];
assert.ok(productRules.length > 0, 'detail description styling exists');
for (const rule of productRules) {
  const body = rule[1];
  assert.doesNotMatch(body, /display\s*:\s*none/i, 'detail description is not hidden');
  assert.doesNotMatch(body, /visibility\s*:\s*hidden/i, 'detail description is not hidden');
  assert.doesNotMatch(body, /max-height\s*:/i, 'detail description is not clamped');
  assert.doesNotMatch(body, /overflow\s*:\s*hidden/i, 'detail description is not clipped');
  assert.doesNotMatch(body, /(?:-webkit-)?line-clamp\s*:/i, 'detail description is not truncated');
}
for (const selector of ['.product-desc h2', '.product-desc p', '.product-desc ul', '.product-desc li', '.product-desc strong', '.product-desc em']) {
  assert.ok(cssSource.includes(selector), 'detail description styles ' + selector);
}

process.stdout.write('PASS five detail pages render complete structured source descriptions safely\n');
