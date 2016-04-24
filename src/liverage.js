// mock coverage information that just sends
// random "line covered" events to every listener

const join = require('path').join
const justName = require('path').basename
const read = require('fs').readFileSync
const WebSocketServer = require('ws').Server

function sourceMessage (source, filename) {
  return JSON.stringify({source, filename})
}

function start (port) {
  port = port || 3032

  return new Promise(function (resolve, reject) {
    const wss = new WebSocketServer({ port: 3032 })
    var _sourceMessage

    // function sendCoverage (send) {
    //   const filename = join(__dirname, './coverage.json')
    //   const coverage = read(filename, 'utf8')
    //   console.log('resetting code coverage', filename)
    //   send({coverage})
    // }

    // function sendSource (send) {
    //   const sourceName = join(__dirname, '../examples/calc.js')
    //   const source = read(sourceName, 'utf8')
    //   console.log('resetting source code', sourceName)
    //   const filename = justName(sourceName) // for now
    //   send(sourceMessage(source, filename))
    // }

    wss.on('connection', function connection (ws) {
      console.log('new connection!')
      if (_sourceMessage) {
        ws.send(_sourceMessage)
      }
      // sendCoverage(sendObject)
    })
    wss.broadcast = function broadcast (data) {
      console.log('sending message to %d clients', wss.clients.length)
      wss.clients.forEach(function each (client) {
        client.send(data)
      })
    }

    // setInterval(function () {
    //   const randomLine = parseInt(Math.random() * 20)
    //   console.log('sending random line', randomLine)
    //   wss.broadcast(JSON.stringify({line: randomLine}))
    // }, 1000)

    console.log('running ws at port 3032')
    const api = {
      setSource: function (source, filename) {
        _sourceMessage = sourceMessage(source, filename)
        console.log('broadcasting new source to clients', filename)
        wss.broadcast(_sourceMessage)
      }
    }
    resolve(api)
  })
}

module.exports = start
