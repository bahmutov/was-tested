require('lazy-ass');
var check = require('check-types');
var istanbul = require('istanbul');
var instrumenter = new istanbul.Instrumenter();
var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var http = require('http'),
  httpProxy = require('http-proxy');

var pkg = require('./package.json');
var info = pkg.name + ' - ' + pkg.description + '\n' +
    '  version: ' + pkg.version + '\n' +
    '  author: ' + JSON.stringify(pkg.author);

var program = optimist
  .option('version', {
    boolean: true,
    alias: 'v',
    description: 'show version and exit',
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

function shouldBeInstrumented(url) {
  la(check.unemptyString(url), 'expected url string');
  return /app\.js$/.test(url);
}

// this function will be embedded into the client JavaScript code
// so it makes no sense to lint it here
function sendCoverageBackToProxy() {
  setInterval(function sendCoverage() {
    console.log('sending coverage to the server');
    var request = new XMLHttpRequest();
    request.open('POST', '/__coverage', true);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.send(JSON.stringify(__coverage__));
  }, 5000);
}

function writeCoverage(coverage) {
  la(check.object(coverage), 'missing coverage object');
  var Collector = istanbul.Collector;
  var Report = istanbul.Report;

  var collector = new Collector();
  collector.add(coverage);
  var summaryReport = Report.create('text-summary');
  summaryReport.writeReport(collector);
  var htmlReport = Report.create('html');
  htmlReport.writeReport(collector, true);
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
  var filename = url.replace(/^\//, '');
  var fullFilename = path.join(saveFolder, filename);
  fs.writeFileSync(fullFilename, src);
  return fullFilename;
}

function prepareResponseSelectors(proxyRes, req, res) {
  var _write      = res.write;
  var _end        = res.end;
  var _writeHead  = res.writeHead;
  var scriptSrc = '';

  /*
  proxyRes.on('data', function (chunk) {
    // console.log('proxy response data');
    scriptSrc += chunk;
  });*/

  res.writeHead = function (code, headers) {
    var contentType = this.getHeader('content-type');
    console.log('writing head', contentType);

    // Strip off the content length since it will change.
    res.removeHeader('Content-Length');
    if (headers) {
      delete headers['content-length'];
    }
    _writeHead.apply(res, arguments);
  };

  res.write = function (chunk, encoding) {
    scriptSrc += chunk;
    // _write.apply(res, arguments);
  };

  res.end = function (data, encoding) {
    var filename = saveSourceFile(scriptSrc, req.url);
    var instrumented = instrumenter.instrumentSync(scriptSrc, filename);
    instrumented += '\n\n';
    instrumented += sendCoverageBackToProxy.toString() + '\n';
    instrumented += 'sendCoverageBackToProxy();\n';
    _write.call(res, instrumented);
    _end.call(res);
  };
}

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});

//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//
var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  console.log('proxy request', req.url);
  if (req.url === '/__coverage') {
    console.log('received coverage info');
    var str = '';
    req.on('data', function (chunk) {
      str += chunk;
    });
    req.on('end', function () {
      var coverage = JSON.parse(str);
      // console.log(coverage);
      require('fs').writeFileSync('./coverage.json', JSON.stringify(coverage, null, '  '));
      console.log('saved coverage to coverage.json');

      writeCoverage(coverage);
    });
    res.writeHead(200);
    res.end();
  } else {
    proxy.web(req, res, { target: 'http://127.0.0.1:3003' });
  }
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
  if (shouldBeInstrumented(req.url)) {
    console.log('will instrument', req.url);
    prepareResponseSelectors(proxyRes, req, res);
  }
});

console.log("listening on port 5050")
server.listen(5050);
