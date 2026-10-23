'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), context);
const products = context.window.TQR_PRODUCTS;

assert.equal(products.length, 5, 'catalog mirrors all five public BlackSea listings');
assert.equal(products.find(product => product.id === 'white-wolf').name,
  'White Wolf Digital Art Print PNG PDF', 'White Wolf uses the required exact display title');
assert.deepEqual(
  JSON.parse(JSON.stringify(products.filter(product => product.id !== 'white-wolf').map(product => product.name))),
  ['Wild Blossom Tiger Cub', 'Golden Butterfly Cat', 'Enchanted Rainbow Cat', 'Enchanted Sunset Cat'],
  'other product display titles are unchanged'
);
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
    product.id + ' has a structured source description');
  assert.ok(product.description.every(block => block && ['h1', 'h2', 'h3', 'p', 'ul', 'ol'].includes(block.type)),
    product.id + ' description uses allowed source block types');
  assert.ok(product.description.some(block => block.type === 'h1'),
    product.id + ' description keeps the source heading');
  assert.ok(typeof product.summary === 'string' && product.summary.trim() && product.summary.length <= 120,
    product.id + ' has a short subtitle for catalog cards');
}

const homepage = fs.readFileSync(require.resolve('../index.html'), 'utf8');
assert.equal((homepage.match(/value="Wildlife"/g) || []).length, 2,
  'the new Wildlife product is available in desktop and mobile theme filters');

process.stdout.write('PASS five source products, prices, and descriptions\n');
