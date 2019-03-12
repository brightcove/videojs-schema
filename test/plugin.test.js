import document from 'global/document';

import QUnit from 'qunit';
import sinon from 'sinon';
import videojs from 'video.js';

import plugin from '../src/plugin';

const Player = videojs.getComponent('Player');

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
      tags: ['one', 'two', 'three']
    };
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

QUnit.test('does not add embed if disabled in social', function(assert) {

  this.player.socialSettings = {
    removeEmbed: true
  };
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

  assert.strictEqual(
    generatedSchema.keywords, 'one,three',
    'embed url from social overlay'
  );
});
