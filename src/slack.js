import request from 'request';
import { config } from './config';
import logger from './logger';

function getSlackMessageObject(option) {
  return JSON.stringify({
    // 'text': option.message ,
    // 'username': config.slack.botName,
    'attachments': [
      {
        "fallback": option.targetName + "에서 키워드를 발견했습니다.",
        "color": "#36a64f",
        "pretext": option.targetName + "에서 키워드를 발견했습니다.",
        "author_name": config.slack.botName,
        // "author_link": "http://hogangnono.com",
        "author_icon": "https://s3-us-west-2.amazonaws.com/slack-files2/avatars/2016-01-14/18494291877_3c2c0699cdec72b527ad_48.png",
        "title": option.sentence,
        "title_link": option.matchedUrl,
        "text": `${option.targetName}에서 "${option.matchedKeyword}" 키워드가 포함된 글을 발견했습니다.`
      }
    ]
  });
};

module.exports = {
  send(option) {
    return new Promise((resolve, reject) => {
      request.post(config.slack.webhookUrl, {
        form: {
          payload: getSlackMessageObject(option)
        }
      }, (err, res, body) => {
        if (!err && res.statusCode === 200) {
          logger.info('Successed to send a message to Slack.');
          return resolve();
        } else {
          logger.info('Failed to send a message to Slack.');
          logger.error(res);
          return reject();
        }
      });
    });
  },

  formatMessage(matchedKeyword, sentence, targetName, matchedUrl) {
    return `${targetName}에서 "${matchedKeyword}" 키워드가 포함된 글을 발견했습니다.\n${sentence}\n<${matchedUrl}|글 보기>`;
  }
};
