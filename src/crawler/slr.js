import _ from 'lodash';
import cheerio from 'cheerio';
import request from 'request';
import moment from 'moment';
import crawlData from '../crawlData';
import logger from '../logger';

var id = 'slr'; // config의 id와 동일해야 함
var targetUrls = {};
var targetKeywords = [];
var targetData = {};
var onMatchedHandler;
var crawlerRequestInterval = 0;

var CONTENT_MAX_LENGTH = 100;

var TYPE_SUBJECT = '제목';
var TYPE_CONTENT = '본문';
var TYPE_COMMENT = '댓글';

var targetInfo = {
  maxPages: 0,
  marker: 0
};

// 전체 페이지 숫자
var totalPage = 0;

// slr클럽의 글목록을 가져올 때 마커로 삼아야 할 글 순서가 변경될 수 있으므로
// 마커로 삼을 index의 값을 저장한다.
var markerIndex = 0;

var removeCommentCount = (str) => {
  // &nbsp;가 왜 추가되는지 확인 필요
  return removeNoBreakSpace(str.replace(/(\[\d+\])$/, ''));
};

var removeNoBreakSpace = (str) => {
  return str.replace(/&nbsp;/g, '');
};

var removeNewLine = (str) => {
  return str.replace(/^\n/gm, '').replace(/\n/g, ' ');
};

var getCleanContentBody = (dirtyContent) => {
  dirtyContent = removeNoBreakSpace(dirtyContent);
  dirtyContent = removeNewLine(dirtyContent);
  return dirtyContent.trim();
};

var makeFullUrl = (url) => {
  // slrclub의 url은 /bbs/vx2.php?id=free&amp;no=34954666 형태로 되어 있음
  if (!url) {
    return '';
  }

  url = url.replace('&amp;', '&');
  return 'http://www.slrclub.com/' + url.substring(1);
};

var markNewestArticle = (url, listNum) => {
  targetUrls[url].marker = listNum;
};

var saveNewestArticle = (url) => {
  return new Promise((resolve, reject) => {
    return crawlData.save(id, url, targetUrls[url].marker).then(resolve, reject);
  });
};

var loadPreviousMarker = (url) => {
  return targetData[url] ? targetData[url].marker : 0;
}

var findKeyword = (subject) => {
  return _.find(targetInfo.keywords, (keyword) => {
    return subject.indexOf(keyword) > -1;
  });
};

var findMatchedComment = (texts, keyword) => {
  return _.find(texts, (text) => {
    return text.indexOf(keyword) > -1;
  });
};

// slrclub의 댓글은 동적으로 렌더링하므로 페이지를 받아오는 것만으로는 내용 확인이 불가능하다.
var findMatchInEndPage = (url) => {
  return new Promise((resolve, reject) => {
    var promise = Promise.resolve();

    logger.verbose('Crawling page ' + url);

    request.get(url, (error, response, body) => {
      var $ = cheerio.load(body, {
          decodeEntities: false
      });

      logger.verbose('Parsing page ' + url);

      var contentText = getCleanContentBody($('#userct').text());
      var contentResult = findKeyword(contentText);

      if (contentResult && onMatchedHandler && typeof onMatchedHandler === 'function') {
        var result = contentResult;
        var message = 'Keyword ' + contentResult + ' matched in a content body';
        var content = contentText.substring(0, CONTENT_MAX_LENGTH);

        if (contentText.length > CONTENT_MAX_LENGTH) {
          content += '...';
        }

        promise = promise.then(() => {
          logger.verbose(message);
          return onMatchedHandler(result, content, id, url, TYPE_CONTENT).then(resolve, reject);
        });
      } else {
        return resolve();
      }
    });
  });
};

var findMatch = (url, page) => {
  return new Promise((resolve, reject) => {
    var promise = Promise.resolve();
    var newUrl = url;

    if (page && page > 1) {
      newUrl += '&page=' + page;
    }

    logger.verbose('Crawling page ' + newUrl);
    request.get(newUrl, (error, response, body) => {
      var $ = cheerio.load(body, {
          decodeEntities: false
      });

      var reachedPreviousArticle = false;
      var needToMark = true;

      logger.verbose('Parsing page ' + newUrl);

      if (!page) {
        // 페이지가 지정되어 있지 않은 경우 첫 페이지이므로 전체 페이지 수를 구한다.
        // slrclub은 (전체 페이지 수 - 이동하려는 페이지의 순서)로 이동하려는 페이지 번호를 구한다.
        $('.pageN a').each((index, elem) => {
          var $elem = $(elem);
          var href = $elem.attr('href');
          var pageNum = /page=(\d+)/.exec(href)[1];

          if (pageNum === '1') {
            page = $elem.text() - 0;
            totalPage = page;
          }
        });
      }

      $('.sbj').each((index, elem) => {
        var result;

        var $elem = $(elem);
        var $subject = $elem.find('a');

        var subject = $subject.text();
        var articleUrl = $subject.attr('href');
        var listNum = $elem.parent().find('.list_num').text();

        // listNum이 없는 경우는 공지글이므로 무시하고 다음 목록을 처리한다.
        if (listNum === '') {
          ++markerIndex;
          return;
        }

        if (page === totalPage && index === markerIndex) {
          markNewestArticle(url, listNum);
        }


        if (targetInfo.marker >= listNum) {
          reachedPreviousArticle = true;

          // 이전에 기록한 마커와 동일한 값이면 마커를 기록하지 않는다.
          if (page === totalPage && index === markerIndex) {
            needToMark = false;
          }
          return;
        }

        subject = removeCommentCount(subject).trim();
        result = findKeyword(subject);

        if (result) {
          if (onMatchedHandler && typeof onMatchedHandler === 'function') {
            articleUrl = makeFullUrl(articleUrl);

            promise = promise.then(() => {
              logger.verbose('Keyword ' + result + ' matched');
              return onMatchedHandler(result, subject, id, articleUrl, TYPE_SUBJECT);
            });
          }
        } else {
          if (articleUrl) {
            // 개발을 위해 잠시 주석 처리
            promise = promise.then(() => {
              return delay(crawlerRequestInterval)
                    .then(() => {
                      return findMatchInEndPage(makeFullUrl(articleUrl));
                    });
            });
          }
        }
      });

      if (!reachedPreviousArticle && --page > (totalPage - targetInfo.maxPages)) {
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
    logger.info('SLRClub crawler starts.');
    return _.reduce(targetUrls, (promise, target) => {
      return promise.then(() => {
        targetInfo.maxPages = target.maxPages;
        targetInfo.marker = loadPreviousMarker(target.url);
        targetInfo.keywords = _.union(targetKeywords, target.keywords)

        logger.verbose('Target keywords ' + targetInfo.keywords.join(', '));

        return findMatch(target.url).then(() => {
          return delay(crawlerRequestInterval);
        });
      });
    }, Promise.resolve());
  }
};