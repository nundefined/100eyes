import request from 'request';
import { config } from './config';
import logger from './logger';

function getSlackMessageObject(option) {
  return JSON.stringify({
    'username': config.slack.botName,
    'attachments': [
      {
        "fallback": `${option.targetName} ${option.source}에서 "${option.matchedKeyword}" 키워드가 포함된 글을 발견했습니다.`,
        "color": "#36a64f",
        "pretext": `${option.targetName} ${option.source}에서 "${option.matchedKeyword}" 키워드가 포함된 글을 발견했습니다.`,
        "title": option.content,
        "title_link": option.matchedUrl
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

  formatMessage(matchedKeyword, content, targetName, matchedUrl, source) {
    return `${targetName} ${source}에서 "${matchedKeyword}" 키워드가 포함된 글을 발견했습니다.\n${content}\n<${matchedUrl}|글 보기>`;
  }
};
