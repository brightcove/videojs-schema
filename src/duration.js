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

export default duration8601;
