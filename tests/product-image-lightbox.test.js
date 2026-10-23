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

function imagesOf(product) {
  return Array.isArray(product.images) && product.images.length ? product.images : [product.img];
}

function attr(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return match ? match[1] : '';
}

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function classesOf(tag) {
  return (attr(tag, 'class') || '').split(/\s+/).filter(Boolean);
}

function tagsByClass(html, className, tagName) {
  return [...html.matchAll(new RegExp('<' + (tagName || 'button') + '\\b[^>]*>', 'g'))]
    .map(match => match[0])
    .filter(tag => classesOf(tag).includes(className));
}

function idTag(html, id) {
  const match = html.match(new RegExp('<[^>]+\\bid="' + id + '"[^>]*>'));
  return match ? match[0] : '';
}

function render(type, href, list) {
  const location = new URL(href);
  const focusState = { activeElement: null };
  const elements = {};
  const controlCache = new Map();
  const meta = {};

  function makeElement(id) {
    const classes = new Set();
    const listeners = {};
    const attributes = {};
    let html = '';
    const controlCacheForElement = new Map();

    const element = {
      id: id || '',
      textContent: '',
      value: '',
      src: '',
      alt: '',
      open: false,
      hidden: false,
      disabled: false,
      style: {},
      listeners,
      attributes,
      scrollLeft: 0,
      scrollTop: 0,
      classList: {
        add() { [...arguments].forEach(name => classes.add(name)); },
        remove() { [...arguments].forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          const enabled = force === undefined ? !classes.has(name) : Boolean(force);
          if (enabled) classes.add(name); else classes.delete(name);
          return enabled;
        }
      },
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
      setAttribute(name, value) {
        attributes[name] = String(value);
        if (name === 'open') element.open = true;
      },
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null;
      },
      hasAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name); },
      removeAttribute(name) {
        delete attributes[name];
        if (name === 'open') element.open = false;
      },
      focus() { focusState.activeElement = element; },
      setPointerCapture() {},
      releasePointerCapture() {},
      querySelector() { return null; },
      querySelectorAll(selector) {
        if (selector !== '.product-thumb' && selector !== '.product-dot') return [];
        if (!controlCacheForElement.has(selector)) {
          const className = selector.slice(1);
          controlCacheForElement.set(selector, tagsByClass(html, className).map(tag => {
            const control = makeElement();
            for (const match of tag.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) control.setAttribute(match[1], match[2]);
            classesOf(tag).forEach(name => control.classList.add(name));
            return control;
          }));
        }
        return controlCacheForElement.get(selector);
      },
      contains(node) { return node === element; }
    };

    Object.defineProperty(element, 'innerHTML', {
      get() { return html; },
      set(value) {
        html = String(value);
        controlCacheForElement.clear();
      }
    });

    if (id === 'product-lightbox') {
      element.showModal = function () {
        element.open = true;
        element.setAttribute('open', '');
      };
      element.close = function () {
        if (!element.open) return;
        element.open = false;
        element.removeAttribute('open');
        (element.listeners.close || []).forEach(fn => fn({ type: 'close' }));
      };
    }

    return element;
  }

  function ensureId(id) {
    if (elements[id]) return elements[id];
    const tag = idTag(type === 'catalog' ? elements.catalog.innerHTML : elements['product-page'].innerHTML, id);
    if (!tag) return null;
    const element = makeElement(id);
    for (const match of tag.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) element.setAttribute(match[1], match[2]);
    classesOf(tag).forEach(name => element.classList.add(name));
    if (id === 'product-main-image' || id === 'product-lightbox-image') {
      element.src = attr(tag, 'src');
      element.alt = attr(tag, 'alt');
    }
    elements[id] = element;
    return element;
  }

  if (type === 'catalog') {
    elements.catalog = makeElement('catalog');
    elements.pagination = makeElement('pagination');
    elements.count = makeElement('count');
    const galleries = list.filter(product => imagesOf(product).length > 1).map(product => makeCardGallery(product));
    elements.catalog.querySelectorAll = selector => selector === '.card-media' ? galleries.map(gallery => gallery.media) : [];
    elements.catalog.galleries = galleries;
  } else {
    elements['product-page'] = makeElement('product-page');
    elements['product-media'] = makeElement('product-media');
    elements['product-page'].querySelector = selector => selector === '.product-media' ? elements['product-media'] : null;
    const page = elements['product-page'];
    const baseQuery = page.querySelectorAll.bind(page);
    page.querySelectorAll = selector => selector === '.card-media' ? [] : baseQuery(selector);
  }

  const document = {
    body: makeElement('body'),
    title: '',
    listeners: {},
    get activeElement() { return focusState.activeElement; },
    getElementById(id) {
      if (elements[id]) return elements[id];
      if (id === 'product-main-image' || (type === 'product' && id.indexOf('product-lightbox') === 0) || (type === 'product' && id === 'product-main-trigger')) {
        return ensureId(id);
      }
      return null;
    },
    querySelector(selector) {
      if (selector.indexOf('meta[') === 0) {
        return { setAttribute(name, value) { meta[selector] = String(value); } };
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  };
  focusState.activeElement = document.body;

  const window = {
    TQR_PRODUCTS: list,
    location,
    history: { state: null, replaceState() {} },
    pageYOffset: 0,
    localStorage: { removeItem() {} },
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); }
  };

  vm.runInNewContext(mainSource, {
    window, document, URL, URLSearchParams, Date, Number, Math, Object, Array, String
  });
  (document.listeners.DOMContentLoaded || []).forEach(fn => fn());

  return {
    type,
    markup: type === 'catalog' ? elements.catalog.innerHTML : elements['product-page'].innerHTML,
    document,
    body: document.body,
    element: id => elements[id] || ensureId(id),
    controls: selector => elements['product-page'].querySelectorAll(selector),
    catalog: elements.catalog
  };
}

function makeCardGallery(product) {
  const images = imagesOf(product);
  const media = {
    classes: new Set(['card-media']),
    attributes: {},
    listeners: {},
    classList: {
      add(name) { media.classes.add(name); },
      remove(name) { media.classes.delete(name); },
      contains(name) { return media.classes.has(name); },
      toggle(name, force) {
        const enabled = force === undefined ? !media.classes.has(name) : Boolean(force);
        if (enabled) media.classes.add(name); else media.classes.delete(name);
        return enabled;
      }
    },
    addEventListener(type, fn) { media.listeners[type] = fn; },
    setAttribute(name, value) { media.attributes[name] = String(value); },
    getAttribute(name) { return media.attributes[name] || null; },
    querySelectorAll(selector) {
      if (selector === '.card-slide') return slides;
      if (selector === '.card-dot') return dots;
      return [];
    }
  };
  const slides = images.map((src, i) => {
    const classes = new Set(['card-slide']);
    if (i === 0) classes.add('is-active');
    return { classList: { contains(name) { return classes.has(name); }, toggle(name, force) { if (force) classes.add(name); else classes.delete(name); } } };
  });
  const dots = images.map((src, i) => {
    const classes = new Set(['card-dot']);
    if (i === 0) classes.add('is-active');
    return { classList: { contains(name) { return classes.has(name); }, toggle(name, force) { if (force) classes.add(name); else classes.delete(name); } } };
  });
  media.setAttribute('data-gallery-index', '0');
  media.setAttribute('data-gallery-count', String(images.length));
  return { product, media, slides, dots };
}

function fire(element, type, event) {
  const payload = Object.assign({
    target: element,
    preventDefault() { payload.defaultPrevented = true; },
    stopPropagation() { payload.propagationStopped = true; }
  }, event || {});
  (element.listeners[type] || []).forEach(fn => fn(payload));
  return payload;
}

function swipe(media, dx, dy, pointerId) {
  media.listeners.pointerdown({ isPrimary: true, pointerType: 'touch', pointerId: pointerId || 1, clientX: 100, clientY: 150 });
  media.listeners.pointermove({ pointerId: pointerId || 1, clientX: 100 + dx, clientY: 150 + dy });
  media.listeners.pointerup({ pointerId: pointerId || 1, clientX: 100 + dx, clientY: 150 + dy });
}

const multiProduct = products.find(product => imagesOf(product).length > 1);
assert.ok(multiProduct, 'a multi-image detail product exists');
const multiImages = imagesOf(multiProduct);

const detail = render('product', siteRoot + 'product.html?id=' + multiProduct.id, products);
const markup = detail.markup;

const triggerTag = markup.match(/<button\b[^>]*class="product-main-trigger"[^>]*>/);
assert.ok(triggerTag, 'the large detail image has an explicit zoom trigger');
assert.match(triggerTag[0], /type="button"/, 'the image trigger is not a form submit button');
assert.equal(attr(triggerTag[0], 'aria-haspopup'), 'dialog', 'the image trigger advertises a dialog');
assert.equal(attr(triggerTag[0], 'aria-controls'), 'product-lightbox', 'the image trigger points at the lightbox');
assert.match(decode(attr(triggerTag[0], 'aria-label')), /Open larger view/, 'the image trigger has an accessible name');
assert.match(markup, /<span class="product-zoom-hint"[^>]*>[\s\S]*?Zoom[\s\S]*?<\/span>/, 'a visible zoom hint sits on the image');
assert.equal((markup.match(/id="product-main-image"/g) || []).length, 1, 'the existing main gallery image remains unique');

const dialogTag = markup.match(/<dialog\b[^>]*class="product-lightbox"[^>]*>/);
assert.ok(dialogTag, 'the detail page contains a native dialog lightbox');
assert.equal(attr(dialogTag[0], 'aria-labelledby'), 'product-lightbox-title', 'the dialog is named by its title');
assert.equal(attr(dialogTag[0], 'aria-describedby'), 'product-lightbox-hint', 'the dialog is described by its hint');
assert.equal(attr(dialogTag[0], 'aria-modal'), 'true', 'the dialog is announced as modal, including the browserless fallback');
assert.match(markup, /<h2[^>]*id="product-lightbox-title"[^>]*>/, 'the dialog has an accessible visible title');
assert.match(markup, /<p[^>]*id="product-lightbox-hint"[^>]*>/, 'the dialog has a visible usage hint');
assert.match(markup, /id="product-lightbox-close"[^>]*aria-label="Close enlarged image"/, 'the dialog has a labelled close control');
assert.match(markup, /id="product-lightbox-zoom-in"[^>]*aria-label="Zoom in"/, 'zoom-in is visible and labelled');
assert.match(markup, /id="product-lightbox-zoom-out"[^>]*aria-label="Zoom out"/, 'zoom-out is visible and labelled');
assert.match(markup, /id="product-lightbox-reset"[^>]*aria-label="Reset zoom"/, 'reset is visible and labelled');
assert.match(markup, /id="product-lightbox-prev"[^>]*aria-label="Previous image"/, 'multi-image detail has a previous control');
assert.match(markup, /id="product-lightbox-next"[^>]*aria-label="Next image"/, 'multi-image detail has a next control');
for (const tag of tagsByClass(markup, 'product-lightbox-control')) {
  assert.equal(attr(tag, 'type'), 'button', 'lightbox controls never submit a form');
}
assert.match(cssSource, /\.product-lightbox::backdrop/, 'the lightbox provides a modal backdrop');
assert.match(cssSource, /\.product-lightbox-stage\s*\{[^}]*overflow\s*:\s*auto/, 'the zoom viewport scrolls when the image is larger than the screen');
assert.match(cssSource, /prefers-reduced-motion[\s\S]*product-lightbox/, 'the lightbox respects reduced-motion preferences');

const mainImage = detail.element('product-main-image');
const thumbs = detail.controls('.product-thumb');
const dots = detail.controls('.product-dot');
assert.equal(thumbs.length, multiImages.length, 'detail thumbnails are unchanged');
assert.equal(dots.length, multiImages.length, 'detail dots are unchanged');

fire(thumbs[1], 'click');
assert.equal(mainImage.src, multiImages[1], 'the page can select a non-first frame before opening');

const trigger = detail.element('product-main-trigger');
const dialog = detail.element('product-lightbox');
const lightboxImage = detail.element('product-lightbox-image');
const closeButton = detail.element('product-lightbox-close');
const zoomIn = detail.element('product-lightbox-zoom-in');
const zoomOut = detail.element('product-lightbox-zoom-out');
const reset = detail.element('product-lightbox-reset');
const prev = detail.element('product-lightbox-prev');
const next = detail.element('product-lightbox-next');
const stage = detail.element('product-lightbox-stage');

detail.body.style.overflow = 'auto';
trigger.focus();
fire(trigger, 'click');
assert.equal(dialog.open, true, 'activating the image opens the modal dialog');
assert.equal(dialog.classList.contains('is-open'), true, 'the open state is reflected on the dialog');
assert.equal(dialog.getAttribute('data-zoom'), '1', 'opening resets zoom to 1x');
assert.equal(lightboxImage.src, multiImages[1], 'the lightbox opens on the currently selected frame');
assert.equal(lightboxImage.alt, multiProduct.name + ' — image 2 of ' + multiImages.length, 'the lightbox uses the correct frame alt text');
assert.match(detail.element('product-lightbox-title').textContent, /image 2 of /, 'the dialog title follows the selected frame');
assert.equal(detail.document.activeElement, closeButton, 'focus moves inside the dialog');
assert.equal(detail.body.style.overflow, 'hidden', 'the background is scroll-locked while open');
assert.equal(zoomOut.disabled, true, 'zoom-out starts disabled at 1x');
assert.equal(reset.disabled, true, 'reset starts disabled at 1x');
assert.equal(zoomIn.disabled, false, 'zoom-in is available at 1x');

for (let i = 0; i < 12; i++) fire(zoomIn, 'click');
assert.equal(dialog.getAttribute('data-zoom'), '4', 'zoom stops at the 4x maximum');
assert.equal(zoomIn.disabled, true, 'zoom-in is disabled at the maximum');
assert.equal(zoomOut.disabled, false, 'zoom-out is available after zooming in');
assert.equal(reset.disabled, false, 'reset is available after zooming in');
assert.equal(lightboxImage.style.width, '400%', 'the zoomed image grows inside the scrollable viewport');
fire(zoomIn, 'click');
assert.equal(dialog.getAttribute('data-zoom'), '4', 'extra zoom-in clicks cannot exceed the maximum');

stage.scrollLeft = 10;
stage.scrollTop = 10;
fire(stage, 'pointerdown', { pointerId: 9, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
fire(stage, 'pointermove', { pointerId: 9, clientX: 60, clientY: 50 });
assert.equal(stage.scrollLeft, 50, 'a zoomed image can be dragged horizontally');
assert.equal(stage.scrollTop, 60, 'a zoomed image can be dragged vertically');
fire(stage, 'pointerup', { pointerId: 9 });

fire(zoomOut, 'click');
assert.equal(dialog.getAttribute('data-zoom'), '3.5', 'zoom-out steps down from the maximum');
fire(reset, 'click');
assert.equal(dialog.getAttribute('data-zoom'), '1', 'reset returns to 1x');
assert.equal(lightboxImage.style.width, 'auto', 'reset restores the fit-to-viewport width');
assert.equal(zoomOut.disabled, true, 'zoom-out is disabled again at 1x');
assert.equal(reset.disabled, true, 'reset is disabled again at 1x');
fire(zoomOut, 'click');
assert.equal(dialog.getAttribute('data-zoom'), '1', 'extra zoom-out clicks cannot go below 1x');

fire(next, 'click');
assert.equal(dialog.getAttribute('data-zoom'), '1', 'moving frames resets zoom to 1x');
assert.equal(lightboxImage.src, multiImages[2], 'next advances the lightbox frame');
assert.equal(mainImage.src, multiImages[2], 'next synchronizes the product main image');
assert.equal(dots[2].getAttribute('aria-pressed'), 'true', 'next synchronizes the product dots');
assert.equal(thumbs[2].classList.contains('is-active'), true, 'next synchronizes the product thumbnails');
fire(prev, 'click');
assert.equal(lightboxImage.src, multiImages[1], 'previous returns the lightbox to the prior frame');
assert.equal(mainImage.src, multiImages[1], 'previous synchronizes the product main image');
assert.equal(dots[1].classList.contains('is-active'), true, 'previous synchronizes the product dots');

fire(closeButton, 'click');
assert.equal(dialog.open, false, 'the close button closes the dialog');
assert.equal(dialog.classList.contains('is-open'), false, 'the open state is removed on close');
assert.equal(detail.body.style.overflow, 'auto', 'closing restores the previous page scroll style');
assert.equal(detail.document.activeElement, trigger, 'focus returns to the image trigger');
assert.equal(mainImage.src, multiImages[1], 'closing keeps the frame selected in the lightbox');

trigger.focus();
fire(trigger, 'click');
const cancel = fire(dialog, 'cancel');
assert.equal(cancel.defaultPrevented, true, 'the dialog handles Escape/cancel itself');
assert.equal(dialog.open, false, 'Escape closes the dialog');
assert.equal(detail.document.activeElement, trigger, 'Escape returns focus to the trigger');

trigger.focus();
fire(trigger, 'click');
fire(dialog, 'click', { target: dialog });
assert.equal(dialog.open, false, 'clicking the backdrop closes the dialog');
assert.equal(detail.document.activeElement, trigger, 'backdrop close returns focus to the trigger');

trigger.focus();
fire(trigger, 'click');
fire(dialog, 'click', { target: detail.element('product-lightbox-panel') });
assert.equal(dialog.open, true, 'clicking inside the dialog does not close it');
fire(closeButton, 'click');

const single = {
  id: 'single-lightbox', name: 'Single Lightbox Test', cat: 'Test', img: 'assets/img/single.png',
  images: ['assets/img/single.png'], slug: 'single-lightbox', formats: 'PNG', price: 1, order: 99,
  summary: 'A single-frame lightbox product.'
};
const singleDetail = render('product', siteRoot + 'product.html?id=single-lightbox', products.concat([single]));
assert.match(singleDetail.markup, /id="product-lightbox-zoom-in"/, 'single-image lightbox keeps zoom controls');
assert.match(singleDetail.markup, /id="product-lightbox-close"/, 'single-image lightbox keeps close');
assert.doesNotMatch(singleDetail.markup, /id="product-lightbox-prev"|id="product-lightbox-next"/,
  'single-image lightbox does not show navigation');
const singleTrigger = singleDetail.element('product-main-trigger');
const singleDialog = singleDetail.element('product-lightbox');
singleTrigger.focus();
fire(singleTrigger, 'click');
assert.equal(singleDialog.open, true, 'single-image lightbox opens');
assert.equal(singleDetail.element('product-lightbox-image').src, single.images[0], 'single-image lightbox shows its only frame');
fire(singleDetail.element('product-lightbox-zoom-in'), 'click');
assert.equal(singleDialog.getAttribute('data-zoom'), '1.5', 'single-image lightbox still zooms');
fire(singleDetail.element('product-lightbox-close'), 'click');

const fallbackDetail = render('product', siteRoot + 'product.html?id=' + multiProduct.id, products);
const fallbackDialog = fallbackDetail.element('product-lightbox');
fallbackDialog.showModal = undefined;
const fallbackTrigger = fallbackDetail.element('product-main-trigger');
fallbackTrigger.focus();
fire(fallbackTrigger, 'click');
assert.equal(fallbackDialog.hasAttribute('open'), true, 'browserless fallback opens with the dialog open attribute');
assert.equal(fallbackDialog.classList.contains('product-lightbox--fallback'), true, 'browserless fallback exposes its accessible overlay class');
assert.equal(fallbackDetail.body.style.overflow, 'hidden', 'browserless fallback still locks the page');
fire(fallbackDialog, 'keydown', { key: 'Escape' });
assert.equal(fallbackDialog.hasAttribute('open'), false, 'browserless fallback closes on Escape');
assert.equal(fallbackDetail.document.activeElement, fallbackTrigger, 'browserless fallback returns focus to the trigger');

const catalog = render('catalog', siteRoot, products);
assert.equal((catalog.markup.match(/<article class="card"/g) || []).length, 5, 'all five home cards still render');
assert.equal((catalog.markup.match(/<img\b[^>]*class="card-slide/g) || []).length, 17, 'all 17 home card images still render');
assert.doesNotMatch(catalog.markup, /product-main-trigger|product-lightbox/, 'home cards do not get the detail lightbox');
for (const product of products) {
  const cardTag = catalog.markup.match(new RegExp('<a class="card-media"[^>]*href="product\\.html\\?id=' + product.id + '"[^>]*>'));
  assert.ok(cardTag, product.id + ' home card still links directly to its product page');
  assert.equal(attr(cardTag[0], 'data-gallery-index'), '0', product.id + ' home card still starts at its first image');
}
const firstCardGallery = catalog.catalog.galleries[0];
swipe(firstCardGallery.media, -60, 0, 3);
assert.equal(firstCardGallery.media.getAttribute('data-gallery-index'), '1', 'home card swipe still advances images');
assert.equal(firstCardGallery.slides[1].classList.contains('is-active'), true, 'home card swipe still swaps slides');
assert.equal(firstCardGallery.dots[1].classList.contains('is-active'), true, 'home card swipe still synchronizes dots');

const firstBuyTag = catalog.markup.match(/<a class="card-btn" href="([^"]+)"[^>]*>/);
assert.ok(firstBuyTag, 'home card Buy link still renders');
const buyURL = new URL(decode(firstBuyTag[1]));
assert.equal(buyURL.origin + buyURL.pathname, checkoutRoot, 'home card checkout host is unchanged');
assert.equal(buyURL.searchParams.get('product'), products[0].slug, 'home card checkout slug is unchanged');
assert.equal(buyURL.searchParams.get('quantity'), '1', 'home card checkout quantity is unchanged');
assert.equal(buyURL.searchParams.get('referrer'), siteRoot + '#product-card-' + encodeURIComponent(products[0].id),
  'home card checkout referrer is unchanged');

for (const path of ['../index.html', '../product.html']) {
  const html = fs.readFileSync(require.resolve(path), 'utf8');
  assert.match(html, /assets\/main\.js\?v=31/, path + ' loads the cache-busted lightbox renderer');
  assert.match(html, /assets\/style\.css\?v=33/, path + ' loads the cache-busted lightbox styles');
  assert.match(html, /assets\/data\.js\?v=24/, path + ' keeps the unchanged data cache version');
}

process.stdout.write('PASS detail image opens an accessible zoomable dialog lightbox that syncs with the product gallery while home cards and checkout stay unchanged\n');
