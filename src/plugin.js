import videojs from 'video.js';
import {version as VERSION} from '../package.json';
import document from 'global/document';
import duration8601 from './duration';

// Default options for the plugin.
const defaults = {
  schemaId: 'https://players.brightcove.net/{accountId}/{playerId}_{embedId}/index.html?videoId={id}',
  keywords: false,
  excludeTags: [],
  baseObject: {},
  includeEmbedUrl: true,
  preferLongDescription: false
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
 * @param    {boolean} [options.keywords]
 *           Whether to include tags as keywords
 * @param    {Array} [options.excludeTags]
 *           If including tags, an array of tags to exclude
 * @param    {Object} [options.baseObject]
 *           A template object to build the schema onto
 * @param    {boolean} [options.includeEmbedUrl]
 *           Whether to include the embed url
 * @param    {boolean} [options.preferLongDescription]
 *           Whether to prefer the long description
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

    const ld = videojs.mergeOptions(options.baseObject, {
      '@context': 'http://schema.org/',
      '@type': 'VideoObject',
      'name': this.mediainfo.name,
      'thumbnailUrl': this.mediainfo.poster,
      'uploadDate': this.mediainfo.publishedAt.split('T')[0],
      // Poor man's ad macros
      '@id': options.schemaId
        .replace('{id}', this.mediainfo.id)
        .replace('{referenceId}', this.mediainfo.referenceId)
        .replace('{playerId}', this.bcinfo.playerId)
        .replace('{embedId}', this.bcinfo.embedId)
        .replace('{accountId}', this.bcinfo.accountId)
    });

    if (options.preferLongDescription) {
      ld.description = this.mediainfo.longDescription || this.mediainfo.description || this.mediainfo.name;
    } else {
      ld.description = this.mediainfo.description || this.mediainfo.name;
    }

    const formattedDuration = duration8601(this.mediainfo.duration);

    if (formattedDuration) {
      ld.duration = formattedDuration;
    }

    if (options.includeEmbedUrl) {
      if (this.socialSettings) {
        const parser = document.createElement('div');

        parser.innerHTML = this.socialOverlay.getEmbedCode();
        ld.embedUrl = parser.querySelector('iframe').src;
      } else {
        ld.embedUrl = 'https://players.brightcove.net/' + this.bcinfo.accountId +
            '/' + this.bcinfo.playerId + '_' + this.bcinfo.embedId +
            '/index.html?videoId=' + this.mediainfo.id;
      }
    }

    if (options.keywords) {
      const keywords = [];

      this.mediainfo.tags.forEach(tag => {
        if (options.excludeTags.indexOf(tag) === -1) {
          keywords.push(tag);
        }
      });

      if (keywords.length > 0) {
        ld.keywords = keywords.join(',');
      }
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
