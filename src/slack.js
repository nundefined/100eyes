import request from 'request';
import { config } from './config';

function getSlackMessageObject(message) {
  return JSON.stringify({
    'text': message ,
    'username': config.slack.botName
  });
};

module.exports = {
  send(message) {
    // return new Promise((resolve, reject) => {
    //   request.post(config.slack.webhookUrl, {
    //     form: {
    //       payload: getSlackMessageObject(message)
    //     }
    //   }, (err, res, body) => {
    //     if (!err && res.statusCode === 200) {
    //       // console.log('ok');
    //       resolve();
    //     } else {
    //       console.error(res);
    //       reject();
    //     }
    //   });
    // });
    return Promise.resolve();
  },

  formatMessage(matchedKeyword, sentence, targetName, matchedUrl) {
    return `${targetName}에서 "${matchedKeyword}" 키워드가 포함된 글을 발견했습니다.\n${sentence}\n<${matchedUrl}|글 보기>`;
  }
};
