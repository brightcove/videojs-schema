import window from 'global/window';

/**
 * Function to format seconds as duration
 *
 * @function duration8601
 * @param    {number} seconds
 *           A number of seconds
 *
 * @returns  {string|null}
 *           A formatted duration, or null if input not parseable.
 */

const duration8601 = seconds => {
  seconds = Math.round(seconds);
  if (seconds <= 0 || !isFinite(seconds)) {
    // Nothing in JSON+LD/Schema.org spec for live duration?
    return;
  }

  const hours = parseInt(seconds / 3600, 10);
  const minutes = parseInt((seconds - hours * 3600) / 60, 10);
  const remaining = seconds - (hours * 3600) - (minutes * 60);
  let output = 'PT';

  if (hours > 0) {
    output += `${hours}H`;
  }
  if (minutes > 0) {
    output += `${minutes}M`;
  }
  output += `${remaining}S`;

  return output;
};

/**
 * Finds a source matching the current protocol, https: or data:
 *
 * @param {Object} track
 *        Text track object
 * @return {string|null}
 *          HTTPS source URl
 */
const getFetchableSource = (track) => {
  if (track.src && (
    track.src.startsWith(window.location.protocol) ||
    track.src.startsWith('https:') ||
    track.src.startsWith('data:')
  )) {
    return track.src;
  }
  if (track.sources) {
    const usableSource = track.sources.find(t => {
      return t.src.startsWith('https:') ||
      t.src.startsWith('https:') ||
      t.src.startsWith('data:');
    });

    if (usableSource) {
      return usableSource.src;
    }
  }
  return null;
};

export {
  duration8601,
  getFetchableSource
};
