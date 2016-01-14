import request from 'request';
import { config } from './config';

function getSlackMessage(message, link) {
  return JSON.stringify({
    'text': message + '<' + link + '|게시글 보기>',
    'username': config.slack.botName
  });
};

module.exports = {
  send() {
    request.post(config.slack.webhookUrl, {
      form: {
        payload: getSlackMessage('테스트라지요', 'http://www.naver.com')
      }
    }, (err, res, body) => {
      if (!err && res.statusCode === 200) {
        console.log('ok');
      } else {
        console.error(res);
      }
    });
  }
};
