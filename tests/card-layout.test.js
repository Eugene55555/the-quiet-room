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

function rules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
    selectors: match[1].split(',').map(selector => selector.trim()),
    body: match[2].trim()
  }));
}

function mediaBlocks(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  const opener = /@media[^{]+\{/g;
  let match;
  while ((match = opener.exec(clean))) {
    let index = opener.lastIndex;
    let depth = 1;
    const start = index;
    while (index < clean.length && depth > 0) {
      if (clean[index] === '{') depth += 1;
      else if (clean[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push({ header: match[0].slice(0, -1).trim(), body: clean.slice(start, index - 1) });
    opener.lastIndex = index;
  }
  return blocks;
}

const cssRules = rules(cssSource);
const findRule = selector => cssRules.find(rule => rule.selectors.includes(selector));
const requirement = (rule, pattern, message) => {
  assert.ok(rule, message + ' rule exists');
  assert.match(rule.body, pattern, message);
};

const gridRule = findRule('.grid');
requirement(gridRule, /display\s*:\s*grid\b/, 'the homepage catalog uses a grid');
assert.match(gridRule.body, /grid-auto-rows\s*:\s*1fr\b/,
  'every implicit grid row shares one height, so cards match across the whole grid and all rows');
assert.match(gridRule.body, /align-items\s*:\s*stretch\b/,
  'grid items stretch to the shared row height');

const cardRule = findRule('.card');
requirement(cardRule, /display\s*:\s*flex\b/, 'product card is a flex column');
assert.match(cardRule.body, /flex-direction\s*:\s*column\b/);
assert.match(cardRule.body, /height\s*:\s*100%\s*;/,
  'each card fills its shared grid row height');
assert.doesNotMatch(cardRule.body, /height\s*:\s*auto\b/,
  'cards never collapse to content height');

const bodyRule = findRule('.card-body');
requirement(bodyRule, /display\s*:\s*flex\b/, 'card body is a flex column');
assert.match(bodyRule.body, /flex-direction\s*:\s*column\b/);
assert.match(bodyRule.body, /flex\s*:\s*1(?:\s+1\s+auto)?\b/,
  'card body grows to fill the equal card height');

const actionsRule = findRule('.card-actions');
assert.ok(actionsRule, 'card action row is styled');
assert.match(actionsRule.body, /margin-top\s*:\s*auto\b/,
  'Buy actions are pinned to the bottom of every equal-height card');

const buttonRule = findRule('.card-btn');
assert.ok(buttonRule, 'catalog Buy button is styled');
assert.match(buttonRule.body, /width\s*:\s*100%/);
assert.match(buttonRule.body, /display\s*:\s*flex\b/);

for (const selector of ['.card-title', '.card-desc']) {
  const rule = findRule(selector);
  assert.ok(rule, selector + ' is styled');
  assert.doesNotMatch(rule.body, /(?:-webkit-)?line-clamp\s*:/i,
    selector + ' is not truncated with line-clamp');
  assert.doesNotMatch(rule.body, /max-height\s*:/i,
    selector + ' is not clipped by max-height');
  assert.doesNotMatch(rule.body, /overflow\s*:\s*hidden/i,
    selector + ' is not clipped by overflow:hidden');
  assert.doesNotMatch(rule.body, /display\s*:\s*none/i,
    selector + ' is not hidden');
  assert.doesNotMatch(rule.body, /visibility\s*:\s*hidden/i,
    selector + ' is not hidden');
}

for (const block of mediaBlocks(cssSource)) {
  for (const rule of rules(block.body)) {
    if (rule.selectors.includes('.grid')) {
      assert.doesNotMatch(rule.body, /grid-auto-rows\s*:\s*(?!1fr\b)[^;]+/i,
        block.header + ' keeps all grid rows equal');
      assert.doesNotMatch(rule.body, /align-items\s*:\s*(?!stretch\b)[^;]+/i,
        block.header + ' keeps cards stretched to equal height');
    }
    if (rule.selectors.includes('.card')) {
      assert.doesNotMatch(rule.body, /height\s*:\s*auto\b/i,
        block.header + ' does not collapse card height');
    }
    if (rule.selectors.includes('.card-body')) {
      assert.doesNotMatch(rule.body, /flex\s*:\s*(?:none|0|0\s+0\s+auto)\b/i,
        block.header + ' keeps the card body growing');
    }
    if (rule.selectors.includes('.card-actions')) {
      assert.doesNotMatch(rule.body, /margin-top\s*:\s*0\b/i,
        block.header + ' keeps actions pinned to the card bottom');
    }
  }
}

function makeElement() {
  return {
    innerHTML: '', textContent: '', value: '', style: {}, listeners: {}, attributes: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() { return false; } },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

const catalog = makeElement();
const pagination = makeElement();
const count = makeElement();
const document = {
  body: makeElement(),
  title: '',
  listeners: {},
  getElementById(id) {
    if (id === 'catalog') return catalog;
    if (id === 'pagination') return pagination;
    if (id === 'count') return count;
    return null;
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener(type, fn) { this.listeners[type] = fn; }
};
const window = {
  TQR_PRODUCTS: products,
  location: new URL('https://eugene55555.github.io/the-quiet-room/'),
  history: { state: null, replaceState() {} },
  pageYOffset: 0,
  localStorage: { removeItem() {} },
  addEventListener() {},
  scrollTo() {},
  requestAnimationFrame(fn) { fn(); }
};
vm.runInNewContext(mainSource, { window, document, URL, URLSearchParams, Date, Number, Math, Object, Array, String });
document.listeners.DOMContentLoaded();

const firstPage = catalog.innerHTML;
assert.equal((firstPage.match(/<article class="card"[\s\S]*?<\/article>/g) || []).length, 8,
  'the first page renders eight equal-height cards');
assert.equal(count.textContent, '10 products', 'catalog count includes cards on the next page');
const nextPage = pagination.innerHTML.match(/<button\b[^>]*data-p="(\d+)"[^>]*aria-label="Next page"/);
assert.ok(nextPage, 'catalog exposes pagination for the remaining cards');
const nextButton = { getAttribute(name) { return name === 'data-p' ? nextPage[1] : null; } };
pagination.listeners.click({ target: { closest() { return nextButton; } } });
const secondPage = catalog.innerHTML;
assert.equal((secondPage.match(/<article class="card"[\s\S]*?<\/article>/g) || []).length, 2,
  'the second page renders the final two equal-height cards');
const cards = [...(firstPage + secondPage).matchAll(/<article class="card"[\s\S]*?<\/article>/g)].map(match => match[0]);
assert.equal(cards.length, 10, 'all ten equal-height cards are reachable across pages');

for (const product of products) {
  const card = cards.find(markup => markup.includes('id="product-card-' + product.id + '"'));
  assert.ok(card, product.id + ' card renders');
  const body = card.match(/<div class="card-body">([\s\S]*)<\/div><\/article>$/);
  assert.ok(body, product.id + ' card body encloses the details and CTA');
  const bodyMarkup = body[1];
  const title = bodyMarkup.indexOf('<a class="card-title"');
  const desc = bodyMarkup.indexOf('<p class="card-desc">');
  const price = bodyMarkup.indexOf('<div class="card-price-row">');
  const actions = bodyMarkup.indexOf('<div class="card-actions">');
  const button = bodyMarkup.indexOf('<a class="card-btn"');
  assert.ok(title >= 0 && title < desc, product.id + ' renders its title before its subtitle');
  assert.ok(desc < price && price < actions, product.id + ' renders subtitle and price before its CTA row');
  assert.ok(actions < button, product.id + ' keeps the Buy button inside the bottom CTA row');
  assert.ok(bodyMarkup.indexOf('</div>', button) > button, product.id + ' closes the CTA row after the Buy button');
}

process.stdout.write('PASS catalog cards share one grid-wide height with bottom-aligned Buy CTAs and unclipped content\n');
