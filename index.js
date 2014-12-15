#!/usr/bin/env node

require('lazy-ass');
var pkg = require('./package.json');
var ecstatic = require('ecstatic');
var check = require('check-types');
var istanbul = require('istanbul');
var Collector = istanbul.Collector;
var instrumenter = new istanbul.Instrumenter();
var fs = require('fs');
var path = require('path');
var http = require('http'),
  httpProxy = require('http-proxy');
var savedReportDir = './html-report';

require('./src/check-updates')();

var program = require('./src/cli-options')();
if (program.folder) {
  la(fs.existsSync(program.folder), 'cannot find working folder', program.folder);
  process.chdir(program.folder);
}
console.log(pkg.name, 'starting in', process.cwd());

la(check.unemptyString(program.target), 'missing target server url', program);

function prepareSaveDir() {
  var saveFolder = './scripts/';
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder);
  }
  return saveFolder;
}
var saveFolder = prepareSaveDir();

function shouldInstrument(regex, url) {
  la(check.instance(regex, RegExp), 'not a regex', regex);
  la(check.unemptyString(url), 'expected url string');
  return regex.test(url);
}

var shouldBeInstrumented = shouldInstrument.bind(null, new RegExp(program.instrument));

var setupCoverageSend = require('./src/send-coverage');
la(check.function(setupCoverageSend), 'missing send coverage function');

function writeCoverageReports(coverage) {
  la(check.object(coverage), 'missing coverage object');

  // change names to file paths
  Object.keys(coverage).forEach(function (name) {
    la(check.unemptyString(coverage[name].path), 'missing path for', name);
    coverage[name].path = './' + path.join(saveFolder, name);
    console.log('mapped', name, 'to', coverage[name].path);
  });

  // remove references to non-existent files
  Object.keys(coverage).forEach(function (name) {
    if (!fs.existsSync(coverage[name].path)) {
      console.error('cannot find source for coverage', coverage[name].path, 'removing');
      delete coverage[name];
    } else {
      console.log(coverage[name].path);
    }
  });

  // add ./ in front of each name, otherwise html reporter removes first 2 characters
  Object.keys(coverage).forEach(function (name) {
    var c = coverage[name];
    delete coverage[name];
    coverage['./' + name] = c;
  });

  var collector = new Collector();
  collector.add(coverage);

  var Report = istanbul.Report;
  var summaryReport = Report.create('text-summary');
  summaryReport.writeReport(collector);
  var htmlReport = Report.create('html');
  htmlReport.writeReport(collector, true);

  console.log('saved coverage reports');
}

var coverageFilename = path.join(saveFolder, 'coverage.json');

function resetCoverage() {
  if (fs.existsSync(coverageFilename)) {
    fs.unlinkSync(coverageFilename);
    console.log('deleted previous coverage file', coverageFilename);
  }
  if (fs.existsSync(saveFolder)) {
    require('rimraf').sync(saveFolder);
    console.log('deleted temp folder', saveFolder);
  }

  if (fs.existsSync(savedReportDir)) {
    require('rimraf').sync(savedReportDir);
    console.log('deleted html report folder', savedReportDir);
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

function urlToFilename(url) {
  la(check.unemptyString(url), 'missing url');
  // just leave filename
  var stripParams = url.replace(/\?.*$/, '');
  var lastSlash = stripParams.lastIndexOf('/');
  if (lastSlash !== -1) {
    stripParams = stripParams.substr(lastSlash + 1);
  }
  return stripParams;
}

function saveSourceFile(src, url) {
  la(check.unemptyString(src), 'missing file source');
  la(check.unemptyString(url), 'missing url');

  var filename = urlToFilename(url);

  var fullFilename = path.join(saveFolder, filename);
  if (!fs.existsSync(saveFolder)) {
    fs.mkdirSync(saveFolder);
  }
  fs.writeFileSync(fullFilename, src);
  console.log('saved url', url, 'as file', fullFilename);
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
      try {
        var filename = saveSourceFile(scriptSrc, req.url);
        var shortName = path.basename(filename);
        var instrumented = instrumenter.instrumentSync(scriptSrc, shortName);
        console.log('short name', shortName, 'for script url', req.url);

        instrumented += '\n\n';
        instrumented += setupCoverageSend.toString() + '\n';
        instrumented += 'setupCoverageSend();\n';
        _write.call(res, instrumented);
      } catch (err) {
        console.error('could not instrument js file', req.url);
        console.error(err.message);
        console.error('will send original source');
        console.log(scriptSrc);
        _write.call(res, scriptSrc);
      }
    }
    _end.call(res);
  };
}

//
// Create a proxy server with custom application logic
//
var proxyOpts = {};
if (program.rehost){
  proxyOpts.hostRewrite = program.rehost;
}
var proxy = httpProxy.createProxyServer(proxyOpts);
var getReportUrlPrefix = '__report';

var reportServer = ecstatic({
  root: savedReportDir,
  baseDir: getReportUrlPrefix + '/'
});

function isGetReportRequest(url) {
  var urlRegexp = new RegExp('^/' + getReportUrlPrefix + '/?');
  return urlRegexp.test(url);
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
  } else if (req.method === 'GET' && /^\/__reset\/?/.test(req.url)) {
    resetCoverage();
    res.writeHead(200);
    res.end();
  } else if (req.method === 'GET' && /^\/__coverage\/?/.test(req.url)) {
    var coverageFilename = path.join(saveFolder, 'coverage.json');
    if (!fs.existsSync(coverageFilename)) {
      console.error('cannot find coverage', coverageFilename);
      res.writeHead(404);
      res.end();
    } else {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(fs.readFileSync(coverageFilename, 'utf-8'));
    }
  } else if (req.method === 'POST' && /^\/__coverage\/?/.test(req.url)) {
    console.log('received coverage info, current folder', process.cwd());
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

    // make sure the JavaScript files are not gzipped
    if (/\.js/.test(req.url)) {
      req.headers['accept-encoding'] = 'text/plain';
    }

    proxy.web(req, res, {
      target: program.target,
      xfwd: false
    });
  }
});

proxy.on('proxyReq', function(proxyReq) {
    if(program.host){
        proxyReq.setHeader('Host', program.host);
    }
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
  if (shouldBeInstrumented(req.url)) {
    console.log('will instrument', req.url);
    prepareResponseSelectors(proxyRes, req, res);
  }
});

proxy.on('error', function (err, req, res) {
  console.error(err);
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });

  res.end('Something went wrong. And we are reporting a custom error message.');
});

var quote = require('quote');
console.log(pkg.name, 'listening on port', program.port,
  'instrumenting urls matching', quote(program.instrument));
console.log('target url', program.target);
server.listen(program.port);
