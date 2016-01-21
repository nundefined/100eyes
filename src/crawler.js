import * as _ from 'lodash';
import clien from './crawler/clien';
import slr from './crawler/slr';

var _crawlerOptions;
var _crawlerModules = {};
var _promise = Promise.resolve();

var _triggerMatched = (matchedKeyword, sentence, targetName, matchedUrl) => {
  if (_crawlerOptions.onMatched &&
        typeof _crawlerOptions.onMatched === "function") {
    return _crawlerOptions.onMatched(matchedKeyword, sentence, targetName, matchedUrl);
  }
}

var _runCrawlers = () => {
  // for ... of의 경우 value가 아닌 reference의 전달이므로 
  // value를 전달하는 _.forEach를 사용
  _.forEach(_crawlerOptions.targets, (target) => {
    switch(target.id) {
    case 'clien':
      target.crawler = clien;
      break;
    case 'slr':
      target.crawler = slr;
      break;
    }

    target.crawler.setOptions({
      urls: target.urls,
      keywords: _crawlerOptions.keywords,
      onMatched: _triggerMatched
    });
  });

  _startToCrawl();
};

var _startToCrawl = () => {
  console.log('_setCrawlingPlan');

  _promise = _.reduce(_crawlerOptions.targets, (promise, target) => {
    promise = promise.then(() => {
      console.log(target.id);
      return target.crawler.execute();
    });

    return promise;
  }, _promise);
};

module.exports = {
  run(options) {
    _crawlerOptions = options || {};
    _runCrawlers();
  },
};