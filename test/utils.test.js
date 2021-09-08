import QUnit from 'qunit';
import window from 'global/window';

import { getFetchableSource } from '../src/utils';

QUnit.module('Utils');

QUnit.test('getFetchableSource', function(assert) {
  const locationSource = window.location.protocol + '//example.com';
  const httpsSource = 'https://example.com';
  const dataSource = 'data://example.com';

  assert.equal(getFetchableSource({src: httpsSource}), httpsSource, 'gets source from src');

  assert.equal(getFetchableSource({src: 'xyz:abc', sources: [{src: httpsSource}]}), httpsSource, 'gets source from sources obj');

  assert.equal(getFetchableSource({src: dataSource, sources: [{src: httpsSource}]}), dataSource, 'prioritises top level data source');

  assert.equal(getFetchableSource({src: locationSource, sources: [{src: httpsSource}]}), locationSource, 'prioritises top level source matching protocol');

  assert.equal(getFetchableSource({src: 'xyz:abc'}), null, 'doesn\'t return non matching source');
});
