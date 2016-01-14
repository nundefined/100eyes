var _crawlerOptions;

var _triggerMatched = (matchedKeyword, sentence, targetName, matchedUrl) => {
  if (_crawlerOptions.onMatched &&
        typeof _crawlerOptions.onMatched === "function") {
    _crawlerOptions.onMatched(matchedKeyword, sentence, targetName, matchedUrl);
  }
}

module.exports = {
  run(options) {
    var message;

    _crawlerOptions = options || {};
    _triggerMatched('sun', 'find tomorrow sun', 'google', 'http://google.com');
  }
};