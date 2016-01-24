import _ from 'lodash';
import cheerio from 'cheerio';
import request from 'request';
import moment from 'moment';
import crawlData from '../crawlData';
import logger from '../logger';

var id = 'clien'; // config의 id와 동일해야 함
var targetUrls = {};
var targetKeywords = [];
var targetData = {};
var onMatchedHandler;
var crawlerRequestInterval = 0;

var targetInfo = {
  maxPages: 0,
  marker: 0
};

var removeCommentCount = (str) => {
  // &nbsp;가 왜 추가되는지 확인 필요
  return str.replace(/(\[\d+\])$/, '').replace(/&nbsp;/g, '');
};

var makeFullUrl = (url) => {
  // clien의 url은 ../bbs/board.php?bo_table=park&wr_idid=43864979 형태로 되어 있음
  if (!url) {
    return '';
  }
  
  return 'http://www.clien.net/cs2' + url.substring(2);
};

var markNewestArticle = (url, unixtime) => {
  targetUrls[url].marker = unixtime;
};
// 
var saveNewestArticle = (url) => {
  return new Promise((resolve, reject) => {
    return crawlData.save(id, url, targetUrls[url].marker).then(resolve, reject);
  });
};

var loadPreviousMarker = (url) => {
  return targetData[url] ? targetData[url].marker : 0;
}

var findKeyword = (subject) => {
  return _.find(targetKeywords, (keyword) => {
    return subject.indexOf(keyword) > -1;
  });
};

var findMatch = (url, page) => {
  return new Promise((resolve, reject) => {
    var promise = Promise.resolve();
    var newUrl = url;

    if (page && page > 1) {
      newUrl += '&page=' + page;
    } else {
      page = 1;
    }

    logger.verbose('Crawling page ' + newUrl);

    request.get(newUrl, (error, response, body) => {
      var $ = cheerio.load(body, {
          decodeEntities: false
      });

      var reachedPreviousArticle = false;
      var needToMark = true;

      logger.verbose('Parsing page ' + newUrl);

      $('.mytr').each((index, elem) => {
        var result;

        var $elem = $(elem);
        var $subject = $elem.find('.post_subject');

        var subject = $subject.text();
        var articleUrl = $subject.find('a').attr('href');
        var datetime = $elem.find('td span[title]').attr('title');
        var unixtime = moment(datetime).unix();

        if (page === 1 && index === 0) {
          markNewestArticle(url, unixtime);
        }

        if (targetInfo.marker >= unixtime) {
          reachedPreviousArticle = true;

          if (page === 1 && index === 0) {
            needToMark = false;
          }
          return;
        }

        subject = removeCommentCount(subject).trim();
        result = findKeyword(subject);

        if (result && onMatchedHandler && typeof onMatchedHandler === 'function') {
          articleUrl = makeFullUrl(articleUrl);

          promise = promise.then(() => {
            logger.verbose('Keyword ' + result + 'matched');
            return onMatchedHandler(result, subject, id, articleUrl);
          });
        }
      });

      if (!reachedPreviousArticle && ++page <= targetInfo.maxPages) {
        promise.then(() => {
          return delay(crawlerRequestInterval)
                  .then(() => {
                    return findMatch(url, page);
                  })
                  .then(resolve, reject);
        });
      } else if (needToMark) {
        promise.then(() => {
          // 하나의 게시판을 읽었을 때만 읽은 위치를 기록한다.
          // 중간에 에러가 발생해서 재실행할 때 다시 읽을 수 있게 하기 위함이다.
          return saveNewestArticle(url).then(resolve, reject);
        })
      } else {
        return resolve();
      }
    });
  });
};

var delay = (duration) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      return resolve();
    }, duration);
  });
};

module.exports = {
  setOptions(option) {
    this.setData(option.data);
    this.setUrls(option.urls);
    this.setKeywords(option.keywords);
    this.setOnMatchedHandler(option.onMatched);
    this.setRequestInterval(option.requestInterval);
  },
  setUrls(urls) {
    _.forEach(urls, (url) => {
      targetUrls[url.url] = url;
    });
  },
  setKeywords(keywords) {
    for(var keyword of keywords) {
      targetKeywords.push(keyword);
    }
  },
  setOnMatchedHandler(handler) {
    onMatchedHandler = handler;
  },
  setData(data) {
    _.forEach(data, (datum, key) => {
      targetData[key] = {marker: datum};
    });
  },
  setRequestInterval(requestInterval) {
    crawlerRequestInterval = requestInterval
  },

  execute() {
    logger.info('Clien crawler starts.');
    return _.reduce(targetUrls, (promise, target) => {
      return promise.then(() => {
        targetInfo.maxPages = target.maxPages;
        targetInfo.marker = loadPreviousMarker(target.url);

        return findMatch(target.url).then(() => {
          return delay(crawlerRequestInterval);
        });
      });
    }, Promise.resolve());
  }
};