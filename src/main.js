import crawler from './crawler';
import slack from './slack';
import { config } from './config';
import logger from './logger';

// total execution time
// summary

logger.info('100Eyes starts.');

crawler.run({
  dataFile: config.dataFile,
  keywords: config.keywords,
  targets: config.targets,
  requestInterval: config.requestInterval,
  onMatched: (matchedKeyword, sentence, targetName, matchedUrl) => {
    return slack.send({
      matchedKeyword: matchedKeyword,
      sentence: sentence,
      targetName: targetName,
      matchedUrl: matchedUrl,
      message: slack.formatMessage(matchedKeyword, sentence, targetName, matchedUrl)
    });
  }
}).then(() => {
  logger.info('100Eyes ends.');
});

