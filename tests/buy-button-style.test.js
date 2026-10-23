'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');
const mainSource = fs.readFileSync(require.resolve('../assets/main.js'), 'utf8');
const htmlFiles = ['../index.html', '../product.html'];

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

function rootVariables(source) {
  const root = rules(source).find(rule => rule.selectors.includes(':root'));
  assert.ok(root, 'brand and purchase CTA tokens are declared on :root');
  const variables = {};
  for (const match of root.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    variables[match[1]] = match[2].trim();
  }
  return variables;
}

const cssRules = rules(cssSource);
const findRule = (...selectors) => cssRules.find(rule =>
  selectors.every(selector => rule.selectors.includes(selector)));

const variables = rootVariables(cssSource);
const resolveVars = value => {
  let resolved = value.trim();
  for (let i = 0; i < 8 && /var\(--[\w-]+\)/.test(resolved); i += 1) {
    resolved = resolved.replace(/var\((--[\w-]+)\)/g, (match, name) =>
      variables[name] === undefined ? match : variables[name]);
  }
  return resolved;
};

assert.match(resolveVars('var(--wine)'), /^#8E2137$/i,
  'the purchase CTA reuses the existing brand wine');
for (const [token, value] of [
  ['--buy-text', '#FFFFFF'],
  ['--buy-border', '#F7D7DD'],
  ['--buy-radius', '12px'],
  ['--buy-focus-ring', '#FDEFDC']
]) {
  assert.ok(variables[token], token + ' is defined');
  assert.match(resolveVars(variables[token]), new RegExp('^' + value + '$', 'i'),
    token + ' has the high-visibility value');
}

const buyRule = findRule('.card-btn', '.product-buy');
assert.ok(buyRule, 'card and detail purchase CTAs share one visible primary style');

assert.match(buyRule.body, /display\s*:\s*flex\b/);
assert.match(buyRule.body, /align-items\s*:\s*center\b/);
assert.match(buyRule.body, /justify-content\s*:\s*center\b/);
assert.match(buyRule.body, /width\s*:\s*100%/);
const minHeight = buyRule.body.match(/min-height\s*:\s*(\d+)px/);
assert.ok(minHeight && Number(minHeight[1]) >= 52, 'primary CTA is at least 52px tall');
assert.match(buyRule.body, /padding\s*:\s*0\s+30px\b/);
assert.match(resolveVars(buyRule.body), /background\s*:\s*#8E2137\b/i,
  'both purchase CTAs are bright brand-wine red');
assert.match(resolveVars(buyRule.body), /color\s*:\s*#FFFFFF\b/i,
  'both purchase CTAs use bold white text');
const fontWeight = buyRule.body.match(/font-weight\s*:\s*(\d+)/);
assert.ok(fontWeight && Number(fontWeight[1]) >= 700, 'primary CTA label is bold');
const fontSize = buyRule.body.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/);
assert.ok(fontSize && Number(fontSize[1]) >= 16, 'primary CTA label is large enough to notice');
assert.match(resolveVars(buyRule.body), /border\s*:\s*2px\s+solid\s+#F7D7DD\b/i,
  'primary CTA has a visible light border');
assert.match(resolveVars(buyRule.body), /border-radius\s*:\s*12px\b/);
assert.match(resolveVars(buyRule.body), /box-shadow\s*:[^;]*rgba\(\s*64\s*,\s*13\s*,\s*24\s*,\s*\.4\d?\s*\)/i,
  'primary CTA has a noticeable shadow');
assert.doesNotMatch(resolveVars(buyRule.body), /background\s*:\s*#000000\b/i,
  'the old black CTA fill is gone');
assert.doesNotMatch(resolveVars(buyRule.body), /color\s*:\s*#05A3D2\b/i,
  'the old cyan CTA text is gone');

const hoverRule = findRule('.card-btn:hover', '.product-buy:hover');
assert.ok(hoverRule, 'both purchase CTAs share a strong hover state');
assert.match(resolveVars(hoverRule.body), /background\s*:\s*#A63A52\b/i,
  'hover lifts the wine CTA to the existing wine-soft accent');
assert.match(resolveVars(hoverRule.body), /box-shadow\s*:[^;]*rgba\(\s*64\s*,\s*13\s*,\s*24\s*,\s*\.5\d?\s*\)/i,
  'hover increases the CTA shadow');
assert.match(hoverRule.body, /transform\s*:\s*translateY\(-1px\)/);

const focusRule = findRule('.card-btn:focus-visible', '.product-buy:focus-visible');
assert.ok(focusRule, 'both purchase CTAs keep a keyboard focus-visible state');
assert.match(focusRule.body, /outline\s*:\s*3px\s+solid\s+var\(--buy-focus-ring\)\s*;/);
assert.match(focusRule.body, /outline-offset\s*:\s*3px\b/);
assert.match(focusRule.body, /box-shadow\s*:[^;]*rgba\(\s*64\s*,\s*13\s*,\s*24\s*,\s*\.8\s*\)/);
assert.match(focusRule.body, /box-shadow\s*:[^;]*rgba\(\s*253\s*,\s*239\s*,\s*220\s*,\s*\.9\s*\)/);

function luminance(hex) {
  const channels = hex.replace('#', '').match(/../g).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
assert.ok(contrast('#FFFFFF', '#8E2137') >= 4.5,
  'white CTA text keeps WCAG AA contrast on the wine fill');
assert.ok(contrast('#8E2137', '#F7D7DD') >= 3,
  'the light CTA border is visible against the wine fill');

const visualProps = /(?:^|;)\s*(?:background(?:-color)?|color|font(?:-size|-weight)?|line-height|letter-spacing|padding(?:-[a-z]+)?|border(?:-[a-z]+)?|border-radius|min-height|min-width|width|box-shadow|text-align|display)\s*:/;
for (const selector of ['.card-actions .card-btn', '.product-buy-row .product-buy']) {
  const layoutRule = cssRules.find(rule => rule.selectors.includes(selector));
  assert.ok(layoutRule, selector + ' layout hook exists');
  assert.doesNotMatch(layoutRule.body, visualProps,
    selector + ' must only set layout, not override the shared CTA visuals');
}
for (const block of mediaBlocks(cssSource)) {
  for (const rule of rules(block.body)) {
    const targetsBuy = rule.selectors.some(selector =>
      /(?:^|[\s>])\.(?:card-btn|product-buy)(?::[\w-]+)?$/.test(selector));
    if (targetsBuy) {
      assert.doesNotMatch(rule.body, visualProps,
        block.header + ' must not override the shared CTA visuals');
    }
  }
}

assert.match(mainSource, /https:\/\/5307397047125\.blacksea\.in\.ua\/checkout/,
  'checkout host is unchanged');
assert.match(mainSource,
  /<a class="card-btn" href="' \+ esc\(buyURL\(p, referrer\)\) \+ '" data-return-url="' \+ esc\(referrer\) \+ '">Buy now<\/a>/,
  'catalog CTA keeps its href, return URL, and Buy now label');
assert.match(mainSource,
  /<a class="product-buy" href="' \+ esc\(buyURL\(p, cardReferrer\(p\.id\)\)\) \+ '" data-return-url="' \+ esc\(cardReferrer\(p\.id\)\) \+ '">Buy now — ' \+ money\(p\.price\) \+ '<\/a>/,
  'detail CTA keeps its href, return URL, label, and price');
assert.doesNotMatch(mainSource, /class="(?:card-btn|product-buy)"[^\n]*target=/,
  'purchase CTAs stay in the same tab');

for (const path of htmlFiles) {
  const html = fs.readFileSync(require.resolve(path), 'utf8');
  assert.match(html, /assets\/data\.js\?v=24/, path + ' loads the cache-busted five source titles');
  assert.match(html, /assets\/main\.js\?v=32/, path + ' loads the cache-busted relocated-button renderer');
  assert.match(html, /assets\/style\.css\?v=33/, path + ' loads the cache-busted red CTA and equal-card CSS');
}

process.stdout.write('PASS both Buy CTA variants are bright wine-red, high-contrast, and visibly interactive; href, checkout return URL, labels, prices, and placement are unchanged\n');
