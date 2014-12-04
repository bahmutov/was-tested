// this function will be embedded into the client JavaScript code
// so it makes no sense to lint it here
function setupCoverageSend() {
  /* jshint ignore:start */
  if (typeof window.__sendCoverageSetup === 'undefined') {
    (function sendCoverageBackToProxy() {
      setInterval(function sendCoverage() {
        console.log('sending coverage to the server');
        var request = new XMLHttpRequest();
        request.open('POST', '/__coverage', true);
        request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
        request.send(JSON.stringify(__coverage__));
      }, 5000);
      window.__sendCoverageSetup = true;
    }());
  }
  /* jshint ignore:end */
}

module.exports = setupCoverageSend;
