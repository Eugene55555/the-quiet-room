'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const siteRoot = 'https://eugene55555.github.io/the-quiet-room/';
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');
const photoswipeCssPath = path.resolve(__dirname, '../assets/vendor/photoswipe/photoswipe.css');
const photoswipeCssSource = fs.existsSync(photoswipeCssPath) ? fs.readFileSync(photoswipeCssPath, 'utf8') : '';
const photoswipeLicensePath = path.resolve(__dirname, '../assets/vendor/photoswipe/LICENSE');
const photoswipeLicense = fs.existsSync(photoswipeLicensePath) ? fs.readFileSync(photoswipeLicensePath, 'utf8') : '';

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

function idTag(html, id) {
  const match = html.match(new RegExp('<[^>]+\\bid="' + id + '"[^>]*>'));
  return match ? match[0] : '';
}

function buttonBlocksByClass(html, className) {
  return [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
    .map(match => match[0])
    .filter(block => classesOf(block.match(/^<button\b[^>]*>/)[0]).includes(className));
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

function renderProduct(href, list, reduceMotion) {
  const location = new URL(href);
  const focusState = { activeElement: null };
  const elements = {};
  const meta = {};
  const photoSwipeLightboxes = [];

  function makeElement(id) {
    const classes = new Set();
    const listeners = {};
    const attributes = {};
    let html = '';
    const controlCache = new Map();
    const element = {
      id: id || '',
      textContent: '',
      value: '',
      src: '',
      alt: '',
      currentSrc: '',
      naturalWidth: 0,
      naturalHeight: 0,
      complete: false,
      childImage: null,
      style: {},
      listeners,
      attributes,
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
      setAttribute(name, value) { attributes[name] = String(value); },
      getAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null; },
      hasAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name); },
      removeAttribute(name) { delete attributes[name]; },
      focus() { focusState.activeElement = element; },
      getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 800 }; },
      querySelector(selector) { return selector === 'img' ? element.childImage : null; },
      querySelectorAll(selector) {
        if (selector !== '.product-thumb' && selector !== '.product-dot') return [];
        if (!controlCache.has(selector)) {
          const className = selector.slice(1);
          const controls = buttonBlocksByClass(html, className).map((block, index) => {
            const openingTag = block.match(/^<button\b[^>]*>/)[0];
            const control = makeElement();
            for (const match of openingTag.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) {
              control.setAttribute(match[1], match[2]);
            }
            classesOf(openingTag).forEach(name => control.classList.add(name));
            const imageTag = block.match(/<img\b[^>]*>/);
            if (className === 'product-thumb' && imageTag) {
              const image = makeElement('product-thumb-image-' + index);
              for (const match of imageTag[0].matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) {
                image.setAttribute(match[1], match[2]);
              }
              image.src = decode(attr(imageTag[0], 'src'));
              image.currentSrc = image.src;
              image.alt = decode(attr(imageTag[0], 'alt'));
              image.naturalWidth = 1200 + index;
              image.naturalHeight = 900 + index;
              image.complete = true;
              control.childImage = image;
            }
            return control;
          });
          controlCache.set(selector, controls);
        }
        return controlCache.get(selector);
      }
    };
    Object.defineProperty(element, 'innerHTML', {
      get() { return html; },
      set(value) { html = String(value); controlCache.clear(); }
    });
    return element;
  }

  const page = makeElement('product-page');
  const media = makeElement('product-media');
  page.querySelector = selector => selector === '.product-media' ? media : null;
  const baseQuerySelectorAll = page.querySelectorAll.bind(page);
  page.querySelectorAll = selector => selector === '.card-media' ? [] : baseQuerySelectorAll(selector);
  elements['product-page'] = page;
  elements['product-media'] = media;

  function ensureId(id) {
    if (elements[id]) return elements[id];
    const tag = idTag(page.innerHTML, id);
    if (!tag) return null;
    const element = makeElement(id);
    for (const match of tag.matchAll(/([a-zA-Z][\w-]*)="([^"]*)"/g)) {
      element.setAttribute(match[1], match[2]);
    }
    classesOf(tag).forEach(name => element.classList.add(name));
    if (id === 'product-main-image') {
      element.src = decode(attr(tag, 'src'));
      element.currentSrc = element.src;
      element.alt = decode(attr(tag, 'alt'));
      element.naturalWidth = 1200;
      element.naturalHeight = 1200;
      element.complete = true;
    }
    elements[id] = element;
    return element;
  }

  const body = makeElement('body');
  const document = {
    body,
    title: '',
    listeners: {},
    get activeElement() { return focusState.activeElement; },
    getElementById(id) {
      if (elements[id]) return elements[id];
      if (id === 'product-main-image' || id === 'product-main-trigger' || id === 'year') return ensureId(id);
      return null;
    },
    querySelector(selector) {
      if (selector.startsWith('meta[')) return { setAttribute(name, value) { meta[selector] = String(value); } };
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  };
  focusState.activeElement = body;

  function FakePhotoSwipe() {}
  class FakePhotoSwipeLightbox {
    constructor(options) {
      this.options = options;
      this.listeners = {};
      this.calls = [];
      this.initialized = false;
      this.pswp = undefined;
      photoSwipeLightboxes.push(this);
    }
    on(name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); }
    init() { this.initialized = true; }
    loadAndOpen(index, dataSource) {
      this.calls.push({ index, dataSource });
      this.pswp = { currIndex: index, element: makeElement('pswp-root') };
      (this.listeners.afterInit || []).forEach(fn => fn({ type: 'afterInit' }));
      (this.listeners.change || []).forEach(fn => fn({ type: 'change' }));
      return true;
    }
    emit(name) { (this.listeners[name] || []).forEach(fn => fn({ type: name })); }
  }
  function FakeImage() {
    this.naturalWidth = 1600;
    this.naturalHeight = 1400;
    this.complete = true;
    this.onload = null;
    this.onerror = null;
    Object.defineProperty(this, 'src', {
      get: () => this._src || '',
      set: value => {
        this._src = value;
        this.currentSrc = value;
        if (this.onload) this.onload();
      }
    });
  }

  const window = {
    TQR_PRODUCTS: list,
    location,
    history: { state: null, replaceState() {} },
    pageYOffset: 0,
    localStorage: { removeItem() {} },
    PhotoSwipe: FakePhotoSwipe,
    PhotoSwipeLightbox: FakePhotoSwipeLightbox,
    Image: FakeImage,
    addEventListener() {},
    requestAnimationFrame(fn) { fn(); },
    matchMedia() { return { matches: Boolean(reduceMotion) }; },
    scrollTo() {}
  };

  vm.runInNewContext(mainSource, { window, document, URL, URLSearchParams, Date, Number, Math, Object, Array, String, Promise });
  (document.listeners.DOMContentLoaded || []).forEach(fn => fn());

  return {
    markup: page.innerHTML,
    document,
    body,
    element: ensureId,
    controls: selector => page.querySelectorAll(selector),
    photoSwipeLightboxes,
    PhotoSwipe: FakePhotoSwipe
  };
}

async function flushOpen() {
  await new Promise(resolve => setImmediate(resolve));
}

async function run() {
  const multiProduct = products.find(product => imagesOf(product).length > 1);
  assert.ok(multiProduct, 'a product with multiple images exists');
  const images = imagesOf(multiProduct);
  const detail = renderProduct(siteRoot + 'product.html?id=' + multiProduct.id, products);
  const triggerTag = detail.markup.match(/<button\b[^>]*class="product-main-trigger"[^>]*>/);
  assert.ok(triggerTag, 'the main image retains a button trigger');
  assert.equal(attr(triggerTag[0], 'aria-haspopup'), 'dialog', 'the trigger announces the accessible gallery dialog');
  assert.match(decode(attr(triggerTag[0], 'aria-label')), /Open larger view/, 'the trigger has an accessible name');
  assert.doesNotMatch(detail.markup, /<dialog\b|product-lightbox-stage|product-lightbox-image/, 'the bespoke viewer markup is removed');

  const mainImage = detail.element('product-main-image');
  const trigger = detail.element('product-main-trigger');
  const media = detail.element('product-media');
  const thumbs = detail.controls('.product-thumb');
  const dots = detail.controls('.product-dot');
  assert.equal(thumbs.length, images.length, 'all product thumbnails remain available');
  assert.equal(dots.length, images.length, 'all product image dots remain available');

  const swipeStartIndex = Math.min(2, images.length - 1);
  fire(dots[swipeStartIndex], 'click');
  assert.equal(mainImage.src, images[swipeStartIndex], 'dot selection still changes the main image');
  assert.equal(dots[swipeStartIndex].getAttribute('aria-pressed'), 'true', 'dot selection synchronizes its active state');
  fire(media, 'pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: 120, clientY: 90 });
  fire(media, 'pointermove', { pointerId: 7, pointerType: 'touch', clientX: 50, clientY: 92 });
  fire(media, 'pointerup', { pointerId: 7, pointerType: 'touch', clientX: 50, clientY: 92 });
  const swipedIndex = (swipeStartIndex + 1) % images.length;
  assert.equal(mainImage.src, images[swipedIndex], 'swiping the main image advances the gallery');
  assert.equal(media.getAttribute('data-gallery-index'), String(swipedIndex), 'swiping updates the gallery index');
  assert.equal(thumbs[swipedIndex].getAttribute('aria-pressed'), 'true', 'swiping synchronizes the thumbnail state');
  assert.equal(dots[swipedIndex].getAttribute('aria-pressed'), 'true', 'swiping synchronizes the dot state');
  fire(thumbs[1], 'click');
  assert.equal(mainImage.src, images[1], 'thumbnail selection still changes the main image');
  fire(trigger, 'click');
  await flushOpen();

  assert.equal(detail.photoSwipeLightboxes.length, 1, 'opening the image creates one PhotoSwipe lightbox');
  const lightbox = detail.photoSwipeLightboxes[0];
  assert.equal(lightbox.initialized, true, 'PhotoSwipe lightbox is initialized once');
  assert.equal(lightbox.calls.length, 1, 'the library opens from the main image trigger');
  assert.equal(lightbox.calls[0].index, 1, 'the viewer opens on the currently selected image');
  assert.equal(lightbox.pswp.element.getAttribute('aria-label'), 'Image viewer for ' + multiProduct.name,
    'the PhotoSwipe dialog receives an accessible product-specific name');
  assert.equal(lightbox.pswp.element.getAttribute('aria-modal'), 'true', 'the PhotoSwipe dialog is marked modal');
  assert.equal(lightbox.options.pswpModule, detail.PhotoSwipe, 'the PhotoSwipe core UMD module is passed to the lightbox');
  assert.equal(lightbox.options.imageClickAction, 'zoom', 'single click zooms instead of closing');
  assert.equal(lightbox.options.doubleTapAction, 'zoom', 'double tap zoom is delegated to PhotoSwipe');
  assert.equal(lightbox.options.tapAction, 'toggle-controls', 'single tap toggles PhotoSwipe controls');
  assert.equal(lightbox.options.bgClickAction, 'close', 'clicking the backdrop closes the viewer');
  assert.equal(lightbox.options.wheelToZoom, true, 'mouse-wheel zoom is enabled');
  assert.equal(lightbox.options.initialZoomLevel, 'fit', 'the image initially fits the viewport');
  assert.equal(lightbox.options.secondaryZoomLevel({ fit: 0.35 }), 0.7, 'one click zooms to twice the fitted size');
  assert.equal(lightbox.options.showHideAnimationType, 'fade', 'opening does not depend on custom thumbnail animation bounds');
  assert.equal(lightbox.options.bgOpacity, 0.94, 'the modal backdrop is deliberately opaque');
  assert.equal(lightbox.options.trapFocus, true, 'keyboard focus remains inside the viewer');
  assert.equal(lightbox.options.returnFocus, true, 'focus returns to the image trigger after close');
  assert.equal(lightbox.options.zoom, false, 'the default zoom toolbar button is hidden in favor of image gestures');
  assert.equal(lightbox.options.arrowPrev, true, 'multi-image galleries show a previous control');
  assert.equal(lightbox.options.arrowNext, true, 'multi-image galleries show a next control');
  assert.equal(lightbox.options.counter, true, 'multi-image galleries show a compact image counter');

  const slides = lightbox.calls[0].dataSource;
  assert.equal(slides.length, images.length, 'the library receives every product image');
  for (let index = 0; index < slides.length; index++) {
    const thumbImage = thumbs[index].querySelector('img');
    assert.equal(slides[index].src, images[index], 'slide ' + index + ' keeps the original product image source');
    assert.equal(slides[index].width, thumbImage.naturalWidth, 'slide ' + index + ' uses its actual source width');
    assert.equal(slides[index].height, thumbImage.naturalHeight, 'slide ' + index + ' uses its actual source height');
    assert.equal(slides[index].element, thumbImage, 'slide ' + index + ' uses its real thumbnail element');
    assert.equal(slides[index].alt, multiProduct.name + ' — image ' + (index + 1) + ' of ' + images.length,
      'slide ' + index + ' keeps descriptive alternative text');
  }

  lightbox.pswp.currIndex = 2;
  lightbox.emit('change');
  assert.equal(mainImage.src, images[2], 'navigating in PhotoSwipe synchronizes the product image');
  assert.equal(thumbs[2].getAttribute('aria-pressed'), 'true', 'PhotoSwipe navigation synchronizes thumbnail state');
  assert.equal(dots[2].getAttribute('aria-pressed'), 'true', 'PhotoSwipe navigation synchronizes dot state');

  fire(trigger, 'click');
  await flushOpen();
  assert.equal(detail.photoSwipeLightboxes.length, 1, 'reopening reuses the same PhotoSwipe lightbox instance');
  assert.equal(lightbox.calls[1].index, 2, 'reopening uses the latest selected gallery frame');

  const missingDimensions = thumbs[0].querySelector('img');
  missingDimensions.naturalWidth = 0;
  missingDimensions.naturalHeight = 0;
  fire(trigger, 'click');
  await flushOpen();
  assert.equal(lightbox.calls[2].dataSource[0].width, 1600, 'an unloaded thumbnail is sized from a real image probe');
  assert.equal(lightbox.calls[2].dataSource[0].height, 1400, 'an unloaded thumbnail preserves its source aspect ratio');

  const reducedMotionDetail = renderProduct(siteRoot + 'product.html?id=' + multiProduct.id, products, true);
  fire(reducedMotionDetail.element('product-main-trigger'), 'click');
  await flushOpen();
  assert.equal(reducedMotionDetail.photoSwipeLightboxes[0].options.showHideAnimationType, 'none',
    'PhotoSwipe disables transition animation when reduced motion is requested');

  const single = {
    id: 'single-lightbox', name: 'Single Lightbox Test', cat: 'Test', img: 'assets/img/single.png',
    images: ['assets/img/single.png'], slug: 'single-lightbox', formats: 'PNG', price: 1, order: 99,
    summary: 'A single-frame lightbox product.'
  };
  const singleDetail = renderProduct(siteRoot + 'product.html?id=single-lightbox', products.concat([single]));
  fire(singleDetail.element('product-main-trigger'), 'click');
  await flushOpen();
  assert.equal(singleDetail.photoSwipeLightboxes[0].calls[0].index, 0, 'a single-image product opens at its only frame');
  assert.equal(singleDetail.photoSwipeLightboxes[0].calls[0].dataSource.length, 1, 'a single-image product has one slide');
  assert.equal(singleDetail.photoSwipeLightboxes[0].options.arrowPrev, false, 'a single-image viewer hides the previous control');
  assert.equal(singleDetail.photoSwipeLightboxes[0].options.arrowNext, false, 'a single-image viewer hides the next control');
  assert.equal(singleDetail.photoSwipeLightboxes[0].options.counter, false, 'a single-image viewer hides the counter');

  assert.match(cssSource, /\.pswp\s*\{[^}]*--pswp-bg:/, 'the site styles PhotoSwipe without custom viewer mechanics');
  assert.doesNotMatch(cssSource, /product-lightbox/, 'obsolete custom viewer styles are removed');
  assert.match(photoswipeCssSource, /\.pswp__img/, 'the official PhotoSwipe stylesheet is present');
  assert.match(photoswipeLicense, /MIT License[\s\S]*including without limitation[\s\S]*sell[\s\S]*copies/, 'the vendored library includes its MIT license');
  assert.doesNotMatch(mainSource, /function onStagePointerDown|function onLightboxWheel|function zoomAt|function lightboxSwipeDirection|LIGHTBOX_SWIPE_MIN/,
    'custom zoom, gesture handlers, and helpers are removed');

  const productHtml = fs.readFileSync(require.resolve('../product.html'), 'utf8');
  assert.match(productHtml, /assets\/vendor\/photoswipe\/photoswipe\.css\?v=1/, 'product page loads the local PhotoSwipe stylesheet');
  assert.match(productHtml, /photoswipe\.umd\.min\.js\?v=1[\s\S]*photoswipe-lightbox\.umd\.min\.js\?v=1[\s\S]*assets\/main\.js\?v=37/,
    'product page loads the pinned PhotoSwipe UMD files before the site logic');
  assert.match(productHtml, /assets\/style\.css\?v=36/, 'product page loads the updated site styling');
  const indexHtml = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.match(indexHtml, /assets\/main\.js\?v=37/, 'home page uses the cache-busted renderer');
  assert.match(indexHtml, /assets\/style\.css\?v=36/, 'home page uses the updated stylesheet version');
  assert.doesNotMatch(indexHtml, /photoswipe/, 'the gallery library is only loaded on product pages');

  process.stdout.write('PASS product image gallery uses PhotoSwipe for zoom, navigation, and touch gestures\n');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
