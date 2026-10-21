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

run('adding the same product merges its quantity', function () {
  const once = cart.addItem({}, 'tiger', 2, products);
  assert.deepEqual(cart.addItem(once, 'tiger', 3, products), { tiger: 5 });
});

run('cart normalization drops unknown products and clamps quantity', function () {
  assert.deepEqual(cart.normalizeCart({ tiger: 150, missing: 2, butterfly: 0 }, products), { tiger: 99 });
});

run('setting quantity clamps valid cart lines', function () {
  assert.deepEqual(cart.setQuantity({ tiger: 2 }, 'tiger', 100, products), { tiger: 99 });
});

run('removing a line leaves the other products intact', function () {
  assert.deepEqual(cart.removeItem({ tiger: 2, butterfly: 1 }, 'tiger', products), { butterfly: 1 });
});

run('subtotal uses whole cents for every catalog item', function () {
  assert.equal(cart.subtotalCents({ tiger: 2, butterfly: 3, rainbow: 1 }, products), 1105);
});

run('listed cart rows include catalog data and quantities', function () {
  assert.deepEqual(cart.listItems({ butterfly: 2, tiger: 1 }, products), [
    Object.assign({}, products[1], { quantity: 2 }),
    Object.assign({}, products[0], { quantity: 1 })
  ]);
});

run('unit count sums quantities across lines', function () {
  assert.equal(cart.countUnits({ butterfly: 2, tiger: 1 }, products), 3);
});

run('checkout handoff chains every product and quantity through BlackSea', function () {
  const returnUrl = 'https://eugene55555.github.io/the-quiet-room/#product-card-butterfly';
  const first = new URL(cart.buildCheckoutChain(
    { tiger: 2, butterfly: 3 },
    products,
    returnUrl,
    'https://5307397047125.blacksea.in.ua/checkout',
    'https://eugene55555.github.io/the-quiet-room/'
  ));
  const second = new URL(first.searchParams.get('referrer'));
  assert.equal(first.searchParams.get('product'), 'lek');
  assert.equal(first.searchParams.get('quantity'), '2');
  assert.equal(second.searchParams.get('product'), 'ksi');
  assert.equal(second.searchParams.get('quantity'), '3');
  assert.equal(second.searchParams.get('referrer'), returnUrl);
});

run('checkout handoff includes every configured product in the real catalog', function () {
  const finalReturn = catalogSite + '#product-card-golden-butterfly-cat';
  let url = new URL(cart.buildCheckoutChain(
    {
      'baby-tiger': 2,
      'golden-butterfly-cat': 3,
      'enchanted-rainbow-cat': 1,
      'cat-tree-dreams': 4
    },
    catalogProducts,
    finalReturn,
    'https://5307397047125.blacksea.in.ua/checkout',
    catalogSite
  ));
  const expected = [['lek', '2'], ['ksi', '3'], ['oko', '1'], ['xmv', '4']];
  expected.forEach(function (line) {
    assert.equal(url.searchParams.get('product'), line[0]);
    assert.equal(url.searchParams.get('quantity'), line[1]);
    url = new URL(url.searchParams.get('referrer'));
  });
  assert.equal(url.href, finalReturn);
});

run('checkout handoff refuses to silently skip a product without a vendor slug', function () {
  const missingSlugProducts = [{ id: 'tiger', name: 'Baby Tiger', price: 2.60 }];
  assert.equal(cart.buildCheckoutChain(
    { tiger: 1 },
    missingSlugProducts,
    'https://eugene55555.github.io/the-quiet-room/',
    'https://5307397047125.blacksea.in.ua/checkout',
    'https://eugene55555.github.io/the-quiet-room/'
  ), '');
});
