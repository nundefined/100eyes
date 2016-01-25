import * as _ from 'lodash';
import clien from './crawler/clien';
import slr from './crawler/slr';
import crawlData from './crawlData';
import logger from './logger';

var _crawlerOptions;
var _crawlerModules = {};
var _crawlData = {};
var _promise = Promise.resolve();

var _triggerMatched = (matchedKeyword, content, targetName, matchedUrl, source) => {
  if (_crawlerOptions.onMatched &&
        typeof _crawlerOptions.onMatched === "function") {
    return _crawlerOptions.onMatched(matchedKeyword, content, targetName, matchedUrl, source);
  }
};

var _loadDataFile = () => {
  logger.verbose('Loading data file ' + _crawlerOptions.dataFile);
  return crawlData.load(_crawlerOptions.dataFile).then((data) => {
    logger.verbose('Succeeded to laod data file ' + _crawlerOptions.dataFile);
    _crawlData = data;
  }, () => {
    // file이 없어 실패할 경우에는 아무런 처리도 하지 않는다.
    logger.verbose('Failed to laod data file ' + _crawlerOptions.dataFile);
  });
};

var _runCrawlers = () => {
  // for ... of의 경우 value가 아닌 reference의 전달이므로 
  // value를 전달하는 _.forEach를 사용
  _.forEach(_crawlerOptions.targets, (target) => {
    var data;

    switch(target.id) {
    case 'clien':
      target.crawler = clien;
      break;
    case 'slr':
      target.crawler = slr;
      break;
    }

    data = _crawlData[target.id] || {};

    target.crawler.setOptions({
      data: data,
      urls: target.urls,
      keywords: _.union(_crawlerOptions.keywords, target.keywords),
      requestInterval: _crawlerOptions.requestInterval,
      onMatched: _triggerMatched
    });
  });

  return _startToCrawl();
};

var _startToCrawl = () => {
  return _promise = _.reduce(_crawlerOptions.targets, (promise, target) => {
    promise = promise.then(() => {
      return target.crawler.execute();
    });

    return promise;
  }, _promise);
};

module.exports = {
  run(options) {
    _crawlerOptions = options || {};
    return _loadDataFile().then(_runCrawlers);
  },
};