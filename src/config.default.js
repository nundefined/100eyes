module.exports = {
  config: {
    dataFile: __dirname + '/100eyes.data',
    logFile: __dirname + '/logs/101eyes.log',
    keywords: ['전체대상',  '키워드'],
    slack: {
      botName: '100eYe',
      webhookUrl: 'https://hooks.slack.com/services/path/to/your/slack/webhook'
    },
    requestInterval: 1000, // ms
    targets: [{
        id: 'clien',
        name: '클리앙',
        crawlerModulePath: './crawler/clien',
        keywords: ['클리앙대상', '적용키워드'],
        urls: [{
          url: 'http://localhost:8080/sample.html',
          keywords: ['url', '대상', 'keyword'],
          maxPages: 2
        }]
      }
    ]
  }
}