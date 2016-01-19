import _ from 'lodash';
import cheerio from 'cheerio';
import request from 'request';
import moment from 'moment';

var name = 'clien';
var targetUrls = [];
var targetKeywords = [];
var onMatchedHandler;

var removeCommentCount = (str) => {
  // &nbsp;가 왜 추가되는지 확인 필요
  return str.replace(/(\[\d+\])$/, '').replace(/&nbsp;/g, '');
};

var makeFullUrl = (url) => {
  // clien의 url은 ../bbs/board.php?bo_table=park&wr_idid=43864979 형태로 되어 있음
  return 'http://www.clien.net/cs2' + url.substring(2);
};

var findKeyword = (subject) => {
  return _.find(targetKeywords, (keyword) => {
    return subject.indexOf(keyword) > -1;
  });
};

var findMatch = (url) => {
  return new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      var $ = cheerio.load(body, {
          decodeEntities: false
      });

      $('.mytr').each((index, elem) => {
        var result;

        var $elem = $(elem);
        var $subject = $elem.find('.post_subject');

        var subject = $subject.text();
        var url = $subject.find('a').attr('href');
        var datetime = $elem.find('td span[title]').attr('title');
        var unixtime = moment(datetime).unix();

        subject = removeCommentCount(subject).trim();
        url = makeFullUrl(url);

        result = findKeyword(subject);

        if (result && onMatchedHandler && typeof onMatchedHandler === 'function') {
          // onMatchedHandler를 promise로 엮어 전체적인 속도를 컨트를하는 것도 고민해볼만
          // 이 상태에서는 모든 문서를 파싱하고 슬랙으로 메시지를 쏘는 것처럼 보이는데
          // 실제 처리해야 할 문서가 매우 많은 경우 어떻게 동작할지 확인 필요
          onMatchedHandler(result, subject, name, url);
          console.log(result);
        }
      });

      resolve();
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
    return _.reduce(targetUrls, (promise, url) => {
      return promise.then(() => {
        return new Promise((resolve, reject) => {
          return findMatch(url).then(resolve, reject);
        });
      });
    }, Promise.resolve());
  }
};