#!/usr/bin/env node

'use strict'

var la = require('lazy-ass')
var pkg = require('./package.json')
var check = require('check-more-types')
var istanbul = require('istanbul')
var instrumenter = new istanbul.Instrumenter()
var fs = require('fs')
var path = require('path')
var http = require('http')
var httpProxy = require('http-proxy')
var savedReportDir = './html-report'
var startLiverage = require('./src/liverage')

// for broadcasting real time updates
var realTimeApi

require('./src/check-updates')()

var program = require('./src/cli-options')()
if (program.folder) {
  la(fs.existsSync(program.folder), 'cannot find working folder', program.folder)
  process.chdir(program.folder)
}
console.log(pkg.name, 'starting in', process.cwd())

la(check.unemptyString(program.target), 'missing target server url', program)

function prepareSaveDir () {
  var saveToFolder = './scripts/'
  if (!fs.existsSync(saveToFolder)) {
    fs.mkdirSync(saveToFolder)
  }
  return saveToFolder
}
var saveFolder = prepareSaveDir()

function shouldInstrument (regex, url) {
  la(check.instance(regex, RegExp), 'not a regex', regex)
  la(check.unemptyString(url), 'expected url string')
  const shouldInstrument = regex.test(url)
  console.log('should instrument %s?', url, shouldInstrument)
  return shouldInstrument
}

var shouldBeInstrumented = shouldInstrument.bind(null, new RegExp(program.instrument))

var setupCoverageSend = require('./src/send-coverage')
la(check.fn(setupCoverageSend), 'missing send coverage function')

var coverageFilename = path.join(saveFolder, 'coverage.json')

var coverageOptions = {
  coverageFilename: coverageFilename,
  savedReportDir: savedReportDir,
  saveFolder: saveFolder
}

var cover = require('./src/coverage')(coverageOptions)

if (program.reset) {
  cover.reset()
}

cover.prepare()

function urlToFilename (url) {
  la(check.unemptyString(url), 'missing url')
  // just leave filename
  var stripParams = url.replace(/\?.*$/, '')
  var lastSlash = stripParams.lastIndexOf('/')
  if (lastSlash !== -1) {
    stripParams = stripParams.substr(lastSlash + 1)
  }
  return stripParams
}

function saveSourceFile (src, url) {
  la(check.unemptyString(src), 'missing file source')
  la(check.unemptyString(url), 'missing url')

  var filename = urlToFilename(url)

  var fullFilename = path.join(saveFolder, filename)
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder)
  }
  fs.writeFileSync(fullFilename, src)
  console.log('saved url', url, 'as file', fullFilename)

  if (realTimeApi) {
    realTimeApi.setSource(src, filename)
  }

  return fullFilename
}

function prepareResponseSelectors (proxyRes, req, res) {
  /* eslint no-underscore-dangle:0 */
  var _write = res.write
  var _end = res.end
  var _writeHead = res.writeHead
  var scriptSrc = ''

  res.writeHead = function (code, headers) {
    console.log('writing head for', req.method, req.url)
    if (code === 304) {
      scriptSrc = ''
      return _writeHead.apply(res, arguments)
    }
    var contentType = this.getHeader('content-type')
    la(check.unemptyString(contentType), 'missing content type for code', code)

    // Strip off the content length since it will change.
    res.removeHeader('Content-Length')
    if (headers) {
      delete headers['content-length']
    }
    _writeHead.apply(res, arguments)
  }

  res.write = function (chunk) {
    scriptSrc += chunk
  }

  res.end = function (data) {
    // console.log('res.end data')
    if (data) {
      scriptSrc += data
    }
    if (scriptSrc) {
      // console.log('res.end script src', scriptSrc)
      try {
        var filename = saveSourceFile(scriptSrc, req.url)
        var shortName = path.basename(filename)
        var instrumented = instrumenter.instrumentSync(scriptSrc, shortName)
        console.log('short name', shortName, 'for script url', req.url)

        instrumented += '\n\n'
        instrumented += setupCoverageSend.toString() + '\n'
        instrumented += 'setupCoverageSend();\n'
        _write.call(res, instrumented)
      } catch (err) {
        console.error('could not instrument js file', req.url)
        console.error(err.message)
        console.error('will send the original source')
        // console.log(scriptSrc)
        _write.call(res, scriptSrc)
      }
    }
    _end.call(res)
  }
}

//
// Create a proxy server with custom application logic
//
var proxyOpts = {}
if (program.rehost) {
  proxyOpts.hostRewrite = program.rehost
}
var proxy = httpProxy.createProxyServer(proxyOpts)

var dispatch = require('./src/dispatch')({
  proxy: proxy,
  target: program.target
}, coverageOptions)
la(check.fn(dispatch), 'missing dispatch function')
var server = http.createServer(dispatch)

proxy.on('proxyReq', function (proxyReq) {
  if (program.host) {
    proxyReq.setHeader('Host', program.host)
  }
})

proxy.on('proxyRes', function (proxyRes, req, res) {
  console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2))
  if (shouldBeInstrumented(req.url)) {
    console.log('will instrument', req.url)
    prepareResponseSelectors(proxyRes, req, res)
  }
})

proxy.on('error', function (err, req, res) {
  console.error(err)
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  })

  res.end('Something went wrong. And we are reporting a custom error message.')
})

startLiverage()
  .catch((err) => {
    console.error(err)
  })
  .then(function (_realTimeApi) {
    if (_realTimeApi) {
      realTimeApi = _realTimeApi
    }
    var quote = require('quote')
    console.log(pkg.name, 'listening on port', program.port,
      'instrumenting urls matching', quote(program.instrument))
    console.log('target url', program.target)
    server.listen(program.port)
  })
