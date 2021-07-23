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
 * Finds an http source for a track
 *
 * @param {Object} track
 *        Text track object
 * @return {string|null}
 *          HTTPS source URl
 */
const getHttpsSource = (track) => {
  if (track.src && track.src.startsWith('https:')) {
    return track.src;
  }
  if (track.sources) {
    const httpsSrc = track.sources.find(t => {
      return t.src.startsWith('https:');
    });

    if (httpsSrc) {
      return httpsSrc.src;
    }
  }
  return null;
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
 * @param    {boolean} [options.transcript]
 *           Whether to include a transcript from a subtitles or captions track
 * @param    {boolean} [options.transcriptMatchLanguage]
 *           Whether to only return a transcript that matches the player language
 */
const schema = function(options) {
  // Add element for this player to DOM
  this.schemaEl_ = document.createElement('script');
  this.schemaEl_.type = 'application/ld+json';
  document.head.appendChild(this.schemaEl_);

  options = videojs.mergeOptions(defaults, options);

  // This listens to error because Googlebot cannot play video
  this.on(['loadstart', 'error'], e => {

    if (!this.bcinfo || !this.catalog || !this.mediainfo || !this.mediainfo.id) {
      videojs.log.warn('Unable to add schema without catalog info.');
      return;
    }

    const mediainfo = this.catalog.getMetadata ? this.catalog.getMetadata({lang: this.language()}) : this.mediainfo;

    const ld = videojs.mergeOptions(options.baseObject, {
      '@context': 'http://schema.org/',
      '@type': 'VideoObject',
      'name': mediainfo.name,
      'thumbnailUrl': mediainfo.poster,
      'uploadDate': mediainfo.publishedAt.split('T')[0],
      // Poor man's ad macros
      '@id': options.schemaId
        .replace('{id}', mediainfo.id)
        .replace('{referenceId}', mediainfo.referenceId)
        .replace('{playerId}', this.bcinfo.playerId)
        .replace('{embedId}', this.bcinfo.embedId)
        .replace('{accountId}', this.bcinfo.accountId)
    });

    if (options.preferLongDescription) {
      ld.description = mediainfo.longDescription || mediainfo.description || mediainfo.name;
    } else {
      ld.description = mediainfo.description || mediainfo.name;
    }

    const formattedDuration = duration8601(mediainfo.duration);

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
            '/index.html?videoId=' + mediainfo.id;
      }
    }

    if (options.keywords) {
      const keywords = [];

      mediainfo.tags.forEach(tag => {
        if (options.excludeTags.indexOf(tag) === -1) {
          keywords.push(tag);
        }
      });

      if (keywords.length > 0) {
        ld.keywords = keywords.join(',');
      }
    }

    if (options.transcript) {
      let track = mediainfo.textTracks.find(t => {
        return (
          (t.kind === 'captions' || t.kind === 'subtitles') &&
          getHttpsSource(track) &&
          t.srclang.split('-')[0] === this.language().split('-')[0]
        );
      });

      if (!track && !options.transcriptMatchLanguage) {
        track = mediainfo.textTracks.find(t => {
          return (
            (t.kind === 'captions' || t.kind === 'subtitles') &&
            getHttpsSource(t)
          );
        });
      }

      if (!track) {
        videojs.log.debug('No matching track');
        return;
      }

      videojs.xhr(getHttpsSource(track), (err, resp) => {
        if (err || resp.statusCode >= 400) {
          videojs.log.debug(err, resp.statusCode);
          return;
        }

        const cueRegex = /\d\d:\d\d\.\d\d\d --> \d\d:\d\d\.\d\d\d\n((.+\n)+)/mg;
        let match;
        const transcript = [];

        while ((match = cueRegex.exec(resp.body)) !== null) {
          transcript.push(match[1]);
        }

        ld.transcript = transcript.join('');

        this.schemaEl_.textContent = JSON.stringify(ld);
      });

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
