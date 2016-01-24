import winston from 'winston';
import { config } from './config';

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({
      filename: config.logFile,
      timestamp: true,
      zippedArchive: true,
      options: {
        flags: 'a'
      },
      level: 'debug',
      json: false
    })
  ]
});

module.exports = logger;