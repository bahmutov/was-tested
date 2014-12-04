#!/usr/bin/env node

require('lazy-ass');
var ecstatic = require('ecstatic');
var check = require('check-types');
var istanbul = require('istanbul');
var Collector = istanbul.Collector;
var instrumenter = new istanbul.Instrumenter();
var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var http = require('http'),
  httpProxy = require('http-proxy');
var savedReportDir = './html-report';
var pkg = require('./package.json');
var info = pkg.name + ' - ' + pkg.description + '\n' +
    '  version: ' + pkg.version + '\n' +
    '  author: ' + JSON.stringify(pkg.author);

require('./src/check-updates')();

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
  .usage(info)
  .argv;

if (program.version) {
  console.log(info);
  process.exit(0);
}

if (program.help || program.h) {
  optimist.showHelp();
  process.exit(0);
}

la(check.unemptyString(program.target), 'missing target server url', program);

function shouldInstrument(regex, url) {
  la(check.instance(regex, RegExp), 'not a regex', regex);
  la(check.unemptyString(url), 'expected url string');
  return regex.test(url);
}

var shouldBeInstrumented = shouldInstrument.bind(null, new RegExp(program.instrument));

var setupCoverageSend = require('./src/send-coverage');
la(check.fn(setupCoverageSend), 'missing send coverage function');

function writeCoverageReports(coverage) {
  la(check.object(coverage), 'missing coverage object');
  var Report = istanbul.Report;

  var collector = new Collector();
  collector.add(coverage);

  var summaryReport = Report.create('text-summary');
  summaryReport.writeReport(collector);
  var htmlReport = Report.create('html');
  htmlReport.writeReport(collector, true);
}

var coverageFilename = path.join(savedReportDir, 'coverage.json');

function resetCoverage() {
  if (fs.existsSync(coverageFilename)) {
    fs.unlinkSync(coverageFilename);
    console.log('deleted previous coverage file', coverageFilename);
  }
}

if (program.reset) {
  resetCoverage();
}

if (!fs.existsSync(savedReportDir)) {
  fs.mkdirSync(savedReportDir);
  console.log('created folder', savedReportDir);
}

function combineCoverage(coverage) {
  var collector = new Collector();
  if (fs.existsSync(coverageFilename)) {
    collector.add(JSON.parse(fs.readFileSync(coverageFilename, 'utf8')));
  }
  collector.add(coverage);
  var combined = collector.getFinalCoverage();
  fs.writeFileSync(coverageFilename, JSON.stringify(combined, null, '  '));
  console.log('saved combined coverage to', coverageFilename);
  return combined;
}

function prepareSaveDir() {
  var saveFolder = './scripts/';
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder);
  }
  return saveFolder;
}
var saveFolder = prepareSaveDir();

function saveSourceFile(src, url) {
  la(check.unemptyString(src), 'missing file source');
  la(check.unemptyString(url), 'missing url');

  // just leave filename
  var stripParams = url.replace(/\?.*$/, '');
  var lastSlash = stripParams.lastIndexOf('/');
  if (lastSlash !== -1) {
    stripParams = stripParams.substr(lastSlash + 1);
  }
  var filename = stripParams;
  console.log('url', url, 'filename', filename);

  var fullFilename = path.join(saveFolder, filename);
  fs.writeFileSync(fullFilename, src);
  return fullFilename;
}

function prepareResponseSelectors(proxyRes, req, res) {
  var _write      = res.write;
  var _end        = res.end;
  var _writeHead  = res.writeHead;
  var scriptSrc = '';

  res.writeHead = function (code, headers) {
    console.log(code, req.method, req.url);
    if (code === 304) {
      scriptSrc = '';
      return _writeHead.apply(res, arguments);
    }
    var contentType = this.getHeader('content-type');
    la(check.unemptyString(contentType), 'missing content type for code', code);

    // Strip off the content length since it will change.
    res.removeHeader('Content-Length');
    if (headers) {
      delete headers['content-length'];
    }
    _writeHead.apply(res, arguments);
  };

  res.write = function (chunk) {
    scriptSrc += chunk;
  };

  res.end = function (data) {
    if (data) {
      scriptSrc += data;
    }
    if (scriptSrc) {
      var filename = saveSourceFile(scriptSrc, req.url);
      var instrumented = instrumenter.instrumentSync(scriptSrc, filename);
      instrumented += '\n\n';
      instrumented += setupCoverageSend.toString() + '\n';
      instrumented += 'setupCoverageSend();\n';
      _write.call(res, instrumented);
    }
    _end.call(res);
  };
}

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});
var getReportUrlPrefix = '__report/';

var reportServer = ecstatic({
  root: savedReportDir,
  baseDir: getReportUrlPrefix
});

function isGetReportRequest(url) {
  return url.indexOf(getReportUrlPrefix) === 1;
}

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function (req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  console.log(req.method, req.url);

  if (req.method === 'GET' && isGetReportRequest(req.url)) {
    console.log('coverage report', req.url);
    reportServer(req, res);
  } else if (req.method === 'GET' && req.url === '/__reset') {
    resetCoverage();
    res.writeHead(200);
    res.end();
  } else if (req.method === 'POST' && req.url === '/__coverage') {
    console.log('received coverage info');
    var str = '';
    req.on('data', function (chunk) {
      str += chunk;
    });
    req.on('end', function () {
      var coverage = JSON.parse(str);
      var combined = combineCoverage(coverage);
      writeCoverageReports(combined);
    });
    res.writeHead(200);
    res.end();
  } else {
    console.log('proxy', req.method, req.url);
    proxy.web(req, res, {
      target: program.target,
      xfwd: true
    });
  }
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  proxyReq.setHeader('X-Forwarded-Proto', 'https');
  console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
  if (shouldBeInstrumented(req.url)) {
    console.log('will instrument', req.url);
    prepareResponseSelectors(proxyRes, req, res);
  }
});
});

proxy.on('error', function (err, req, res) {
  console.error(err);
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });

  res.end('Something went wrong. And we are reporting a custom error message.');
});

console.log(pkg.name, 'listening on port', program.port);
server.listen(program.port);
