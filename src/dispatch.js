var la = require('lazy-ass');
var check = require('check-more-types');
var ecstatic = require('ecstatic');
var istanbul = require('istanbul');
var Collector = istanbul.Collector;
var fs = require('fs');
var path = require('path');

var getReportUrlPrefix = '__report';

function writeCoverageReports(coverageOptions, coverage) {
  la(check.object(coverage), 'missing coverage object');

  // change names to file paths
  Object.keys(coverage).forEach(function (name) {
    la(check.unemptyString(coverage[name].path), 'missing path for', name);
    coverage[name].path = './' + path.join(coverageOptions.saveFolder, name);
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

function configDispatch(options, coverageOptions) {
  la(check.object(options), 'missing options', options);
  la(check.object(options.proxy), 'missing proxy', options);

  la(check.object(coverageOptions), 'missing coverage options');
  la(check.unemptyString(coverageOptions.savedReportDir), 'missing saved report dir', coverageOptions);

  var cover = require('./coverage')(coverageOptions);

  var reportServer = ecstatic({
    root: coverageOptions.savedReportDir,
    baseDir: getReportUrlPrefix + '/'
  });

  function isGetReportRequest(url) {
    var urlRegexp = new RegExp('^/' + getReportUrlPrefix + '/?');
    return urlRegexp.test(url);
  }

  function forward(req, res) {
    console.log('proxy', req.method, req.url);

    // make sure the JavaScript files are not gzipped
    if (/\.js/.test(req.url)) {
      req.headers['accept-encoding'] = 'text/plain';
    }

    la(check.unemptyString(options.target), 'missing target host', options);
    options.proxy.web(req, res, {
      target: options.target,
      xfwd: false
    });
  }

  function postCoverage(req, res) {
    console.log('received coverage info, current folder', process.cwd());
    var str = '';
    req.on('data', function (chunk) {
      str += chunk;
    });
    req.on('end', function () {
      var coverage = JSON.parse(str);
      var combined = cover.combine(coverage);
      writeCoverageReports(coverageOptions, combined);
    });
    res.writeHead(200);
    res.end();
  }

  return function dispatch(req, res) {
    // You can define here your custom logic to handle the request
    // and then proxy the request.
    console.log(req.method, req.url);

    if (req.method === 'GET' && isGetReportRequest(req.url)) {
      console.log('coverage report', req.url);
      reportServer(req, res);
    } else if (req.method === 'GET' && /^\/__reset\/?/.test(req.url)) {
      cover.reset();
      res.writeHead(200);
      res.end();
    } else if (req.method === 'GET' && /^\/__coverage\/?/.test(req.url)) {
      la(check.unemptyString(coverageOptions.coverageFilename), 'missing coverage filename');
      if (!fs.existsSync(coverageOptions.coverageFilename)) {
        console.error('cannot find coverage', coverageOptions.coverageFilename);
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(fs.readFileSync(coverageOptions.coverageFilename, 'utf-8'));
      }
    } else if (req.method === 'POST' && /^\/__coverage\/?/.test(req.url)) {
      postCoverage(req, res);
    } else {
      forward(req, res);
    }
  };
}

module.exports = configDispatch;
