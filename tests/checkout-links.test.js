'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const siteRoot = 'https://eugene55555.github.io/the-quiet-room/';
const checkoutRoot = 'https://5307397047125.blacksea.in.ua/checkout';
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');
const htmlFiles = ['../index.html', '../product.html'];
const products = [
  { id: 'tiger', slug: 'lek', name: 'Baby Tiger', cat: 'Tropical', img: 'assets/tiger.png', images: ['assets/tiger.png', 'assets/tiger-detail.png', 'assets/tiger-alt.png'], formats: 'PNG + PDF', price: 2.60, order: 1 },
  { id: 'butterfly', slug: 'ksi', name: 'Golden Butterfly Cat', cat: 'Butterfly', img: 'assets/butterfly.png', images: ['assets/butterfly.png', 'assets/butterfly-detail.png'], formats: 'PNG + PDF', price: 1.30, order: 2 },
  { id: 'rainbow', slug: 'oko', name: 'Enchanted Rainbow Cat', cat: 'Rainbow', img: 'assets/rainbow.png', images: ['assets/rainbow.png', 'assets/rainbow-detail.png', 'assets/rainbow-alt.png'], formats: 'PNG + PDF', price: 1.95, order: 3 },
  { id: 'tree', slug: 'xmv', name: 'Cat on the Tree of Dreams', cat: 'Dreams', img: 'assets/tree.png', images: ['assets/tree.png', 'assets/tree-detail.png', 'assets/tree-alt.png'], formats: 'PNG + PDF', price: 2.60, order: 4 }
];

function makeElement() {
  const classes = new Set();
  const controlCache = new Map();
  return {
    innerHTML: '', textContent: '', value: '', style: {}, listeners: {}, attributes: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      }
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] || null; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector !== '.product-thumb' && selector !== '.product-dot') return [];
      if (!controlCache.has(selector)) {
        const className = selector.slice(1);
        const tags = [...this.innerHTML.matchAll(/<button\b[^>]*>/g)].map(match => match[0]);
        const controls = tags.filter(tag => {
          const classMatch = tag.match(/\bclass="([^"]+)"/);
          return classMatch && classMatch[1].split(/\s+/).includes(className);
        }).map(tag => {
          const control = makeElement();
          for (const attr of tag.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) control.setAttribute(attr[1], attr[2]);
          (control.getAttribute('class') || '').split(/\s+/).filter(Boolean).forEach(name => control.classList.add(name));
          return control;
        });
        controlCache.set(selector, controls);
      }
      return controlCache.get(selector);
    },
    contains() { return false; }
  };
}

function makeCardGallery(imageCount) {
  const media = makeElement();
  const slides = Array.from({ length: imageCount }, (_, i) => {
    const slide = makeElement();
    slide.classList.add('card-slide');
    if (i === 0) slide.classList.add('is-active');
    return slide;
  });
  const dots = Array.from({ length: imageCount }, (_, i) => {
    const dot = makeElement();
    dot.classList.add('card-dot');
    if (i === 0) dot.classList.add('is-active');
    return dot;
  });
  media.setAttribute('data-gallery-index', '0');
  media.setAttribute('data-gallery-count', String(imageCount));
  media.querySelectorAll = selector => selector === '.card-slide' ? slides : selector === '.card-dot' ? dots : [];
  return { media, slides, dots };
}

function renderPage(href, type) {
  const elements = {};
  const location = new URL(href);
  const cardGalleries = [];
  if (type === 'catalog') {
    elements.catalog = makeElement();
    elements.pagination = makeElement();
    elements.count = makeElement();
    products.forEach(p => cardGalleries.push(makeCardGallery(p.images.length)));
    elements.catalog.querySelectorAll = selector => selector === '.card-media' ? cardGalleries.map(gallery => gallery.media) : [];
  } else {
    elements['product-page'] = makeElement();
    elements['product-main-image'] = makeElement();
    elements['product-media'] = makeElement();
    elements['product-page'].querySelector = selector => selector === '.product-media' ? elements['product-media'] : null;
    const selectedProduct = products.find(p => p.id === location.searchParams.get('id'));
    const related = products.filter(p => selectedProduct && p.id !== selectedProduct.id).slice(0, 4);
    related.forEach(p => cardGalleries.push(makeCardGallery(p.images.length)));
    const queryProductControls = elements['product-page'].querySelectorAll.bind(elements['product-page']);
    elements['product-page'].querySelectorAll = selector => selector === '.card-media' ? cardGalleries.map(gallery => gallery.media) : queryProductControls(selector);
  }
  const scrolledTo = [];
  const historyUpdates = [];
  const removedStorageKeys = [];
  const stored = new Map([['tqr-cart-v1', '{"tiger":true}'], ['tqr-cart-return-v1', siteRoot + '#product-card-tiger'], ['unrelated', 'keep']]);
  const document = {
    body: makeElement(),
    title: '',
    listeners: {},
    getElementById(id) {
      if (id === 'product-main-image' && elements[id] && elements['product-page'] && !elements[id].src) {
        const image = elements['product-page'].innerHTML.match(/<img\b[^>]*\bid="product-main-image"[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]+)"/);
        if (image) {
          elements[id].src = image[1];
          elements[id].alt = image[2];
        }
      }
      if (elements[id]) return elements[id];
      for (const root of [elements.catalog, elements['product-page']]) {
        if (root && root.innerHTML.includes('id="' + id + '"')) {
          return { scrollIntoView() { scrolledTo.push(id); } };
        }
      }
      return null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const window = {
    TQR_PRODUCTS: products,
    location,
    history: {
      state: null,
      replaceState(state, title, url) {
        historyUpdates.push(url);
        location.href = url;
      }
    },
    pageYOffset: 0,
    localStorage: { removeItem(key) { removedStorageKeys.push(key); stored.delete(key); } },
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };
  vm.runInNewContext(mainSource, { window, document, URL, URLSearchParams, Date, Number, Math, Object, Array, String });
  document.listeners.DOMContentLoaded();
  return {
    markup: type === 'catalog' ? elements.catalog.innerHTML : elements['product-page'].innerHTML,
    scrolledTo,
    historyUpdates,
    location,
    document,
    productDots: type === 'product' ? elements['product-page'].querySelectorAll('.product-dot') : [],
    productThumbs: type === 'product' ? elements['product-page'].querySelectorAll('.product-thumb') : [],
    productMedia: type === 'product' ? elements['product-media'] : null,
    productMainImage: type === 'product' ? elements['product-main-image'] : null,
    cardGalleries,
    removedStorageKeys,
    stored
  };
}

function extractLink(markup, className, index) {
  const matches = [...markup.matchAll(new RegExp('<a class="' + className + '" href="([^"]+)"([^>]*)>([^<]*)</a>', 'g'))];
  assert.ok(matches[index || 0], 'expected direct link with class ' + className);
  const href = matches[index || 0][1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return { url: new URL(href), text: matches[index || 0][3], tag: matches[index || 0][0] };
}

function assertBlackSeaLink(link, slug, referrer) {
  assert.equal(link.url.origin + link.url.pathname, checkoutRoot);
  assert.equal(link.url.searchParams.get('product'), slug);
  assert.equal(link.url.searchParams.get('quantity'), '1');
  assert.equal(link.url.searchParams.get('referrer'), referrer);
  assert.doesNotMatch(link.tag, /target="_blank"/, 'checkout must stay in the same tab for browser Back');
}

function dispatchCheckoutClick(page, link) {
  const encoded = link.tag.match(/data-return-url="([^"]+)"/);
  assert.ok(encoded, 'purchase link exposes its same-place browser-back target');
  const returnURL = encoded[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const anchor = {
    getAttribute(name) { return name === 'data-return-url' ? returnURL : null; },
    closest(selector) { return selector === 'a[data-return-url]' ? this : null; }
  };
  assert.equal(typeof page.document.listeners.click, 'function', 'site updates the current history entry before checkout navigation');
  page.document.listeners.click({ target: anchor, button: 0, defaultPrevented: false, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false });
  return returnURL;
}

const catalog = renderPage(siteRoot + '?campaign=quiet', 'catalog');
const catalogBuy = extractLink(catalog.markup, 'card-btn');
const catalogReturn = siteRoot + '?campaign=quiet#product-card-tiger';
assertBlackSeaLink(catalogBuy, 'lek', catalogReturn);
assert.equal(catalogBuy.text, 'Buy now');
assert.match(catalog.markup, /id="product-card-tiger"/);
assert.equal((catalog.markup.match(/class="card-dots"/g) || []).length, 4, 'all four catalog cards expose their gallery pagination before swiping');
const catalogTigerGallery = catalog.cardGalleries[0];
catalogTigerGallery.media.listeners.pointerdown({ isPrimary: true, pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 });
catalogTigerGallery.media.listeners.pointermove({ pointerId: 1, clientX: 60, clientY: 100 });
catalogTigerGallery.media.listeners.pointerup({ pointerId: 1, clientX: 60, clientY: 100 });
assert.equal(catalogTigerGallery.media.getAttribute('data-gallery-index'), '1', 'catalog swipe advances its gallery');
assert.equal(catalogTigerGallery.dots[1].classList.contains('is-active'), true, 'catalog swipe updates the active indicator');
assert.equal(catalogTigerGallery.dots[0].classList.contains('is-active'), false);
assert.equal(dispatchCheckoutClick(catalog, catalogBuy), catalogReturn);
assert.deepEqual(catalog.historyUpdates, [catalogReturn], 'browser Back keeps the home-page card anchor and query');
assert.equal(catalog.location.hash, '#product-card-tiger');
assert.deepEqual(catalog.removedStorageKeys.sort(), ['tqr-cart-return-v1', 'tqr-cart-v1']);
assert.equal(catalog.stored.has('unrelated'), true, 'legacy cleanup preserves unrelated localStorage keys');

const returnedCatalog = renderPage(siteRoot + '#product-card-tiger', 'catalog');
assert.deepEqual(returnedCatalog.scrolledTo, ['product-card-tiger'], 'return anchor scrolls to the same catalog card after dynamic rendering');

const productUrl = siteRoot + 'product.html?id=tiger';
const product = renderPage(productUrl, 'product');
const productBuy = extractLink(product.markup, 'product-buy');
assertBlackSeaLink(productBuy, 'lek', productUrl + '#product-card-tiger');
assert.match(product.markup, /<div class="product-layout" id="product-card-tiger">/);
assert.match(product.markup, /class="product-dots" role="group" aria-label="Product image pagination"/);
assert.equal((product.markup.match(/class="product-dot(?: is-active)?"/g) || []).length, 3, 'detail gallery shows one persistent dot per image');
assert.match(product.markup, /class="product-dot is-active"[^>]*aria-pressed="true"/);
assert.equal(product.productDots.length, 3);
assert.equal(product.productDots[0].getAttribute('aria-pressed'), 'true');
assert.equal(product.productMainImage.src, 'assets/tiger.png');
assert.equal(product.productMainImage.alt, 'Baby Tiger — image 1 of 3');
product.productDots[2].listeners.click();
assert.equal(product.productDots[2].getAttribute('aria-pressed'), 'true', 'selecting a dot changes the active image');
assert.equal(product.productDots[2].classList.contains('is-active'), true);
assert.equal(product.productDots[0].getAttribute('aria-pressed'), 'false');
assert.equal(product.productMainImage.src, 'assets/tiger-alt.png');
assert.equal(product.productMainImage.alt, 'Baby Tiger — image 3 of 3');
assert.equal(product.productThumbs[2].getAttribute('aria-pressed'), 'true', 'dot selection synchronizes thumbnails');
product.productThumbs[1].listeners.click();
assert.equal(product.productMainImage.src, 'assets/tiger-detail.png', 'thumbnail selection changes the main image');
assert.equal(product.productMainImage.alt, 'Baby Tiger — image 2 of 3');
assert.equal(product.productDots[1].getAttribute('aria-pressed'), 'true', 'thumbnail selection synchronizes dots');
product.productMedia.listeners.pointerdown({ isPrimary: true, pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 });
product.productMedia.listeners.pointermove({ pointerId: 1, clientX: 60, clientY: 100 });
product.productMedia.listeners.pointerup({ pointerId: 1, clientX: 60, clientY: 100 });
assert.equal(product.productMainImage.src, 'assets/tiger-alt.png', 'swipe changes the main image');
assert.equal(product.productMainImage.alt, 'Baby Tiger — image 3 of 3');
assert.equal(product.productDots[2].getAttribute('aria-pressed'), 'true', 'swipe synchronizes pagination');
assert.equal(product.productThumbs[2].getAttribute('aria-pressed'), 'true', 'swipe synchronizes thumbnails');
assert.equal(dispatchCheckoutClick(product, productBuy), productUrl + '#product-card-tiger');
assert.deepEqual(product.historyUpdates, [productUrl + '#product-card-tiger']);

const relatedBuy = extractLink(product.markup, 'card-btn');
assert.equal((product.markup.match(/class="card-dots"/g) || []).length, 3, 'related product cards also show persistent indicators');
const relatedGallery = product.cardGalleries[0];
relatedGallery.media.listeners.pointerdown({ isPrimary: true, pointerType: 'touch', pointerId: 2, clientX: 100, clientY: 100 });
relatedGallery.media.listeners.pointermove({ pointerId: 2, clientX: 60, clientY: 100 });
relatedGallery.media.listeners.pointerup({ pointerId: 2, clientX: 60, clientY: 100 });
assert.equal(relatedGallery.media.getAttribute('data-gallery-index'), '1', 'related-card swipe advances its gallery');
assert.equal(relatedGallery.dots[1].classList.contains('is-active'), true, 'related-card swipe updates the active indicator');
assertBlackSeaLink(relatedBuy, 'ksi', productUrl + '#product-card-butterfly');
assert.equal(dispatchCheckoutClick(product, relatedBuy), productUrl + '#product-card-butterfly');
assert.deepEqual(product.historyUpdates, [productUrl + '#product-card-tiger', productUrl + '#product-card-butterfly']);
const returnedProduct = renderPage(productUrl + '#product-card-tiger', 'product');
assert.deepEqual(returnedProduct.scrolledTo, ['product-card-tiger'], 'return anchor scrolls to the same product detail after dynamic rendering');
const returnedRelatedCard = renderPage(productUrl + '#product-card-butterfly', 'product');
assert.deepEqual(returnedRelatedCard.scrolledTo, ['product-card-butterfly'], 'related-card checkout returns to its source card');

products.push({ id: 'single', slug: 'single', name: 'Single Image', cat: 'Test', img: 'assets/single.png', images: ['assets/single.png'], formats: 'PNG', price: 1, order: 5 });
const singleImageProduct = renderPage(siteRoot + 'product.html?id=single', 'product');
products.pop();
assert.doesNotMatch(singleImageProduct.markup, /class="product-dots"/, 'single-image products do not show unnecessary pagination');
assert.equal(singleImageProduct.productDots.length, 0, 'single-image gallery remains functional without dot controls');

for (const path of htmlFiles) {
  const html = fs.readFileSync(require.resolve(path), 'utf8');
  assert.doesNotMatch(html, /cart-fab|cart-drawer|cart-toggle|cart-clear|assets\/cart-(?:core|ui)\.js/);
  assert.match(html, /assets\/main\.js\?v=25/);
  assert.match(html, /assets\/style\.css\?v=26/);
}
assert.doesNotMatch(mainSource, /TQR_CLOSE_CART|data-cart-add|cart-drawer|cart-toggle/);
assert.doesNotMatch(cssSource, /cart-fab|cart-drawer|cart-count|cart-items|cart-clear|cart-checkout/);
const cardDotsRule = cssSource.match(/\.card-dots\s*\{([^}]*)\}/);
assert.ok(cardDotsRule && /background\s*:\s*rgba\(34, 11, 17, \.72\)/.test(cardDotsRule[1]), 'catalog dots have a contrast backing visible without a swipe');
const productDotRule = cssSource.match(/\.product-dot\s*\{([^}]*)\}/);
assert.ok(productDotRule && /width\s*:\s*24px/.test(productDotRule[1]) && /height\s*:\s*24px/.test(productDotRule[1]), 'product dots have a touch-friendly 24px hit area');
const productDotVisualRule = cssSource.match(/\.product-dot::before\s*\{([^}]*)\}/);
assert.ok(productDotVisualRule && /width\s*:\s*9px/.test(productDotVisualRule[1]) && /height\s*:\s*9px/.test(productDotVisualRule[1]), 'larger target keeps a small visual dot');

process.stdout.write('PASS persistent image pagination dots; direct BlackSea links preserve card-specific return anchors; local cart removed\n');
