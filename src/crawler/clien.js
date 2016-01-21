import _ from 'lodash';
import cheerio from 'cheerio';
import request from 'request';
import moment from 'moment';

var name = 'clien';
var targetUrls = [];
var targetKeywords = [];
var onMatchedHandler;

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
  return 'http://www.clien.net/cs2' + url.substring(2);
};

var markNewestArticle = (url, unixtime) => {

};

var loadPreviousMarker = () => {
  return 0;//1453214442;
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

    request.get(newUrl, (error, response, body) => {
      console.log('loaded: ' + newUrl);
      var $ = cheerio.load(body, {
          decodeEntities: false
      });

      var reachedPreviousArticle = false;

      $('.mytr').each((index, elem) => {
        var result;

        var $elem = $(elem);
        var $subject = $elem.find('.post_subject');

        var subject = $subject.text();
        var articleUrl = $subject.find('a').attr('href');
        var datetime = $elem.find('td span[title]').attr('title');
        var unixtime = moment(datetime).unix();

        if (page === 1 && index == 0) {
          markNewestArticle(url, unixtime);
        }

        if (targetInfo.marker >= unixtime) {
          reachedPreviousArticle = true;
          return;
        }

        subject = removeCommentCount(subject).trim();
        articleUrl = makeFullUrl(articleUrl);

        result = findKeyword(subject);

        if (result && onMatchedHandler && typeof onMatchedHandler === 'function') {
          // onMatchedHandler를 promise로 엮어 전체적인 속도를 컨트를하는 것도 고민해볼만
          // 이 상태에서는 모든 문서를 파싱하고 슬랙으로 메시지를 쏘는 것처럼 보이는데
          // 실제 처리해야 할 문서가 매우 많은 경우 어떻게 동작할지 확인 필요
          console.log('matched: ' + result);
          promise = promise.then(() => {
            console.log('send a message to slack... ' + result);
            return onMatchedHandler(result, subject, name, articleUrl).then(() => {
              console.log('ok');
            });
          });
        }
      });

      if (!reachedPreviousArticle && ++page <= targetInfo.maxPages) {
        promise.then(() => {
          return findMatch(url, page).then(resolve, reject);
        });
      } else {
        promise.then(resolve, reject);
      }
    });
  });
};

module.exports = {
  setOptions(option) {
    this.setUrls(option.urls);
    this.setKeywords(option.keywords);
    this.setOnMatchedHandler(option.onMatched);
  },
  setUrls(urls) {
    for(var url of urls) {
      targetUrls.push(url);
    }
  },
  setKeywords(keywords) {
    for(var keyword of keywords) {
      targetKeywords.push(keyword);
    }
  },
  setOnMatchedHandler(handler) {
    onMatchedHandler = handler;
  },

  execute() {
    return _.reduce(targetUrls, (promise, target) => {
      return promise.then(() => {
        targetInfo.maxPages = target.maxPages;
        targetInfo.marker = loadPreviousMarker(target.url);

        return findMatch(target.url);
      });
    }, Promise.resolve());
  }
};