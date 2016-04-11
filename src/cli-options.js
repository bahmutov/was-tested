var pkg = require('../package.json')
var info = pkg.name + ' - ' + pkg.description + '\n' +
'  version: ' + pkg.version + '\n' +
'  author: ' + JSON.stringify(pkg.author)

function cliOptions () {
  var optimist = require('optimist')
  var program = optimist
    .option('version', {
      boolean: true,
      alias: 'v',
      description: 'show version and exit',
      default: false
    })
    .option('target', {
      string: true,
      alias: 't',
      description: 'target server url',
      default: 'http://127.0.0.1:3003'
    })
    .option('host', {
      string: true,
      alias: 'H',
      description: 'the http host header',
      default: false
    })
    .option('rehost', {
      string: true,
      alias: 'z',
      description: 'The host to rewrite to in the event of a redirect.',
      default: false
    })
    .option('port', {
      number: true,
      alias: 'p',
      description: 'local proxy port',
      default: 5050
    })
    .option('instrument', {
      string: true,
      alias: 'i',
      description: 'instrument url RegExp',
      default: 'app.js$'
    })
    .option('reset', {
      boolean: true,
      alias: 'r',
      description: 'erase previously collected coverage',
      default: false
    })
    .option('folder', {
      string: true,
      alias: 'f',
      description: 'working folder',
      default: null
    })
    .usage(info)
    .argv

  if (program.version) {
    console.log(info)
    process.exit(0)
  }

  if (program.help || program.h) {
    optimist.showHelp()
    process.exit(0)
  }

  return program
}

module.exports = cliOptions
