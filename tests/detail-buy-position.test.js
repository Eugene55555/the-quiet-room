'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const siteRoot = 'https://eugene55555.github.io/the-quiet-room/';
const checkoutRoot = 'https://5307397047125.blacksea.in.ua/checkout';
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');

const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), dataContext);
const products = dataContext.window.TQR_PRODUCTS;
assert.equal(products.length, 10, 'all ten live detail pages share the same renderer');

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
      if (selector !== '.product-thumb' && selector !== '.product-dot' && selector !== '.card-media') return [];
      if (!controlCache.has(selector)) {
        if (selector === '.card-media') {
          controlCache.set(selector, []);
        } else {
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
      }
      return controlCache.get(selector);
    },
    contains() { return false; }
  };
}

function render(productId) {
  const pageUrl = siteRoot + 'product.html?id=' + productId;
  const productPage = makeElement();
  const productMedia = makeElement();
  productPage.querySelector = selector => selector === '.product-media' ? productMedia : null;
  const elements = { 'product-page': productPage, 'product-media': productMedia };
  const meta = {};
  const location = new URL(pageUrl);
  const window = {
    TQR_PRODUCTS: products,
    location,
    history: { state: null, replaceState() {} },
    pageYOffset: 0,
    localStorage: { removeItem() {} },
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };
  const document = {
    body: makeElement(),
    title: '',
    listeners: {},
    getElementById(id) {
      if (id === 'product-main-image') {
        const image = productPage.innerHTML.match(/<img\b[^>]*\bid="product-main-image"[^>]*\bsrc="([^"]+)"[^>]*\balt="([^"]+)"/);
        if (!image) return null;
        return { src: image[1], alt: image[2] };
      }
      return elements[id] || null;
    },
    querySelector(selector) {
      if (selector.indexOf('meta[') === 0) {
        return { setAttribute(name, value) { meta[selector] = String(value); } };
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  vm.runInNewContext(mainSource, { window, document, URL, URLSearchParams, Date, Number, Math, Object, Array, String });
  document.listeners.DOMContentLoaded();
  return { markup: productPage.innerHTML, pageUrl, title: document.title, meta };
}

function elementEnd(html, openIndex) {
  assert.ok(openIndex >= 0, 'opening tag is present');
  const tag = /<\/?div\b[^>]*>/g;
  tag.lastIndex = openIndex;
  let depth = 0;
  let match;
  while ((match = tag.exec(html))) {
    if (match[0].startsWith('</')) depth -= 1;
    else depth += 1;
    if (depth === 0) return tag.lastIndex;
  }
  return -1;
}

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function productImages(p) {
  return p.images && p.images.length ? p.images : [p.img];
}

for (const product of products) {
  const { markup, pageUrl } = render(product.id);
  const images = productImages(product);

  const layoutOpen = markup.indexOf('<div class="product-layout"');
  const visualOpen = markup.indexOf('<div class="product-visual">');
  const galleryOpen = markup.indexOf('<div class="product-gallery">');
  const infoOpen = markup.indexOf('<div class="product-info">');
  const buyRowOpen = markup.indexOf('<div class="product-buy-row">');
  const buyAnchor = markup.indexOf('<a class="product-buy"');
  const detailsOpen = markup.indexOf('<section class="product-details">');
  const relatedOpen = markup.indexOf('<section class="product-related">');
  assert.ok(layoutOpen >= 0 && visualOpen > layoutOpen, product.id + ': detail has a gallery/action column');
  assert.ok(galleryOpen > visualOpen, product.id + ': gallery is the first block in the image column');
  assert.ok(infoOpen > visualOpen, product.id + ': product information follows the image column');
  assert.ok(buyRowOpen > galleryOpen, product.id + ': Buy row follows the gallery thumbnails');
  assert.ok(buyAnchor > buyRowOpen, product.id + ': Buy link is inside the Buy row');
  assert.ok(detailsOpen > infoOpen && relatedOpen > detailsOpen, product.id + ': description follows product information and related products follow the layout');

  const galleryEnd = elementEnd(markup, galleryOpen);
  const visualEnd = elementEnd(markup, visualOpen);
  const layoutEnd = elementEnd(markup, layoutOpen);
  const buyRowEnd = elementEnd(markup, buyRowOpen);
  const infoEnd = elementEnd(markup, infoOpen);
  assert.ok(galleryEnd > 0 && galleryEnd <= visualEnd && visualEnd <= infoOpen, product.id + ': gallery stays entirely in the left image column');
  assert.ok(buyRowEnd > buyRowOpen && buyRowEnd <= visualEnd, product.id + ': Buy row stays in the sticky image column below the gallery');
  assert.ok(visualEnd <= infoOpen, product.id + ': product information follows the complete sticky image and Buy column');
  assert.ok(infoEnd > detailsOpen && infoEnd <= layoutEnd, product.id + ': complete description stays inside the right information column');
  assert.ok(relatedOpen >= layoutEnd, product.id + ': related products follow the two-column product area');
  assert.ok(markup.slice(infoOpen, detailsOpen).includes('class="product-formats"'),
    product.id + ': price and format information stay in the reading column');

  assert.equal((markup.match(/class="product-buy"/g) || []).length, 1,
    product.id + ': exactly one primary Buy button renders');
  assert.equal((markup.match(/class="product-buy-row"/g) || []).length, 1,
    product.id + ': exactly one Buy row renders');
  assert.equal((markup.match(/id="product-main-image"/g) || []).length, 1,
    product.id + ': the main gallery image stays in place');
  assert.equal((markup.match(/class="product-thumb(?: is-active)?"/g) || []).length, images.length,
    product.id + ': all gallery thumbnails stay in place');

  const galleryMarkup = markup.slice(galleryOpen, galleryEnd);
  for (const src of images) {
    assert.ok(galleryMarkup.includes('src="' + src + '"'), product.id + ': gallery keeps image ' + src);
    assert.ok(markup.indexOf('src="' + src + '"') < buyAnchor, product.id + ': image ' + src + ' precedes the Buy button');
  }

  const link = markup.match(/<a class="product-buy" href="([^"]+)" data-return-url="([^"]+)">([^<]*)<\/a>/);
  assert.ok(link, product.id + ': Buy link keeps its existing markup shape');
  const url = new URL(decode(link[1]));
  const referrer = pageUrl + '#product-card-' + product.id;
  assert.equal(url.origin + url.pathname, checkoutRoot, product.id + ': checkout host is unchanged');
  assert.equal(url.searchParams.get('product'), product.slug, product.id + ': checkout slug is unchanged');
  assert.equal(url.searchParams.get('quantity'), '1', product.id + ': single-quantity checkout is unchanged');
  assert.equal(url.searchParams.get('referrer'), referrer, product.id + ': checkout referrer is unchanged');
  assert.equal(decode(link[2]), referrer, product.id + ': browser-back return URL is unchanged');
  assert.equal(link[3], 'Buy now — $' + product.price.toFixed(2), product.id + ': label and price are unchanged');
  assert.doesNotMatch(link[0], /target=/, product.id + ': checkout stays in the same tab');
}

const expectedTitles = {
  'crystal-winter-fawn': 'Crystal Winter Fawn — Magical Ice Deer Digital PNG Art PNG PDF',
  'christmas-little-fawn': 'Christmas Little Fawn — Magical Holiday Deer PNG Design PNG PDF',
  'autumn-spirit': 'Autumn Spirit — Elegant Fox Wildlife Art Print PDF PNG',
  'arctic-phantom-iqc': 'Arctic Phantom — Majestic Snow Leopard Wildlife Art PNG PDF',
  'arctic-phantom-xkw': 'Arctic Phantom — Majestic Snow Leopard Wildlife Art PNG PDF',
  'white-wolf': 'White Wolf Digital Art Print PNG PDF',
  'baby-tiger': 'Wild Blossom Tiger Cub — Enchanted Nature Digital Art Print PDF PNG',
  'golden-butterfly-cat': 'Golden Butterfly Cat — Golden Elegance PNG PDF',
  'enchanted-rainbow-cat': 'Rainbow Autumn Cat — Magical Fantasy Cat Digital PNG Art PNG PDF',
  'cat-tree-dreams': 'Enchanted Sunset Cat — Magical Fantasy Art Print PNG PDF'
};
for (const product of products) {
  const expectedTitle = expectedTitles[product.id];
  assert.ok(expectedTitle, product.id + ' has an exact source title expectation');
  assert.equal(product.name, expectedTitle, product.id + ' display title is exact');
  const detail = render(product.id);
  assert.ok(detail.markup.includes('<h1>' + expectedTitle + '</h1>'),
    product.id + ' detail heading uses the exact display title');
  assert.equal(detail.title, expectedTitle + ' — The Quiet Room',
    product.id + ' document title uses the exact display title');
  assert.equal(detail.meta['meta[property="og:title"]'], expectedTitle + ' — The Quiet Room',
    product.id + ' Open Graph title uses the exact display title');
  assert.equal(detail.meta['meta[name="twitter:title"]'], expectedTitle + ' — The Quiet Room',
    product.id + ' Twitter title uses the exact display title');
  assert.ok(detail.markup.indexOf('src="' + productImages(product)[0] + '"') < detail.markup.indexOf('<a class="product-buy"'),
    product.id + ' title change does not move the gallery or Buy button');
}

const catalogContext = { window: { TQR_PRODUCTS: products } };
const catalogPage = makeElement();
const catalogPagination = makeElement();
const catalogCount = makeElement();
const catalogDocument = {
  body: makeElement(),
  title: '',
  listeners: {},
  getElementById(id) {
    if (id === 'catalog') return catalogPage;
    if (id === 'pagination') return catalogPagination;
    if (id === 'count') return catalogCount;
    return null;
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener(type, fn) { this.listeners[type] = fn; }
};
catalogContext.window.location = new URL(siteRoot);
catalogContext.window.history = { state: null, replaceState() {} };
catalogContext.window.pageYOffset = 0;
catalogContext.window.scrollTo = function () {};
catalogContext.window.localStorage = { removeItem() {} };
catalogContext.window.addEventListener = function () {};
catalogContext.window.requestAnimationFrame = fn => fn();
vm.runInNewContext(mainSource, {
  window: catalogContext.window,
  document: catalogDocument,
  URL, URLSearchParams, Date, Number, Math, Object, Array, String
});
catalogDocument.listeners.DOMContentLoaded();
const firstCatalogPage = catalogPage.innerHTML;
assert.equal((firstCatalogPage.match(/<article class="card"[\s\S]*?<\/article>/g) || []).length, 8,
  'the first catalog page renders eight cards');
assert.equal(catalogCount.textContent, '10 products', 'catalog count includes products on later pages');
const nextPage = catalogPagination.innerHTML.match(/<button\b[^>]*data-p="(\d+)"[^>]*aria-label="Next page"/);
assert.ok(nextPage, 'catalog provides a next-page control');
const nextButton = { getAttribute(name) { return name === 'data-p' ? nextPage[1] : null; } };
catalogPagination.listeners.click({ target: { closest() { return nextButton; } } });
const secondCatalogPage = catalogPage.innerHTML;
assert.equal((secondCatalogPage.match(/<article class="card"[\s\S]*?<\/article>/g) || []).length, 2,
  'the second catalog page renders the remaining two cards');
const catalogMarkup = firstCatalogPage + secondCatalogPage;
assert.equal((catalogMarkup.match(/class="card-btn"/g) || []).length, 10,
  'all ten catalog cards across both pages keep their Buy buttons');
for (const product of products) {
  const expectedTitle = expectedTitles[product.id];
  assert.ok(catalogMarkup.includes('class="card-title" href="product.html?id=' + product.id + '">' + expectedTitle + '</a>'),
    product.id + ' catalog card uses the exact display title');
}
for (const match of catalogMarkup.matchAll(/<article class="card"[\s\S]*?<\/article>/g)) {
  const card = match[0];
  const actions = card.indexOf('<div class="card-actions">');
  const button = card.indexOf('<a class="card-btn"');
  const priceRow = card.indexOf('<div class="card-price-row">');
  assert.ok(actions >= 0 && priceRow > actions && button > priceRow,
    'catalog price sits inside the bottom actions immediately above Buy');
}

function cssRules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
    selector: match[1].trim(),
    body: match[2].trim()
  }));
}

const cssRulesList = cssRules(cssSource);
const visualRule = cssRulesList.find(rule => rule.selector === '.product-visual');
assert.ok(visualRule, 'image column wrapper is styled');
assert.match(visualRule.body, /display\s*:\s*flex\b/);
assert.match(visualRule.body, /flex-direction\s*:\s*column\b/);
assert.match(cssSource, /@media\s*\(min-width:\s*901px\)\s*\{[\s\S]*?\.product-layout\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*\.8fr\)\s+minmax\(0,\s*1\.2fr\)/,
  'desktop gives the information column more width than the gallery');
assert.match(cssSource, /@media\s*\(min-width:\s*901px\)\s*\{[\s\S]*?\.product-visual\s*\{[^}]*position\s*:\s*sticky/,
  'desktop keeps the product gallery visible while reading long descriptions');
const stickyVisualRule = cssRulesList.find(rule => rule.selector === '.product-visual' && /position\s*:\s*sticky/.test(rule.body));
assert.ok(stickyVisualRule, 'desktop sticky column has a dedicated viewport-fit rule');
assert.match(stickyVisualRule.body, /height\s*:\s*min\(800px\s*,\s*calc\(100svh\s*-\s*160px\)\)/,
  'sticky gallery reserves the header, initial page offset and bottom breathing room');
assert.match(stickyVisualRule.body, /grid-template-rows\s*:\s*minmax\(0,\s*1fr\)\s+auto/,
  'the desktop image stage can shrink to keep thumbnails and Buy visible');
const desktopGalleryRule = cssRulesList.find(rule => rule.selector === '.product-gallery' && /grid-template-rows/.test(rule.body));
assert.ok(desktopGalleryRule, 'desktop gallery uses rows that can fit within the sticky viewport');
assert.match(desktopGalleryRule.body, /grid-template-rows\s*:\s*minmax\(0,\s*1fr\)\s+auto\s+auto/);
const desktopTriggerRule = cssRulesList.find(rule => rule.selector === '.product-main-trigger' && /height\s*:\s*100%/.test(rule.body));
assert.ok(desktopTriggerRule, 'desktop main image stage fills its responsive gallery row');
assert.match(cssSource, /\.product-main-trigger\s+img\s*\{[^}]*max-height\s*:\s*100%[^}]*object-fit\s*:\s*contain/,
  'large product images preserve their full aspect ratio inside the desktop stage');
const thumbRule = cssRulesList.find(rule => rule.selector === '.product-thumb');
const thumbImageRule = cssRulesList.find(rule => rule.selector === '.product-thumb img');
const thumbsStripRule = cssRulesList.find(rule => rule.selector === '.product-thumbs');
assert.match(thumbRule.body, /aspect-ratio\s*:\s*1\s*\/\s*1/,
  'thumbnail buttons reserve a square crop instead of inheriting portrait image height');
assert.match(thumbsStripRule.body, /max-width\s*:\s*420px/,
  'large tablet widths do not inflate thumbnails beyond a compact strip');
assert.match(thumbsStripRule.body, /margin-inline\s*:\s*auto/);
assert.match(thumbsStripRule.body, /padding\s*:\s*4px/,
  'scrollable strip leaves room around each keyboard-focus outline');
assert.match(thumbsStripRule.body, /grid-template-rows\s*:\s*1fr/,
  'all thumbnails stay in one row so extra images do not push Buy below short screens');
assert.match(thumbsStripRule.body, /grid-auto-flow\s*:\s*column/,
  'additional thumbnails extend horizontally instead of creating a second row');
assert.match(thumbsStripRule.body, /grid-auto-columns\s*:\s*calc\(\(100%\s*-\s*24px\)\s*\/\s*4\)/,
  'four square thumbnails fit in the visible strip at once');
assert.match(thumbsStripRule.body, /overflow-x\s*:\s*auto/,
  'extra thumbnails remain reachable in the horizontally scrollable strip');
assert.match(thumbImageRule.body, /height\s*:\s*100%/);
assert.match(thumbImageRule.body, /object-fit\s*:\s*cover/);
assert.match(cssSource, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-main-trigger\s*\{[^}]*height\s*:\s*min\(34svh\s*,\s*420px\)/,
  'small screens cap the image height while keeping the button under the gallery in normal flow');
const buyLayoutRule = cssRulesList.find(rule => rule.selector === '.product-buy-row .product-buy');
assert.ok(buyLayoutRule, 'detail Buy layout hook follows the relocated button');
assert.match(buyLayoutRule.body, /flex\s*:\s*1\b/);
assert.doesNotMatch(cssSource, /\.product-buy[^{}]*\{[^}]*display\s*:\s*none/,
  'the primary Buy button is never hidden, including mobile layouts');
assert.match(cssSource, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-layout\s*\{\s*grid-template-columns\s*:\s*1fr/,
  'mobile keeps a single-column product layout');
assert.match(cssSource, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-visual\s*\{[^}]*flex-direction\s*:\s*column/,
  'mobile stacks the image gallery above its Buy button');
assert.match(cssSource, /@media\s*\(max-width:\s*640px\)\s*and\s*\(max-height:\s*520px\)\s*\{[\s\S]*?\.product-main-trigger\s*\{[^}]*height\s*:\s*min\(25svh\s*,\s*160px\)/,
  'short phone screens reduce the image area enough to keep the gallery and Buy visible');
assert.match(cssSource, /@media\s*\(min-width:\s*641px\)\s*and\s*\(max-width:\s*900px\)\s*and\s*\(max-height:\s*520px\)\s*\{[\s\S]*?\.product-layout\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,\s*\.8fr\)\s+minmax\(0,\s*1\.2fr\)[\s\S]*?\.product-visual\s*\{[^}]*position\s*:\s*sticky/,
  'short tablet landscape screens use the two-column sticky layout');
assert.match(cssSource, /@media\s*\(min-width:\s*641px\)\s*and\s*\(max-height:\s*520px\)\s*\{[\s\S]*?\.product-thumbs\s*\{[^}]*max-width\s*:\s*240px[\s\S]*?\.product-dots\s*\{\s*display\s*:\s*none/,
  'short tablet and desktop windows compact thumbnails and hide redundant dots to preserve image height');

for (const path of ['../index.html', '../product.html']) {
  const html = fs.readFileSync(require.resolve(path), 'utf8');
  assert.match(html, /assets\/data\.js\?v=25/, path + ' loads the cache-busted ten source titles');
  assert.match(html, /assets\/main\.js\?v=41/, path + ' loads the cache-busted relocated-button renderer');
  assert.match(html, /assets\/style\.css\?v=40/, path + ' loads the cache-busted desktop layout CSS');
}

process.stdout.write('PASS all ten detail pages keep the Buy button below the sticky gallery and the full description in the right column, with checkout links and catalog cards unchanged\n');
