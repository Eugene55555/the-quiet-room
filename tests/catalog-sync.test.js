'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), context);
const products = context.window.TQR_PRODUCTS;

assert.equal(products.length, 11, 'catalog mirrors all eleven public BlackSea listings');
assert.deepEqual(
  JSON.parse(JSON.stringify(products.map(product => product.name))),
  [
    'Golden Royal Panther — Luxury Christmas Digital PNG PDF',
    'Crystal Winter Fawn — Magical Ice Deer Digital PNG Art PNG PDF',
    'Christmas Little Fawn — Magical Holiday Deer PNG Design PNG PDF',
    'Autumn Spirit — Elegant Fox Wildlife Art Print PDF PNG',
    'Arctic Phantom — Majestic Snow Leopard Wildlife Art PNG PDF',
    'Arctic Phantom — Majestic Snow Leopard Wildlife Art PNG PDF',
    'White Wolf Digital Art Print PNG PDF',
    'Wild Blossom Tiger Cub — Enchanted Nature Digital Art Print PDF PNG',
    'Golden Butterfly Cat — Golden Elegance PNG PDF',
    'Rainbow Autumn Cat — Magical Fantasy Cat Digital PNG Art PNG PDF',
    'Enchanted Sunset Cat — Magical Fantasy Art Print PNG PDF'
  ],
  'all eleven display titles exactly match the BlackSea source order and punctuation'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(products.map(({ id, slug, price }) => [id, slug, price]))),
  [
    ['golden-royal-panther', 'szb', 2.60],
    ['crystal-winter-fawn', 'jeg', 1.95],
    ['christmas-little-fawn', 'ech', 1.17],
    ['autumn-spirit', 'ayb', 1.56],
    ['arctic-phantom-iqc', 'iqc', 1.30],
    ['arctic-phantom-xkw', 'xkw', 1.95],
    ['white-wolf', 'rldr', 2.35],
    ['baby-tiger', 'lek', 2.60],
    ['golden-butterfly-cat', 'ksi', 1.30],
    ['enchanted-rainbow-cat', 'oko', 1.95],
    ['cat-tree-dreams', 'xmv', 2.20]
  ],
  'catalog IDs, checkout slugs, source order, and prices match the storefront'
);
const panther = products.find(product => product.id === 'golden-royal-panther');
assert.ok(panther, 'Golden Royal Panther is present');
assert.equal(panther.cat, 'Wildlife', 'the new animal print uses the existing Wildlife category');
assert.equal(panther.formats, 'PNG + PDF', 'the format label follows the BlackSea listing title');
assert.equal(panther.images.length, 4, 'the new product keeps all four source previews');
assert.equal(panther.img, panther.images[0], 'the first source preview is the card cover');
for (const product of products) {
  assert.ok(Array.isArray(product.description) && product.description.length > 0,
    product.id + ' has a structured source description');
  assert.ok(product.description.every(block => block && ['h1', 'h2', 'h3', 'p', 'ul', 'ol'].includes(block.type)),
    product.id + ' description uses allowed source block types');
  assert.equal(product.description.some(block => block.type === 'h1'), product.id !== 'golden-butterfly-cat',
    product.id + ' preserves the source heading structure');
  assert.ok(typeof product.summary === 'string' && product.summary.trim() && product.summary.length <= 120,
    product.id + ' has a short subtitle for catalog cards');
}

const homepage = fs.readFileSync(require.resolve('../index.html'), 'utf8');
assert.match(homepage, /11 listings in PNG and PDF/, 'homepage metadata reports the current listing count');
assert.doesNotMatch(homepage, /5 designs/, 'homepage metadata no longer reports the stale count');
assert.match(homepage, /assets\/data\.js\?v=26/, 'homepage cache-busts the updated catalog data');
assert.equal((homepage.match(/value="Wildlife"/g) || []).length, 2,
  'Wildlife products remain available in desktop and mobile theme filters');

process.stdout.write('PASS eleven source products, prices, and descriptions\n');
