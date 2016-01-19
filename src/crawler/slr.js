import * as _ from 'lodash';

var name = 'slr';
var targetUrls = [];

module.exports = {
  setOptions(option) {
    this.setUrls(option.urls);
  },
  setUrls(urls) {
    for(var url of urls) {
      targetUrls.push(url);
    }
  },
    execute() {
    console.log('execute');
    // console.log(targetUrls);

    return _.reduce(targetUrls, (promise, url) => {
      console.log('1:', url);
      return Promise.resolve();
      // return Promise.resolve();
      // return promise.then(() => {
      //   console.log(url);
      //   return Promise.resolve();
      // });
    }, Promise.resolve());

    // _.each(targetUrls, (url) => {
    //   console.log(url);
    // });

    // return Promise.resolve();
  }
};