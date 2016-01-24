import fs from 'fs';
import _ from 'lodash';
import logger from './logger';

var targetFile;

var getNewData = (oldData, dataId, url, newDatum) => {
  if (!oldData[dataId]) {
    oldData[dataId] = {};
  }

  oldData[dataId][url] = newDatum;
  return  oldData;
};

var write = (target, data) => {
  return new Promise((resolve, reject) => {
    logger.verbose('Writing file ' + target);
    fs.writeFile(target, data, (err) => {
      if (err) {
        logger.error('Failed to read file ' + target);
        logger.debug(err);
        return reject();
      }

      logger.verbose('Succeeded to write file ' + target);
      return resolve();
    })
  });
};

var writeNewData = (oldData, id, url, newDatum) => {
  return new Promise((resolve, reject) => {
    var newData = getNewData(oldData, id, url, newDatum);
    return write(targetFile, JSON.stringify(newData)).then(() => {
      return resolve();
    })
  });
};

var read = (target) => {
  return new Promise((resolve, reject) => {
    logger.verbose('Loading file ' + target);
    fs.readFile(target, {encoding: 'utf-8'}, (err, data) => {
      if (err) {
        logger.error('Failed to read file ' + target);
        logger.debug(err);
        return reject();
      }

      logger.verbose('Succeeded to read file ' + target);
      return resolve(JSON.parse(data));
    });
  });
}

module.exports = {
  load (target) {
    targetFile = target;

    return new Promise((resolve, reject) => {
      fs.stat(target, (err, stats) => {
        if (err) {
          logger.error('Failed to read file ' + target);
          logger.debug(err);
          return reject();
        }

        return read(target).then(resolve, reject);
      });
    });
  },

  save (id, url, newDatum) {
    var self = this;

    return new Promise((resolve, reject) => {
      read(targetFile).then((oldData) => {
        return writeNewData(oldData, id, url, newDatum).then(resolve, reject);
      }, () => {
        logger.error('failed to read file ' + targetFile);
        // 기존 file이 없는 경우
        return writeNewData({}, id, url, newDatum).then(resolve, reject);
      });
    });
  }
};