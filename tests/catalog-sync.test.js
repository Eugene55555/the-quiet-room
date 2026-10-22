'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), context);
const products = context.window.TQR_PRODUCTS;

assert.equal(products.length, 5, 'catalog mirrors all five public BlackSea listings');
assert.deepEqual(
  JSON.parse(JSON.stringify(products.map(({ id, slug, price }) => [id, slug, price]))),
  [
    ['white-wolf', 'rldr', 2.35],
    ['baby-tiger', 'lek', 2.60],
    ['golden-butterfly-cat', 'ksi', 1.30],
    ['enchanted-rainbow-cat', 'oko', 1.95],
    ['cat-tree-dreams', 'xmv', 2.20]
  ],
  'catalog IDs, checkout slugs, order, and prices match the source storefront'
);
for (const product of products) {
  assert.ok(Array.isArray(product.description) && product.description.length > 0,
    product.id + ' has source product description paragraphs');
  assert.ok(product.description.every(paragraph => typeof paragraph === 'string' && paragraph.trim()),
    product.id + ' description contains no empty paragraphs');
  assert.ok(typeof product.summary === 'string' && product.summary.trim(),
    product.id + ' has a short description for catalog cards');
}

const homepage = fs.readFileSync(require.resolve('../index.html'), 'utf8');
assert.equal((homepage.match(/value="Wildlife"/g) || []).length, 2,
  'the new Wildlife product is available in desktop and mobile theme filters');

process.stdout.write('PASS five source products, prices, and descriptions\n');
