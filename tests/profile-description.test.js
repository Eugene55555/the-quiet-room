'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync(require.resolve('../index.html'), 'utf8');
assert.match(index, /class="artist-note"/, 'homepage includes the creator description from the source storefront');
assert.match(index, /I enjoy reading books and walking in the forest\./,
  'source storefront bio is translated into the site language');

process.stdout.write('PASS creator description is present on the homepage\n');
