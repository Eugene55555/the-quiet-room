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

const cssRules = rules(cssSource);
const findRule = (...selectors) => cssRules.find(rule =>
  selectors.every(selector => rule.selectors.includes(selector)));
const rootRule = cssRules.find(rule => rule.selectors.includes(':root'));
assert.ok(rootRule, 'purchase CTA tokens are declared on :root');
const resolveVars = value => value.replace(/var\((--[\w-]+)\)/g, (match, name) => {
  const declaration = cssSource.match(new RegExp(name + '\\s*:\\s*([^;]+);'));
  return declaration ? declaration[1].trim() : match;
});

for (const [token, value] of [
  ['--buy-bg', '#000000'],
  ['--buy-text', '#05A3D2'],
  ['--buy-radius', '11px'],
  ['--buy-radius-inner', '10px'],
  ['--buy-focus-ring', '#05A3D2']
]) {
  assert.match(rootRule.body, new RegExp(token + '\\s*:\\s*' + value + '\\b', 'i'),
    token + ' is defined with the reference value');
}

const buyRule = findRule('.card-btn', '.product-buy');
assert.ok(buyRule, 'card and detail purchase CTAs share the reference button style');

assert.match(buyRule.body, /display\s*:\s*flex\b/);
assert.match(buyRule.body, /align-items\s*:\s*center\b/);
assert.match(buyRule.body, /justify-content\s*:\s*center\b/);
assert.match(buyRule.body, /width\s*:\s*100%/);
assert.match(buyRule.body, /min-height\s*:\s*47px\b/);
assert.match(buyRule.body, /padding\s*:\s*0\s+30px\b/);
assert.match(resolveVars(buyRule.body), /background\s*:\s*#000000\b/i, 'reference creates a black primary button');
assert.match(resolveVars(buyRule.body), /color\s*:\s*#05A3D2\b/i, 'reference uses its cyan button text on black');
assert.match(buyRule.body, /border\s*:\s*1px\s+solid\s+transparent\b/);
assert.match(resolveVars(buyRule.body), /border-radius\s*:\s*11px\b/);
assert.match(buyRule.body, /font-size\s*:\s*15px\b/);
assert.match(buyRule.body, /font-weight\s*:\s*400\b/);
assert.match(buyRule.body, /line-height\s*:\s*1\.2\b/);
assert.match(buyRule.body, /letter-spacing\s*:\s*1px\b/);
assert.match(buyRule.body, /text-align\s*:\s*center\b/);
assert.match(buyRule.body, /box-shadow\s*:\s*0\s+4px\s+5px\s+rgba\(0,\s*0,\s*0,\s*0\)/,
  'reference button shadow is defined but transparent');
assert.match(buyRule.body, /transition\s*:\s*box-shadow\s+\.1s\s+ease/);

const afterRule = findRule('.card-btn::after', '.product-buy::after');
assert.ok(afterRule, 'the reference inner ring is shared by both purchase CTAs');
assert.match(resolveVars(afterRule.body), /border-radius\s*:\s*10px\b/);
assert.match(afterRule.body, /inset\s*:\s*1px\b/);

const hoverRule = findRule('.card-btn:hover::after', '.product-buy:hover::after');
assert.ok(hoverRule, 'both purchase CTAs share the reference hover ring');
assert.match(hoverRule.body, /box-shadow\s*:[^;]*rgba\(5,\s*163,\s*210,\s*0\)/);
assert.match(hoverRule.body, /box-shadow\s*:[^;]*rgba\(0,\s*0,\s*0,\s*1\)/,
  'hover expands the black button edge like the reference');
assert.doesNotMatch(cssSource, /\.card-btn:hover\s*\{[^}]*background\s*:\s*var\(--wine-soft\)/,
  'legacy wine hover no longer recolors the card CTA');
assert.doesNotMatch(cssSource, /\.product-buy:hover\s*\{[^}]*background\s*:\s*#FFFFFF/i,
  'legacy cream hover no longer recolors the detail CTA');

const focusRule = findRule('.card-btn:focus-visible', '.product-buy:focus-visible');
assert.ok(focusRule, 'both purchase CTAs keep a keyboard focus-visible state');
assert.match(focusRule.body, /outline\s*:\s*0\b/);
assert.match(resolveVars(focusRule.body), /box-shadow\s*:[^;]*#05A3D2/i);
assert.match(focusRule.body, /box-shadow\s*:[^;]*rgba\(0,\s*0,\s*0,\s*\.5\)/);
assert.match(focusRule.body, /box-shadow\s*:[^;]*rgba\(0,\s*0,\s*0,\s*\.3\)/);

const visualProps = /(?:^|;)\s*(?:background(?:-color)?|color|font(?:-size|-weight)?|line-height|letter-spacing|padding(?:-[a-z]+)?|border(?:-[a-z]+)?|border-radius|min-height|min-width|width|box-shadow|text-align|display)\s*:/;
for (const selector of ['.card-actions .card-btn', '.product-buy-row .product-buy']) {
  const layoutRule = cssRules.find(rule => rule.selectors.includes(selector));
  assert.ok(layoutRule, selector + ' layout hook exists');
  assert.doesNotMatch(layoutRule.body, visualProps,
    selector + ' must only set layout, not override the reference CTA visuals');
}
for (const block of mediaBlocks(cssSource)) {
  for (const rule of rules(block.body)) {
    const targetsBuy = rule.selectors.some(selector =>
      /(?:^|[\s>])\.(?:card-btn|product-buy)$/.test(selector));
    if (targetsBuy) {
      assert.doesNotMatch(rule.body, visualProps,
        block.header + ' must not override the reference CTA visuals');
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
  assert.match(html, /assets\/style\.css\?v=31/, path + ' loads the cache-busted purchase-button CSS');
}

process.stdout.write('PASS purchase CTAs match the reference primary button style; href, checkout return URL, labels, and prices are unchanged\n');
