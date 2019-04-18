const bestTrack = function(tracks = [], types = ['subtitles', 'captions'], fallbackLang) {

  if (tracks.length === 0) {
    return;
  }

  const matches = {
    exact: [],
    twoletter: [],
    fallbackExact: [],
    fallbackTwoletter: [],
    default: []
  };
  const candidateTracks = Array.prototype.filter.call(tracks, t => {
    return types.indexOf(t.kind) > -1;
  });

  candidateTracks.forEach(t => {
    // Player normalises language to lower case
    const trackLang = (t.language || t.srclang).toLowerCase();

    // `en-US` ~= `en` ~= `en-GB`
    if (trackLang.split('-')[0] === this.language().split('-')[0]) {
      matches.twoletter.push(t);

      // `en-US` === `en-US`
      if (trackLang === this.language()) {
        matches.exact.push(t);
      }
    }

    if (fallbackLang) {
      // `en-US` ~= `en` ~= `en-GB`
      if (trackLang.split('-')[0] === fallbackLang.split('-')[0]) {
        matches.fallbackTwoletter.push(t);

        // `en-US` === `en-US`
        if (trackLang === fallbackLang) {
          matches.fallbackExact.push(t);
        }
      }
    }

    // Honour the default if a language didn't match
    if (t.default) {
      matches.default.push(t);
    }
  });

  // Join arrays to order preference
  return matches.exact
    .concat(matches.twoletter)
    .concat(matches.fallbackExact)
    .concat(matches.fallbackTwoletter)
    .concat(matches.default)[0];
};

export default bestTrack;
