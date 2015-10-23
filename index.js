'use strict'

var PassThrough = require('stream').PassThrough
var http = require('http') // require(process.env.HTTP_PATH)

var keysIn = require('101/keys-in')
var FakeSocket = require('./lib/fake-socket.js')

var getMethodKeys = require('./lib/get-method-keys.js')
var notIn = require('./lib/not-in.js')
var PassThroughServerResponse = require('./lib/pass-through-server-response.js')

var OutgoingMessage = http.OutgoingMessage
var ServerResponse = http.ServerResponse
var resMethodNames = []
  .concat(getMethodKeys(OutgoingMessage.prototype))
  .concat(getMethodKeys(ServerResponse.prototype))
  // remove PassThrough methods (stream methods)
  .filter(notIn(keysIn(PassThrough)))

module.exports = ResStream

/**
 * Creates a new ResStream
 * @class
 * @param {DuplexStream} duplexStream used for body stream
 * @param {ServerRequest|IncomingMessage} [req] res's req, defaults to a v1.1 mockReq
 */
function ResStream (duplexStream, req) {
  var calledWithoutNew = !(this instanceof ResStream)
  if (calledWithoutNew) {
    return new ResStream(duplexStream, req)
  }
  // constructor:
  // default req to mockReq
  duplexStream = duplexStream || new PassThrough()
  // custom properties
  this._resStreamState = {
    timedout: false,
    recorded: []
  }
  var proto = Object.getPrototypeOf(this)
  // Inherit from PassThroughServerResponse, composed in the prototype
  Object.setPrototypeOf(proto, new PassThroughServerResponse(req))
  this.__super = Object.getPrototypeOf(proto)
  this.__super.assignSocket(new FakeSocket())
  this.once('finish', onFinish)
  var self = this
  function onFinish () {
    // immitate normal server response behavior
    // https: // github.com/nodejs/node/blob/ab03635fb1fd9d380d214116d2ba5bd96b2b9311/lib/_http_server.js#L506
    var socket = self.__super.socket
    self.__super.detachSocket(self.__super.socket)
    socket.end() // destroySoon would be end.
  }
}

// inherit from OutgoingMessage and ServerResponse w/ extended behavior
console.log(resMethodNames.sort())
resMethodNames.forEach(resProxyMethod)

/**
 * res methods that should be "proxied" to destination pipes.
 * if there is no dest record the methods and playback when piped
 * @param  {String} methodName  method that should be "piped" to res-like destinations
 */
function resProxyMethod (methodName) {
  ResStream.prototype[methodName] = function () {
    var __super = this.__super
    var args = Array.prototype.slice.call(arguments)
    var pipes = __super._readableState.pipes

    if (!pipes) {
      this.__resStreamRecord(methodName, args)
    } else {
      pipes = Array.isArray(pipes) ? pipes : [pipes]
      this.__resStreamProxy(pipes, methodName, args)
    }

    return __super[methodName].apply(__super, arguments)
  }
}

ResStream.prototype.__resStreamRecord = function (methodName, args) {
  this._resStreamState.recorded.push({
    methodName: methodName,
    args: args
  })
}

ResStream.prototype.__resStreamPlay = function (pipe) {
  // this._resStreamState.recorded.forEach(function (record) {
  //   this.__resStreamProxy([pipe], record.methodName, record.args)
  // })
  var recorded = this._resStreamState.recorded
  var record
  while (recorded.length) {
    record = recorded.unshift()
    this.__resStreamProxy([pipe], record.methodName, record.args)
  }
}

ResStream.prototype.__resStreamProxy = function (pipes, methodName, args) {
  // pipes existance has already been checked
  pipes
    .filter(function (pipe) {
      return (pipe instanceof OutgoingMessage || pipe instanceof ServerResponse || pipe instanceof ResStream)
    })
    .forEach(function (pipe) {
      pipe[methodName].apply(pipe, args)
    })
}

// TODO: inherit more for PassThrough/WritableStream/ReadableStream
ResStream.prototype.pipe = function (dest) {
  var self = this
  var __super = this.__super
  var ret = __super.pipe.apply(__super, arguments)
  // proxy all recorded res method calls
  process.nextTick(function () {
    // nextTick so multiple streams can be piped
    self.__resStreamPlay(dest)
  })

  return ret
}
