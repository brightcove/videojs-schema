import document from 'global/document';
import window from 'global/window';

import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';

import plugin from '../src/plugin';

const Player = videojs.getComponent('Player');

const trackSource = cues => {
  let text = 'WEBVTT\n\n';
  let time = 0;

  cues.forEach(cue => {
    text += `00:${(time++).toString().padStart(2, '0')}:00.000 --> 00:${(time++).toString().padStart(2, '0')}:00.000\n`;
    cue.forEach(line => {
      text += line + '\n';
    });
    text += '\n';
  });
  return 'data:text/vtt;base64,' + window.btoa(text);
};

QUnit.test('the environment is sane', function(assert) {
  assert.strictEqual(typeof Array.isArray, 'function', 'es5 exists');
  assert.strictEqual(typeof sinon, 'object', 'sinon exists');
  assert.strictEqual(typeof videojs, 'function', 'videojs exists');
  assert.strictEqual(typeof plugin, 'function', 'plugin is a function');
});

QUnit.module('videojs-schema', {

  beforeEach() {

    // Mock the environment's timers because certain things - particularly
    // player readiness - are asynchronous in video.js 5. This MUST come
    // before any player is created; otherwise, timers could get created
    // with the actual timer methods!
    this.clock = sinon.useFakeTimers();

    this.fixture = document.getElementById('qunit-fixture');
    this.video = document.createElement('video');
    this.fixture.appendChild(this.video);
    this.player = videojs(this.video);
    this.player.bcinfo = {
      accountId: 5678,
      playerId: 'abcd',
      embedId: 'default'
    };
    this.player.mediainfo = {
      id: 1234,
      referenceId: 'xyz',
      name: 'NAME',
      description: 'DESCRIPTION',
      duration: 3661,
      publishedAt: '2019-02-12T09:07:44',
      poster: 'https://loremflickr.com/1280/720',
      tags: ['one', 'two', 'three'],
      longDescription: 'LONGDESCRIPTION'
    };
    this.player.catalog = {};
  },

  afterEach() {
    this.player.dispose();
    this.clock.restore();
  }
});

QUnit.test('registers itself with video.js', function(assert) {
  assert.expect(2);

  assert.strictEqual(
    typeof Player.prototype.schema,
    'function',
    'videojs-schema plugin was registered'
  );

  this.player.schema();

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  assert.ok(
    this.player.usingPlugin('schema'),
    'the plugin uses the plugin'
  );
});

QUnit.test('adds metadata', function(assert) {

  this.player.schema();
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(
    generatedSchema.name, 'NAME',
    'schema name from metadata'
  );
  assert.strictEqual(
    generatedSchema.duration, 'PT1H1M1S',
    'duration is formatted'
  );
});

QUnit.test('skips duration for live videos', function(assert) {

  this.player.mediainfo.duration = -1;
  this.player.schema();
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(
    generatedSchema.duration, undefined,
    'duration skipped for live videos'
  );
});

QUnit.test('resolves macros', function(assert) {

  this.player.schema({
    schemaId: 'https://{id}/{referenceId}/{playerId}/{embedId}/{accountId}'
  });
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(
    generatedSchema['@id'], 'https://1234/xyz/abcd/default/5678',
    'schema name from metadata'
  );
});

QUnit.test('adds embed url if social plugin present', function(assert) {

  this.player.socialSettings = {};
  this.player.socialOverlay = {
    getEmbedCode: () => {
      return '<iframe src="http://embed/code"></iframe>';
    }
  };

  this.player.schema();
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(
    generatedSchema.embedUrl, 'http://embed/code',
    'embed url from social overlay'
  );
});

QUnit.test('does not add embed if disabled', function(assert) {

  this.player.socialSettings = {
    removeEmbed: true
  };
  this.player.socialOverlay = {
    getEmbedCode: () => {
      return '<iframe src="http://embed/code"></iframe>';
    }
  };

  this.player.schema({includeEmbedUrl: false});
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(
    generatedSchema.embedUrl, undefined,
    'embed url not added'
  );
});

QUnit.test('includes tags if requested', function(assert) {

  this.player.schema({
    keywords: true,
    excludeTags: ['two']
  });
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.keywords, 'one,three', 'add tags except exclusions');
});

QUnit.test('merges onto base options', function(assert) {

  this.player.schema({
    baseObject: {
      param1: 'abc'
    }
  });
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.param1, 'abc', 'merged onto base options');
});

QUnit.test('defaults to video title when prefer long description but both short description and long description are empty', function(assert) {
  this.player.mediainfo = {
    id: 1234,
    referenceId: 'xyz',
    name: 'NAME',
    description: '',
    duration: 3661,
    publishedAt: '2019-02-12T09:07:44',
    poster: 'https://loremflickr.com/1280/720',
    tags: ['one', 'two', 'three'],
    longDescription: ''
  };
  this.player.schema({
    preferLongDescription: true
  });
  this.player.trigger('error');

  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.description, 'NAME', 'used video title');
});

QUnit.test('defaults to short description', function(assert) {

  this.player.schema();
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.description, 'DESCRIPTION', 'used short description');
});

QUnit.test('defaults to video title if short description is empty', function(assert) {
  this.player.mediainfo = {
    id: 1234,
    referenceId: 'xyz',
    name: 'NAME',
    description: '',
    duration: 3661,
    publishedAt: '2019-02-12T09:07:44',
    poster: 'https://loremflickr.com/1280/720',
    tags: ['one', 'two', 'three']
  };
  this.player.schema();
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.description, 'NAME', 'used video title');
});

QUnit.test('long description can be used', function(assert) {

  this.player.schema({
    preferLongDescription: true
  });
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.description, 'LONGDESCRIPTION', 'used long description');
});

QUnit.test('supports multilingual metadata', function(assert) {

  this.player.catalog.getMetadata = opts => {
    if (opts.lang === 'fr') {
      return videojs.mergeOptions(this.player.mediainfo, {name: 'NOM'});
    }
    return this.player.mediainfo;
  };
  this.player.language('fr');
  this.player.schema();
  this.player.trigger('error');

  // Tick the clock forward enough to trigger the player to be "ready".
  this.clock.tick(1);

  const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

  assert.strictEqual(generatedSchema.name, 'NOM', 'used localised name');
});

QUnit.test('can add transcript', function(assert) {
  const done = assert.async();

  this.player.mediainfo.textTracks = [
    {
      src: trackSource([['One line'], ['Two', 'lines']]),
      srclang: 'en',
      kind: 'subtitles'
    },
    {
      src: trackSource([['Eine Zeile'], ['Zwei', 'Zeilen']]),
      srclang: 'de',
      kind: 'subtitles'
    }
  ];
  this.player.language('de-de');
  this.player.schema({transcript: true});
  this.player.trigger('error');

  const mo = new window.MutationObserver(mutations => {
    const generatedSchema = JSON.parse(this.player.schemaEl_.textContent);

    if (generatedSchema.transcript) {
      assert.strictEqual(generatedSchema.transcript, 'Eine Zeile\nZwei\nZeilen\n', 'has transcript with matching language');
      done();
    }
  });

  mo.observe(this.player.schemaEl_, {childList: true});
});

QUnit.test('skips videos that should be skipped because of tags', function(assert) {
  this.player.mediainfo = {
    id: 1234,
    referenceId: 'xyz',
    name: 'NAME',
    description: '',
    duration: 3661,
    publishedAt: '2019-02-12T09:07:44',
    poster: 'https://loremflickr.com/1280/720',
    tags: ['one', 'two', 'three']
  };
  this.player.schema({
    skipRules: {
      tags: ['two']
    }
  });
  // Setting dummy test, just to verify that it gets cleared
  this.player.schemaEl_.textContent = 'xxx';
  this.player.trigger('error');
  this.clock.tick(1);

  assert.equal(this.player.schemaEl_.textContent, '', 'no metadata for video with matching tag');
});

QUnit.test('skips videos that should be skipped because of custom fields', function(assert) {
  this.player.mediainfo = {
    id: 1234,
    referenceId: 'xyz',
    name: 'NAME',
    description: '',
    duration: 3661,
    publishedAt: '2019-02-12T09:07:44',
    poster: 'https://loremflickr.com/1280/720',
    tags: ['one', 'two', 'three'],
    customFields: {
      field1: 'value'
    }
  };
  this.player.schema({
    skipRules: {
      customFields: {
        field1: 'value'
      }
    }
  });
  // Setting dummy test, just to verify that it gets cleared
  this.player.schemaEl_.textContent = 'xxx';
  this.player.trigger('error');
  this.clock.tick(1);

  assert.equal(this.player.schemaEl_.textContent, '', 'no metadata for video with matching custom field');
});
