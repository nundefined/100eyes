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
  onMatched: (matchedKeyword, content, targetName, matchedUrl, source) => {
    return slack.send({
      matchedKeyword: matchedKeyword,
      content: content,
      targetName: targetName,
      matchedUrl: matchedUrl,
      source: source,
      message: slack.formatMessage(matchedKeyword, content, targetName, matchedUrl, source)
    });
  }
}).then(() => {
  logger.info('100Eyes ends.');
});

