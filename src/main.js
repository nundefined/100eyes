import crawler from './crawler';
import slack from './slack';
import { config } from './config';

crawler.run({
  keywords: config.keywords,
  targets: config.targets,
  onMatched: (matchedKeyword, sentence, targetName, matchedUrl) => {
    slack.send(slack.formatMessage(matchedKeyword, sentence, targetName, matchedUrl));
  }
});

