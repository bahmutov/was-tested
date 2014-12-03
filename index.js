require('lazy-ass');
var check = require('check-types');
var istanbul = require('istanbul');
var instrumenter = new istanbul.Instrumenter();

var http = require('http'),
  httpProxy = require('http-proxy');

function shouldBeInstrumented(url) {
  la(check.unemptyString(url), 'expected url string');
  return /app\.js$/.test(url);
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
    var instrumented = instrumenter.instrumentSync(scriptSrc, req.url);
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
  proxy.web(req, res, { target: 'http://127.0.0.1:3003' });
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
