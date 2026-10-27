'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const cssSource = fs.readFileSync(require.resolve('../assets/style.css'), 'utf8');
const cleanCss = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...cleanCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
  selectors: match[1].split(',').map(selector => selector.trim()),
  body: match[2].trim()
}));
const filterSelect = rules.find(rule => rule.selectors.includes('.filter-label select'));
assert.ok(filterSelect, 'desktop filter selects have a dedicated style');
assert.match(filterSelect.body, /appearance\s*:\s*none\b/, 'native arrow is replaced to control its inset');
assert.match(filterSelect.body, /padding\s*:\s*8px\s+42px\s+8px\s+10px\b/, 'text clears the inset chevron');
assert.match(filterSelect.body, /background-position\s*:\s*right\s+14px\s+center\b/, 'chevron sits inside the right edge');
assert.match(filterSelect.body, /background-image\s*:\s*url\(/, 'a custom chevron is visible');
assert.match(filterSelect.body, /border\s*:\s*1px solid rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*\.3\s*\)/, 'the control keeps a softened border');
assert.doesNotMatch(filterSelect.body, /outline\s*:\s*none\b/, 'keyboard focus is not removed');

const focusRule = rules.find(rule => rule.selectors.includes('.filter-label select:focus-visible'));
assert.ok(focusRule, 'keyboard focus has a dedicated visible style');
assert.match(focusRule.body, /outline\s*:\s*2px solid\b/);
assert.match(focusRule.body, /outline-offset\s*:\s*2px\b/);

process.stdout.write('PASS desktop filter chevrons are inset, borders are softened, and keyboard focus remains visible\n');
