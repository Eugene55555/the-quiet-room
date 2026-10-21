'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const cart = require('../assets/cart-core.js');

const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/data.js'), 'utf8'), dataContext);
const catalogProducts = dataContext.window.TQR_PRODUCTS;
const catalogSite = dataContext.window.TQR_SITE;

const products = [
  { id: 'tiger', slug: 'lek', name: 'Baby Tiger', price: 2.60 },
  { id: 'butterfly', slug: 'ksi', name: 'Golden Butterfly Cat', price: 1.30 },
  { id: 'rainbow', slug: 'oko', name: 'Enchanted Rainbow Cat', price: 1.95 }
];

function run(name, fn) {
  fn();
  process.stdout.write('PASS ' + name + '\n');
}

run('cart normalization keeps one copy of each known design', function () {
  assert.deepEqual(cart.normalizeCart({ tiger: 99, missing: 2, butterfly: 0, rainbow: 4 }, products), {
    tiger: true,
    rainbow: true
  });
});

run('adding the same design twice never creates a quantity', function () {
  const once = cart.addItem({}, 'tiger', products);
  assert.deepEqual(once, { tiger: true });
  assert.deepEqual(cart.addItem(once, 'tiger', products), { tiger: true });
});

run('removing one design preserves the others', function () {
  assert.deepEqual(cart.removeItem({ tiger: 2, butterfly: 1 }, 'tiger', products), { butterfly: true });
});

run('subtotal counts each selected design once in whole cents', function () {
  assert.equal(cart.subtotalCents({ tiger: 2, butterfly: 3, rainbow: 1 }, products), 585);
});

run('listed cart rows contain catalog data without a quantity field', function () {
  assert.deepEqual(cart.listItems({ butterfly: 2, tiger: 1 }, products), [
    Object.assign({}, products[1]),
    Object.assign({}, products[0])
  ]);
});

run('item count counts distinct selected designs', function () {
  assert.equal(cart.countProducts({ butterfly: 2, tiger: 1 }, products), 2);
});

run('single-design checkout omits quantity and preserves the local return URL', function () {
  const returnUrl = 'https://eugene55555.github.io/the-quiet-room/#product-card-tiger';
  const url = new URL(cart.buildCheckoutLink(
    { tiger: 8 },
    products,
    returnUrl,
    'https://5307397047125.blacksea.in.ua/checkout?quantity=7&campaign=site',
    'https://eugene55555.github.io/the-quiet-room/'
  ));
  assert.equal(url.searchParams.get('product'), 'lek');
  assert.equal(url.searchParams.has('quantity'), false);
  assert.equal(url.searchParams.get('campaign'), 'site');
  assert.equal(url.searchParams.get('referrer'), returnUrl);
  assert.equal(url.searchParams.has('products'), false);
});

run('multi-design checkout fails closed instead of sending only one line', function () {
  assert.equal(cart.buildCheckoutLink(
    { tiger: true, butterfly: true },
    products,
    'https://eugene55555.github.io/the-quiet-room/',
    'https://5307397047125.blacksea.in.ua/checkout',
    'https://eugene55555.github.io/the-quiet-room/'
  ), '');
});

run('real BlackSea catalog allows one design and rejects multiple designs', function () {
  const one = new URL(cart.buildCheckoutLink(
    { 'golden-butterfly-cat': 3 },
    catalogProducts,
    catalogSite,
    'https://5307397047125.blacksea.in.ua/checkout',
    catalogSite
  ));
  assert.equal(one.searchParams.get('product'), 'ksi');
  assert.equal(one.searchParams.has('quantity'), false);
  assert.equal(cart.buildCheckoutLink(
    {
      'baby-tiger': 2,
      'golden-butterfly-cat': 3,
      'enchanted-rainbow-cat': 1,
      'cat-tree-dreams': 4
    },
    catalogProducts,
    catalogSite,
    'https://5307397047125.blacksea.in.ua/checkout',
    catalogSite
  ), '');
});

run('checkout refuses to silently skip a product without a vendor slug', function () {
  const missingSlugProducts = [{ id: 'tiger', name: 'Baby Tiger', price: 2.60 }];
  assert.equal(cart.buildCheckoutLink(
    { tiger: true },
    missingSlugProducts,
    'https://eugene55555.github.io/the-quiet-room/',
    'https://5307397047125.blacksea.in.ua/checkout',
    'https://eugene55555.github.io/the-quiet-room/'
  ), '');
});
