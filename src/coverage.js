var la = require('lazy-ass')
var check = require('check-more-types')
var fs = require('fs')
var rimraf = require('rimraf')

var istanbul = require('istanbul')
var Collector = istanbul.Collector

function resetCoverage (options) {
  la(check.object(options), 'missing options', options)

  la(check.unemptyString(options.coverageFilename), 'missing coverage filename', options)
  if (fs.existsSync(options.coverageFilename)) {
    fs.unlinkSync(options.coverageFilename)
    console.log('deleted previous coverage file', options.coverageFilename)
  }

  la(check.unemptyString(options.saveFolder), 'missing coverage folder', options)
  if (fs.existsSync(options.saveFolder)) {
    rimraf.sync(options.saveFolder)
    console.log('deleted temp folder', options.saveFolder)
  }

  la(check.unemptyString(options.savedReportDir), 'missing coverage report dir', options)
  if (fs.existsSync(options.savedReportDir)) {
    rimraf.sync(options.savedReportDir)
    console.log('deleted html report folder', options.savedReportDir)
  }
}

function prepare (options) {
  la(options && check.unemptyString(options.savedReportDir), 'missing coverage report dir', options)

  if (!fs.existsSync(options.savedReportDir)) {
    fs.mkdirSync(options.savedReportDir)
    console.log('created folder', options.savedReportDir)
  }
}

function combineCoverage (options, coverage) {
  var collector = new Collector()

  if (fs.existsSync(options.coverageFilename)) {
    collector.add(JSON.parse(fs.readFileSync(options.coverageFilename, 'utf8')))
  }
  collector.add(coverage)
  var combined = collector.getFinalCoverage()

  fs.writeFileSync(options.coverageFilename, JSON.stringify(combined, null, '  '))
  console.log('saved combined coverage to', options.coverageFilename)

  return combined
}

module.exports = function (options) {
  la(check.object(options), 'missing coverage options', options)

  return {
    reset: resetCoverage.bind(null, options),
    prepare: prepare.bind(null, options),
    combine: combineCoverage.bind(null, options)
  }
}
