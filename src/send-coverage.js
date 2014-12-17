// this function will be embedded into the client JavaScript code
// so it makes no sense to lint it here
function setupCoverageSend() {
  /* jshint ignore:start */
  /* eslint ignore:start */
  if (typeof window.__sendCoverageSetup === 'undefined') {

    var _previousCoverage;

    function diffValue(key, o1, o2) {
      return o1[key] !== o2[key];
    }

    function diffValues(o1, o2) {
      if (!o1 || !o2) {
        return true;
      }
      return Object.keys(o1).some(function (key) {
        return diffValue(key, o1, o2);
      });
    }

    function hasCoverageChanged(coverA, coverB) {
      if (!coverA || !coverB) {
        return true;
      }
      return Object.keys(coverA).some(function (file) {
        return diffValues(coverA[file].s, coverB[file].s);
      });
    }

    function deepClone(o) {
      return JSON.parse(JSON.stringify(o));
    }

    function shouldSendCoverage(coverage) {
      var hasChanged = hasCoverageChanged(coverage, _previousCoverage);
      if (hasChanged) {
        _previousCoverage = deepClone(coverage);
      }
      return hasChanged;
    }

    (function sendCoverageBackToProxy() {
      if (!window.__coverage__) {
        throw new Error('Cannot find __coverage__ object');
      }
      var interval = setInterval(function sendCoverage() {
        if (shouldSendCoverage(__coverage__)) {
          console.log('sending coverage to the server');
          var request = new XMLHttpRequest();
          request.open('POST', '/__coverage', true);
          request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
          request.send(JSON.stringify(__coverage__));
        }
      }, 5000);
      window.__sendCoverageSetup = true;
    }());
  }
  /* jshint ignore:end */
  /* eslint ignore:end */
}

module.exports = setupCoverageSend;
