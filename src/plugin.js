import videojs from 'video.js';
import {version as VERSION} from '../package.json';
import document from 'global/document';
import duration8601 from './duration';

// Default options for the plugin.
const defaults = {
  schemaId: 'https://players.brightcove.net/{accountId}/{playerId}_{embedId}/index.html?videoId={id}'
};

/**
 * Schema plugin. Adds schema.org metadata in json+ld format
 * to the DOM for Google and other search engines which will
 * read data inserted by javascript.
 *
 * @function schema
 * @param    {Object} [options={}]
 *           An object of options
 * @param    {string} [options.schemaId]
 *           A URI to use as the id in the schema
 */
const schema = function(options) {
  // Add element for this player to DOM
  this.schemaEl_ = document.createElement('script');
  this.schemaEl_.type = 'application/ld+json';
  document.head.appendChild(this.schemaEl_);

  options = videojs.mergeOptions(defaults, options);

  // This listens to error because Googlebot cannot play video
  this.on(['loadstart', 'error'], e => {

    if (!this.bcinfo || !this.mediainfo || !this.mediainfo.id) {
      videojs.log.warn('Unable to add schema without catalog info.');
      return;
    }

    const ld = {
      '@context': 'http://schema.org/',
      '@type': 'VideoObject',
      'name': this.mediainfo.name,
      'description': this.mediainfo.description,
      'thumbnailUrl': this.mediainfo.poster,
      'uploadDate': this.mediainfo.publishedAt.split('T')[0],
      // Poor man's ad macros
      '@id': options.schemaId
        .replace('{id}', this.mediainfo.id)
        .replace('{referenceId}', this.mediainfo.referenceId)
        .replace('{playerId}', this.bcinfo.playerId)
        .replace('{embedId}', this.bcinfo.embedId)
        .replace('{accountId}', this.bcinfo.accountId)
    };

    const formattedDuration = duration8601(this.mediainfo.duration);

    if (formattedDuration) {
      ld.duration = formattedDuration;
    }

    if (this.socialSettings && !this.socialSettings.removeEmbed) {
      const parser = document.createElement('div');

      parser.innerHTML = this.socialOverlay.getEmbedCode();
      ld.embedUrl = parser.querySelector('iframe').src;
    }

    this.schemaEl_.textContent = JSON.stringify(ld);
  });

  // Remove this player's element on dispose
  this.on('dispose', _ => {
    this.schemaEl_.parentNode.removeChild(this.schemaEl_);
  });
};

// Register the plugin with video.js.
videojs.registerPlugin('schema', schema);

// Include the version number.
schema.VERSION = VERSION;

export default schema;
