'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const siteRoot = 'https://eugene55555.github.io/the-quiet-room/';
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');

const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), dataContext);
const realProducts = dataContext.window.TQR_PRODUCTS;
const products = JSON.parse(JSON.stringify(realProducts));

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

function imagesOf(product) {
  return Array.isArray(product.images) && product.images.length ? product.images : [product.img];
}

let now = 0;
class FakeDate extends Date {
  static now() { return now; }
}

function makeElement() {
  const classes = new Set();
  const controlCache = new Map();
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    src: '',
    alt: '',
    style: {},
    listeners: {},
    attributes: {},
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

function makeCardGallery(product) {
  const imageCount = imagesOf(product).length;
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
  return { product, media, slides, dots };
}

function render(type, list, href) {
  const elements = {};
  const location = new URL(href);
  const galleries = [];
  const related = type === 'product'
    ? list.filter(product => product.id !== location.searchParams.get('id')).slice(0, 4)
    : [];
  const galleryProducts = type === 'catalog' ? list : related;
  galleryProducts.forEach(product => galleries.push(makeCardGallery(product)));

  if (type === 'catalog') {
    elements.catalog = makeElement();
    elements.pagination = makeElement();
    elements.count = makeElement();
    elements.catalog.querySelectorAll = selector => selector === '.card-media' ? galleries.map(gallery => gallery.media) : [];
  } else {
    elements['product-page'] = makeElement();
    elements['product-main-image'] = makeElement();
    elements['product-media'] = makeElement();
    elements['product-page'].querySelector = selector => selector === '.product-media' ? elements['product-media'] : null;
    const pageControls = elements['product-page'].querySelectorAll.bind(elements['product-page']);
    elements['product-page'].querySelectorAll = selector => selector === '.card-media'
      ? galleries.map(gallery => gallery.media)
      : pageControls(selector);
  }

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
    TQR_PRODUCTS: list,
    location,
    pageYOffset: 0,
    localStorage: { removeItem() {} },
    addEventListener() {},
    scrollTo() {},
    requestAnimationFrame(fn) { fn(); }
  };

  vm.runInNewContext(mainSource, {
    window,
    document,
    URL,
    URLSearchParams,
    Date: FakeDate,
    Number,
    Math,
    Object,
    Array,
    String
  });
  document.listeners.DOMContentLoaded();

  return {
    markup: type === 'catalog' ? elements.catalog.innerHTML : elements['product-page'].innerHTML,
    galleries,
    catalog: elements.catalog,
    pagination: elements.pagination,
    count: elements.count
  };
}

function cardsFromMarkup(markup) {
  const cards = [];
  for (const match of markup.matchAll(/<article class="card" id="product-card-([^"]+)">([\s\S]*?)<\/article>/g)) {
    cards.push({ id: match[1], html: match[2] });
  }
  return cards;
}

function attr(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return match ? match[1] : '';
}

function imagesIn(cardHTML) {
  return [...cardHTML.matchAll(/<img\b[^>]*class="card-slide[^"]*"[^>]*>/g)].map(match => ({
    src: attr(match[0], 'src'),
    alt: attr(match[0], 'alt'),
    active: /\bis-active\b/.test(attr(match[0], 'class'))
  }));
}

function dotsIn(cardHTML) {
  return [...cardHTML.matchAll(/<span class="card-dot(?: is-active)?"[^>]*><\/span>/g)].map(match => ({
    tag: match[0],
    active: /\bis-active\b/.test(attr(match[0], 'class'))
  }));
}

function swipe(gallery, dx, dy, pointerId) {
  now = 1000;
  const startX = 100;
  const startY = 150;
  gallery.media.listeners.pointerdown({
    isPrimary: true, pointerType: 'touch', pointerId: pointerId || 1,
    clientX: startX, clientY: startY
  });
  gallery.media.listeners.pointermove({
    pointerId: pointerId || 1, clientX: startX + dx, clientY: startY + dy
  });
  gallery.media.listeners.pointerup({
    pointerId: pointerId || 1, clientX: startX + dx, clientY: startY + dy
  });
}

function click(gallery) {
  let prevented = false;
  let stopped = false;
  gallery.media.listeners.click({
    preventDefault() { prevented = true; },
    stopPropagation() { stopped = true; }
  });
  return { prevented, stopped };
}

const expectedCounts = { 'crystal-winter-fawn': 6, 'christmas-little-fawn': 4, 'autumn-spirit': 4, 'arctic-phantom-iqc': 4, 'arctic-phantom-xkw': 3, 'white-wolf': 4, 'baby-tiger': 4, 'golden-butterfly-cat': 3, 'enchanted-rainbow-cat': 3, 'cat-tree-dreams': 3 };
assert.deepEqual(Object.fromEntries(products.map(product => [product.id, imagesOf(product).length])), expectedCounts,
  'home catalog covers all 38 source images in source order');
assert.equal(products.reduce((sum, product) => sum + imagesOf(product).length, 0), 38);

const catalog = render('catalog', products, siteRoot);
const firstPageCards = cardsFromMarkup(catalog.markup);
assert.equal(firstPageCards.length, 8, 'first catalog page renders the eight-card page size');
assert.equal((catalog.markup.match(/<img\b[^>]*class="card-slide/g) || []).length, 32,
  'first catalog page renders all source images for its eight cards');
assert.equal(catalog.count.textContent, '10 products', 'catalog count includes products on later pages');
const nextPage = catalog.pagination.innerHTML.match(/<button\b[^>]*data-p="(\d+)"[^>]*aria-label="Next page"/);
assert.ok(nextPage, 'catalog exposes a next-page control for the remaining products');
const nextButton = { getAttribute(name) { return name === 'data-p' ? nextPage[1] : null; } };
catalog.pagination.listeners.click({ target: { closest() { return nextButton; } } });
const secondPageMarkup = catalog.catalog.innerHTML;
const secondPageCards = cardsFromMarkup(secondPageMarkup);
assert.equal(secondPageCards.length, 2, 'second catalog page renders the remaining two cards');
assert.equal((secondPageMarkup.match(/<img\b[^>]*class="card-slide/g) || []).length, 6,
  'second catalog page renders every image for the remaining cards');
const allCards = new Map([...firstPageCards, ...secondPageCards].map(card => [card.id, card]));
assert.equal(allCards.size, 10, 'pagination exposes all ten catalog cards');

for (const product of products) {
  const card = allCards.get(product.id);
  assert.ok(card, product.id + ' home card renders');
  const images = imagesOf(product);
  const rendered = imagesIn(card.html);
  assert.deepEqual(rendered.map(image => image.src), images.map(esc), product.id + ' card keeps source image order');
  assert.deepEqual(rendered.map(image => image.alt), images.map((_, index) => esc(product.name) + ' — image ' + (index + 1) + ' of ' + images.length),
    product.id + ' card alt text counts every frame');
  assert.equal(rendered.filter(image => image.active).length, 1, product.id + ' card starts with exactly one active slide');
  assert.equal(rendered[0].active, true, product.id + ' card starts on its first source image');

  const mediaTag = card.html.match(/<a class="card-media"[^>]*>/);
  assert.ok(mediaTag, product.id + ' card keeps its direct product link wrapper');
  assert.equal(attr(mediaTag[0], 'href'), 'product.html?id=' + esc(product.id), product.id + ' image links directly to the product page');
  assert.equal(attr(mediaTag[0], 'data-gallery-count'), String(images.length), product.id + ' card count matches its image array');
  assert.equal(attr(mediaTag[0], 'data-gallery-index'), '0', product.id + ' card starts at gallery index 0');

  const dots = dotsIn(card.html);
  assert.equal(dots.length, images.length, product.id + ' card shows one persistent dot per image');
  assert.equal(dots.filter(dot => dot.active).length, 1, product.id + ' card starts with exactly one active dot');
  assert.equal(dots[0].active, true, product.id + ' card starts with its first dot active');

  const titleTag = card.html.match(/<a class="card-title"[^>]*>/);
  assert.ok(titleTag, product.id + ' card keeps its title link');
  assert.equal(attr(titleTag[0], 'href'), 'product.html?id=' + esc(product.id), product.id + ' title links directly to the product page');

  const buyTag = card.html.match(/<a class="card-btn"[^>]*>/);
  assert.ok(buyTag, product.id + ' card keeps its direct Buy link');
  const buyURL = new URL(attr(buyTag[0], 'href').replace(/&amp;/g, '&'));
  assert.equal(buyURL.origin + buyURL.pathname, 'https://5307397047125.blacksea.in.ua/checkout', product.id + ' Buy link keeps the BlackSea checkout');
  assert.equal(buyURL.searchParams.get('product'), product.slug, product.id + ' Buy link keeps its checkout slug');
  assert.equal(buyURL.searchParams.get('quantity'), '1', product.id + ' Buy link keeps quantity 1');
  assert.equal(buyURL.searchParams.get('referrer'), siteRoot + '#product-card-' + encodeURIComponent(product.id),
    product.id + ' Buy link keeps its card return anchor');
  assert.doesNotMatch(buyTag[0], /target="_blank"/, product.id + ' Buy link keeps same-tab browser Back behaviour');
}

for (const gallery of catalog.galleries) {
  const product = gallery.product;
  const images = imagesOf(product);
  assert.equal(gallery.dots.length, images.length, product.id + ' swipe gallery is wired for every image');
  assert.equal(gallery.media.getAttribute('data-gallery-index'), '0');
  swipe(gallery, -60, 0, 1);
  assert.equal(gallery.media.getAttribute('data-gallery-index'), '1', product.id + ' left swipe advances the gallery');
  assert.equal(gallery.slides[1].classList.contains('is-active'), true, product.id + ' left swipe activates the next slide');
  assert.equal(gallery.slides[0].classList.contains('is-active'), false, product.id + ' left swipe deactivates the previous slide');
  assert.equal(gallery.dots[1].classList.contains('is-active'), true, product.id + ' left swipe activates the next dot');
  assert.equal(gallery.dots[0].classList.contains('is-active'), false, product.id + ' left swipe deactivates the previous dot');
  swipe(gallery, 60, 0, 1);
  assert.equal(gallery.media.getAttribute('data-gallery-index'), '0', product.id + ' right swipe returns to the previous image');
  assert.equal(gallery.slides[0].classList.contains('is-active'), true, product.id + ' right swipe restores the previous slide');
  assert.equal(gallery.dots[0].classList.contains('is-active'), true, product.id + ' right swipe restores the previous dot');
}

const firstGallery = catalog.galleries[0];
swipe(firstGallery, -60, 0, 2);
let afterSwipe = click(firstGallery);
assert.deepEqual(afterSwipe, { prevented: true, stopped: true }, 'the synthetic click after a horizontal swipe is absorbed');
now = 1500;
afterSwipe = click(firstGallery);
assert.deepEqual(afterSwipe, { prevented: false, stopped: false }, 'a fresh tap after the swipe still opens the product page');

swipe(firstGallery, 60, 0, 5);
assert.equal(firstGallery.media.getAttribute('data-gallery-index'), '0', 'right swipe returns to the cover before the motion checks');
swipe(firstGallery, -4, 0, 3);
assert.equal(firstGallery.media.getAttribute('data-gallery-index'), '0', 'a short horizontal movement does not change the gallery');
swipe(firstGallery, 10, -80, 4);
assert.equal(firstGallery.media.getAttribute('data-gallery-index'), '0', 'vertical scrolling does not change the gallery');

const singleProduct = {
  id: 'single-image-card', name: 'Single Image Card', cat: 'Test', img: 'assets/img/single.png',
  slug: 'single', formats: 'PNG', price: 1, order: 99,
  summary: 'A single-frame card.'
};
const singleRender = render('catalog', [singleProduct], siteRoot);
const singleCard = cardsFromMarkup(singleRender.markup).find(card => card.id === 'single-image-card');
assert.ok(singleCard, 'the fallback single-image card renders');
assert.deepEqual(imagesIn(singleCard.html).map(image => image.src), ['assets/img/single.png'], 'a card without images falls back to product.img');
assert.equal(attr(singleCard.html.match(/<a class="card-media"[^>]*>/)[0], 'data-gallery-count'), '1', 'single-image cards mark count 1');
assert.doesNotMatch(singleCard.html, /class="card-dots"/, 'single-image cards do not render useless dots');
const singleGallery = singleRender.galleries.find(gallery => gallery.product.id === 'single-image-card');
assert.equal(singleGallery.dots.length, 1);
assert.equal(singleGallery.media.listeners.pointerdown, undefined, 'single-image cards do not register swipe handlers');

const relatedRender = render('product', products, siteRoot + 'product.html?id=white-wolf');
const relatedCards = cardsFromMarkup(relatedRender.markup);
assert.equal(relatedCards.length, 4, 'product page still renders four related cards');
for (const gallery of relatedRender.galleries) {
  const product = gallery.product;
  const card = relatedCards.find(item => item.id === product.id);
  assert.ok(card, product.id + ' related card renders');
  assert.deepEqual(imagesIn(card.html).map(image => image.src), imagesOf(product).map(esc),
    product.id + ' related card keeps every source image');
  assert.equal(dotsIn(card.html).length, imagesOf(product).length,
    product.id + ' related card shows one dot per image');
  swipe(gallery, -60, 0, 7);
  assert.equal(gallery.media.getAttribute('data-gallery-index'), '1', product.id + ' related-card swipe still works');
  assert.equal(gallery.dots[1].classList.contains('is-active'), true, product.id + ' related-card swipe updates its dot');
}

assert.match(cssSource, /\.card-media\s*\{[^}]*touch-action\s*:\s*pan-y/, 'card galleries keep vertical scrolling available');
const cardDotsRule = cssSource.match(/\.card-dots\s*\{([^}]*)\}/);
assert.ok(cardDotsRule && /pointer-events\s*:\s*none/.test(cardDotsRule[1]), 'card dots remain passive and never intercept taps');

process.stdout.write('PASS every home card renders all source images with swipe, synchronized passive dots, and safe direct links\n');
