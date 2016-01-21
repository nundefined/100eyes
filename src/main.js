import crawler from './crawler';
import slack from './slack';
import { config } from './config';

// total execution time
// summary

crawler.run({
  keywords: config.keywords,
  targets: config.targets,
  onMatched: (matchedKeyword, sentence, targetName, matchedUrl) => {
    return slack.send(slack.formatMessage(matchedKeyword, sentence, targetName, matchedUrl));
  }
});

