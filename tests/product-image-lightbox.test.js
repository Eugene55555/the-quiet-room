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
    rect: { left: 0, top: 0, width: 1000, height: 800 },
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
    focus() { detailFocus.activeElement = element; },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect() { return element.rect; },
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

const detailFocus = { activeElement: null };

function render(type, href, list) {
  const location = new URL(href);
  const elements = {};
  const meta = {};

  function ensureId(id) {
    if (elements[id]) return elements[id];
    const html = type === 'catalog' ? elements.catalog.innerHTML : elements['product-page'].innerHTML;
    const tag = idTag(html, id);
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
    get activeElement() { return detailFocus.activeElement; },
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
  detailFocus.activeElement = document.body;

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
  media.setAttribute('data-gallery-index', '0');
  media.setAttribute('data-gallery-count', String(images.length));
  return { product, media, slides, dots };
}

function fire(element, type, event) {
  const payload = Object.assign({
    target: element,
    timeStamp: 1000,
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
assert.ok(triggerTag, 'the large detail image has an explicit viewer trigger');
assert.equal(attr(triggerTag[0], 'aria-haspopup'), 'dialog', 'the image trigger advertises a dialog');
assert.equal(attr(triggerTag[0], 'aria-controls'), 'product-lightbox', 'the image trigger points at the viewer');
assert.match(decode(attr(triggerTag[0], 'aria-label')), /Open larger view/, 'the image trigger has an accessible name');

const dialogTag = markup.match(/<dialog\b[^>]*class="product-lightbox"[^>]*>/);
assert.ok(dialogTag, 'the detail page contains a native dialog viewer');
assert.equal(attr(dialogTag[0], 'aria-labelledby'), 'product-lightbox-title', 'the dialog is named by its title');
assert.equal(attr(dialogTag[0], 'aria-describedby'), 'product-lightbox-hint', 'the dialog is described by its hint');
assert.equal(attr(dialogTag[0], 'aria-modal'), 'true', 'the viewer is announced as modal');
assert.match(markup, /<h2[^>]*id="product-lightbox-title"[^>]*>/, 'the dialog has an accessible title');
assert.match(markup, /<p[^>]*id="product-lightbox-hint"[^>]*>/, 'the dialog has an accessible usage hint');
assert.match(markup, /id="product-lightbox-close"[^>]*aria-label="Close image viewer"/, 'the viewer has a labelled compact close control');
assert.match(markup, /id="product-lightbox-prev"[^>]*aria-label="Previous image"/, 'multi-image detail has a previous arrow');
assert.match(markup, /id="product-lightbox-next"[^>]*aria-label="Next image"/, 'multi-image detail has a next arrow');
assert.match(markup, /id="product-lightbox-count"[^>]*aria-live="polite"[^>]*>1 \/ \d+</, 'multi-image detail shows a small image count');
assert.doesNotMatch(markup, /product-lightbox-controls|product-lightbox-panel|product-lightbox-head|product-lightbox-zoom-value/, 'the viewer has no toolbar, header or panel');
assert.doesNotMatch(markup, /id="product-lightbox-(?:zoom-in|zoom-out|reset)"/, 'the viewer has no zoom buttons or reset control');
for (const tag of tagsByClass(markup, 'product-lightbox-arrow')) {
  assert.equal(attr(tag, 'type'), 'button', 'viewer arrows never submit a form');
}
assert.match(cssSource, /\.product-lightbox::backdrop/, 'the viewer provides a modal backdrop');
assert.match(cssSource, /\.product-lightbox-stage\s*\{[^}]*touch-action\s*:\s*none/, 'the viewer stage owns touch gestures');
assert.match(cssSource, /prefers-reduced-motion[\s\S]*product-lightbox/, 'the viewer respects reduced-motion preferences');
assert.doesNotMatch(cssSource, /\.product-lightbox-controls|\.product-lightbox-panel|\.product-lightbox-zoom-value/, 'the old toolbar styles are gone');

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
const prev = detail.element('product-lightbox-prev');
const next = detail.element('product-lightbox-next');
const count = detail.element('product-lightbox-count');
const stage = detail.element('product-lightbox-stage');
const title = detail.element('product-lightbox-title');

detail.body.style.overflow = 'auto';
trigger.focus();
fire(trigger, 'click');
assert.equal(dialog.open, true, 'activating the image opens the modal dialog');
assert.equal(dialog.classList.contains('is-open'), true, 'the open state is reflected on the dialog');
assert.equal(dialog.getAttribute('data-zoom'), '1', 'opening starts at 1x');
assert.equal(lightboxImage.src, multiImages[1], 'the viewer opens on the currently selected frame');
assert.equal(lightboxImage.alt, multiProduct.name + ' — image 2 of ' + multiImages.length, 'the viewer uses the correct frame alt text');
assert.match(title.textContent, /image 2 of /, 'the dialog title follows the selected frame');
assert.equal(detail.document.activeElement, closeButton, 'focus moves to the compact close control');
assert.equal(detail.body.style.overflow, 'hidden', 'the background is scroll-locked while open');
assert.equal(stage.style.touchAction, 'none', 'the open viewer owns touch gestures');

const wheelIn = fire(stage, 'wheel', { deltaY: -100, clientX: 700, clientY: 400 });
assert.equal(wheelIn.defaultPrevented, true, 'wheel zoom keeps the page from scrolling behind the viewer');
assert.equal(dialog.getAttribute('data-zoom'), '1.5', 'wheel up zooms in inside the viewer');
assert.equal(dialog.getAttribute('data-pan-x'), '-100', 'wheel zoom keeps the pointer position anchored horizontally');
assert.equal(dialog.getAttribute('data-pan-y'), '0', 'wheel zoom keeps the pointer position anchored vertically');
fire(stage, 'wheel', { deltaY: -100, clientX: 700, clientY: 400 });
assert.equal(dialog.getAttribute('data-zoom'), '2', 'repeated wheel zoom scales further around the same point');
assert.equal(dialog.getAttribute('data-pan-x'), '-200', 'the anchored point stays under the pointer across wheel steps');
fire(stage, 'wheel', { deltaY: 100, clientX: 700, clientY: 400 });
fire(stage, 'wheel', { deltaY: 100, clientX: 700, clientY: 400 });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'wheel down zooms back to the 1x minimum');
assert.equal(dialog.getAttribute('data-pan-x'), '0', 'returning to 1x clears the anchored offset');
for (let i = 0; i < 20; i++) fire(stage, 'wheel', { deltaY: -100, clientX: 700, clientY: 400 });
assert.equal(dialog.getAttribute('data-zoom'), '4', 'wheel zoom clamps at the 4x maximum');
for (let i = 0; i < 20; i++) fire(stage, 'wheel', { deltaY: 100, clientX: 700, clientY: 400 });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'wheel zoom clamps at the 1x minimum');

const doubleClickIn = fire(stage, 'dblclick', { target: lightboxImage, clientX: 600, clientY: 400 });
assert.equal(doubleClickIn.defaultPrevented, true, 'double-click zoom owns the gesture');
assert.equal(dialog.getAttribute('data-zoom'), '2', 'desktop double-click toggles 1x to 2x');
assert.equal(dialog.getAttribute('data-pan-x'), '-100', 'double-click zoom is anchored at the clicked point');
fire(stage, 'dblclick', { target: lightboxImage, clientX: 600, clientY: 400 });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'desktop double-click toggles 2x back to 1x');
assert.equal(dialog.getAttribute('data-pan-x'), '0', 'double-click reset clears the pan offset');

const plus = fire(dialog, 'keydown', { key: '+' });
assert.equal(plus.defaultPrevented, true, 'keyboard zoom owns the key');
assert.equal(dialog.getAttribute('data-zoom'), '1.5', 'the plus key zooms in');
fire(dialog, 'keydown', { key: '=' });
assert.equal(dialog.getAttribute('data-zoom'), '2', 'the equals key also zooms in');
fire(dialog, 'keydown', { key: '-' });
assert.equal(dialog.getAttribute('data-zoom'), '1.5', 'the minus key zooms out');
fire(dialog, 'keydown', { key: '0' });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'the zero key resets zoom');
for (let i = 0; i < 20; i++) fire(dialog, 'keydown', { key: '+' });
assert.equal(dialog.getAttribute('data-zoom'), '4', 'keyboard zoom clamps at the 4x maximum');
for (let i = 0; i < 20; i++) fire(dialog, 'keydown', { key: '-' });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'keyboard zoom clamps at the 1x minimum');

fire(stage, 'pointerdown', { pointerId: 31, pointerType: 'touch', clientX: 50, clientY: 50, timeStamp: 1000 });
fire(stage, 'pointerdown', { pointerId: 32, pointerType: 'touch', clientX: 150, clientY: 50, timeStamp: 1000 });
const pinchOut = fire(stage, 'pointermove', { pointerId: 32, pointerType: 'touch', clientX: 250, clientY: 50, timeStamp: 1000 });
assert.equal(pinchOut.defaultPrevented, true, 'pinch zoom owns the touch gesture');
assert.equal(dialog.getAttribute('data-zoom'), '2', 'pinching two touch pointers apart zooms from 1x to 2x');
fire(stage, 'pointerup', { pointerId: 31, pointerType: 'touch', timeStamp: 1000 });
fire(stage, 'pointerup', { pointerId: 32, pointerType: 'touch', timeStamp: 1000 });

fire(stage, 'pointerdown', { pointerId: 35, pointerType: 'touch', clientX: 0, clientY: 50, timeStamp: 1000 });
fire(stage, 'pointerdown', { pointerId: 36, pointerType: 'touch', clientX: 100, clientY: 50, timeStamp: 1000 });
fire(stage, 'pointermove', { pointerId: 36, pointerType: 'touch', clientX: 1000, clientY: 50, timeStamp: 1000 });
assert.equal(dialog.getAttribute('data-zoom'), '4', 'pinch zoom clamps at the 4x maximum');
fire(stage, 'pointerup', { pointerId: 35, pointerType: 'touch', timeStamp: 1000 });
fire(stage, 'pointerup', { pointerId: 36, pointerType: 'touch', timeStamp: 1000 });

fire(stage, 'pointerdown', { pointerId: 37, pointerType: 'touch', clientX: 0, clientY: 50, timeStamp: 1000 });
fire(stage, 'pointerdown', { pointerId: 38, pointerType: 'touch', clientX: 1000, clientY: 50, timeStamp: 1000 });
fire(stage, 'pointermove', { pointerId: 38, pointerType: 'touch', clientX: 10, clientY: 50, timeStamp: 1000 });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'pinch zoom clamps at the 1x minimum');
fire(stage, 'pointerup', { pointerId: 37, pointerType: 'touch', timeStamp: 1000 });
fire(stage, 'pointerup', { pointerId: 38, pointerType: 'touch', timeStamp: 1000 });

fire(stage, 'pointerdown', { pointerId: 41, pointerType: 'touch', clientX: 300, clientY: 300, timeStamp: 1000 });
fire(stage, 'pointerup', { pointerId: 41, pointerType: 'touch', clientX: 300, clientY: 300, timeStamp: 1050 });
fire(stage, 'pointerdown', { pointerId: 42, pointerType: 'touch', clientX: 302, clientY: 302, timeStamp: 1200 });
fire(stage, 'pointerup', { pointerId: 42, pointerType: 'touch', clientX: 302, clientY: 302, timeStamp: 1250 });
assert.equal(dialog.getAttribute('data-zoom'), '2', 'touch double-tap toggles 1x to 2x');
fire(dialog, 'click', { target: stage, timeStamp: 1300 });
assert.equal(dialog.open, true, 'the click synthesized by a double-tap does not close the viewer');
fire(stage, 'pointerdown', { pointerId: 43, pointerType: 'touch', clientX: 302, clientY: 302, timeStamp: 2000 });
fire(stage, 'pointerup', { pointerId: 43, pointerType: 'touch', clientX: 302, clientY: 302, timeStamp: 2050 });
fire(stage, 'pointerdown', { pointerId: 44, pointerType: 'touch', clientX: 300, clientY: 300, timeStamp: 2200 });
fire(stage, 'pointerup', { pointerId: 44, pointerType: 'touch', clientX: 300, clientY: 300, timeStamp: 2250 });
assert.equal(dialog.getAttribute('data-zoom'), '1', 'touch double-tap toggles 2x back to 1x');
fire(dialog, 'click', { target: stage, timeStamp: 2300 });
assert.equal(dialog.open, true, 'the click synthesized by the reset double-tap does not close the viewer');

fire(dialog, 'keydown', { key: '=' });
fire(dialog, 'keydown', { key: '=' });
const panBeforeX = Number(dialog.getAttribute('data-pan-x'));
const panBeforeY = Number(dialog.getAttribute('data-pan-y'));
fire(stage, 'pointerdown', { pointerId: 51, pointerType: 'touch', clientX: 100, clientY: 100, timeStamp: 3000 });
fire(stage, 'pointermove', { pointerId: 51, pointerType: 'touch', clientX: 130, clientY: 120, timeStamp: 3010 });
assert.equal(Number(dialog.getAttribute('data-pan-x')), panBeforeX + 30, 'a zoomed image pans horizontally by touch');
assert.equal(Number(dialog.getAttribute('data-pan-y')), panBeforeY + 20, 'a zoomed image pans vertically by touch');
fire(stage, 'pointerup', { pointerId: 51, pointerType: 'touch', clientX: 130, clientY: 120, timeStamp: 3020 });
fire(dialog, 'click', { target: stage, timeStamp: 3050 });
assert.equal(dialog.open, true, 'the click synthesized after a touch pan does not close the viewer');

fire(dialog, 'keydown', { key: '0' });
fire(dialog, 'keydown', { key: '=' });
fire(dialog, 'keydown', { key: '=' });
fire(stage, 'pointerdown', { pointerId: 60, pointerType: 'mouse', button: 0, clientX: 200, clientY: 200, timeStamp: 4000 });
fire(stage, 'pointermove', { pointerId: 60, pointerType: 'mouse', clientX: 240, clientY: 230, timeStamp: 4010 });
assert.equal(dialog.getAttribute('data-pan-x'), '40', 'a zoomed image pans horizontally by mouse drag');
assert.equal(dialog.getAttribute('data-pan-y'), '30', 'a zoomed image pans vertically by mouse drag');
fire(stage, 'pointerup', { pointerId: 60, pointerType: 'mouse', timeStamp: 4020 });
fire(dialog, 'click', { target: stage, timeStamp: 4050 });
assert.equal(dialog.open, true, 'the click synthesized after a mouse pan does not close the viewer');
fire(dialog, 'keydown', { key: '0' });

fire(next, 'click');
assert.equal(lightboxImage.src, multiImages[2], 'next advances the viewer frame');
assert.equal(count.textContent, '3 / ' + multiImages.length, 'the image count follows the viewer frame');
assert.equal(mainImage.src, multiImages[2], 'next synchronizes the product main image');
assert.equal(dots[2].getAttribute('aria-pressed'), 'true', 'next synchronizes the product dots');
assert.equal(thumbs[2].classList.contains('is-active'), true, 'next synchronizes the product thumbnails');
fire(prev, 'click');
assert.equal(lightboxImage.src, multiImages[1], 'previous returns the viewer to the prior frame');
assert.equal(mainImage.src, multiImages[1], 'previous synchronizes the product main image');
assert.equal(dots[1].classList.contains('is-active'), true, 'previous synchronizes the product dots');

const right = fire(dialog, 'keydown', { key: 'ArrowRight' });
assert.equal(right.defaultPrevented, true, 'the right arrow key owns frame navigation');
assert.equal(lightboxImage.src, multiImages[2], 'the right arrow key advances the viewer frame');
assert.equal(count.textContent, '3 / ' + multiImages.length, 'the right arrow key updates the image count');
assert.equal(mainImage.src, multiImages[2], 'the right arrow key synchronizes the product main image');
fire(dialog, 'keydown', { key: 'ArrowLeft' });
assert.equal(lightboxImage.src, multiImages[1], 'the left arrow key returns to the prior frame');
assert.equal(count.textContent, '2 / ' + multiImages.length, 'the left arrow key updates the image count');

fire(closeButton, 'click');
assert.equal(dialog.open, false, 'the close button closes the dialog');
assert.equal(dialog.classList.contains('is-open'), false, 'the open state is removed on close');
assert.equal(detail.body.style.overflow, 'auto', 'closing restores the previous page scroll style');
assert.equal(detail.document.activeElement, trigger, 'focus returns to the image trigger');
assert.equal(mainImage.src, multiImages[1], 'closing keeps the frame selected in the viewer');
assert.equal(stage.style.touchAction, '', 'closing restores the stage touch-action');

trigger.focus();
fire(trigger, 'click');
const cancel = fire(dialog, 'cancel');
assert.equal(cancel.defaultPrevented, true, 'the dialog handles Escape/cancel itself');
assert.equal(dialog.open, false, 'Escape closes the dialog');
assert.equal(detail.document.activeElement, trigger, 'Escape returns focus to the trigger');

trigger.focus();
fire(trigger, 'click');
fire(dialog, 'click', { target: lightboxImage });
assert.equal(dialog.open, true, 'clicking the image never closes the viewer');
fire(dialog, 'click', { target: stage });
assert.equal(dialog.open, false, 'clicking the empty overlay closes the viewer');
assert.equal(detail.document.activeElement, trigger, 'overlay close returns focus to the trigger');

trigger.focus();
fire(trigger, 'click');
assert.equal(detail.document.activeElement, closeButton, 'focus is trapped inside the viewer');
fire(dialog, 'keydown', { key: 'Tab' });
assert.equal(detail.document.activeElement, prev, 'Tab from the last control wraps to the first arrow');
fire(dialog, 'keydown', { key: 'Tab', shiftKey: true });
assert.equal(detail.document.activeElement, closeButton, 'Shift+Tab from the first arrow wraps to the last control');
fire(closeButton, 'click');

const single = {
  id: 'single-lightbox', name: 'Single Lightbox Test', cat: 'Test', img: 'assets/img/single.png',
  images: ['assets/img/single.png'], slug: 'single-lightbox', formats: 'PNG', price: 1, order: 99,
  summary: 'A single-frame lightbox product.'
};
const singleDetail = render('product', siteRoot + 'product.html?id=single-lightbox', products.concat([single]));
assert.match(singleDetail.markup, /id="product-lightbox-close"/, 'single-image viewer keeps close');
assert.doesNotMatch(singleDetail.markup, /id="product-lightbox-prev"|id="product-lightbox-next"/,
  'single-image viewer does not show navigation arrows');
assert.doesNotMatch(singleDetail.markup, /id="product-lightbox-count"/, 'single-image viewer does not show an image count');
const singleTrigger = singleDetail.element('product-main-trigger');
const singleDialog = singleDetail.element('product-lightbox');
singleTrigger.focus();
fire(singleTrigger, 'click');
assert.equal(singleDialog.open, true, 'single-image viewer opens');
assert.equal(singleDetail.element('product-lightbox-image').src, single.images[0], 'single-image viewer shows its only frame');
const singleStage = singleDetail.element('product-lightbox-stage');
fire(singleStage, 'wheel', { deltaY: -100, clientX: 600, clientY: 400 });
assert.equal(singleDialog.getAttribute('data-zoom'), '1.5', 'single-image viewer supports wheel zoom');
fire(singleStage, 'dblclick', { target: singleDetail.element('product-lightbox-image'), clientX: 600, clientY: 400 });
assert.equal(singleDialog.getAttribute('data-zoom'), '1', 'single-image viewer double-click resets zoom');
fire(singleDialog, 'keydown', { key: '+' });
assert.equal(singleDialog.getAttribute('data-zoom'), '1.5', 'single-image viewer supports keyboard zoom');
fire(singleDialog, 'keydown', { key: '0' });
assert.equal(singleDialog.getAttribute('data-zoom'), '1', 'single-image viewer keyboard reset works');
fire(singleDetail.element('product-lightbox-close'), 'click');

const catalog = render('catalog', siteRoot, products);
assert.equal((catalog.markup.match(/<article class="card"/g) || []).length, 5, 'all five home cards still render');
assert.equal((catalog.markup.match(/<img\b[^>]*class="card-slide/g) || []).length, 17, 'all 17 home card images still render');
assert.doesNotMatch(catalog.markup, /product-main-trigger|product-lightbox/, 'home cards do not get the detail viewer');
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
  assert.match(html, /assets\/main\.js\?v=33/, path + ' loads the cache-busted minimal viewer renderer');
  assert.match(html, /assets\/style\.css\?v=34/, path + ' loads the cache-busted minimal viewer styles');
  assert.match(html, /assets\/data\.js\?v=24/, path + ' keeps the unchanged data cache version');
}

process.stdout.write('PASS detail image opens a minimal full-screen viewer with no toolbar and stays synchronized with the gallery\n');
