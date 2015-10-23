var PassThrough = require('stream').PassThrough
var ServerResponse = require('http').ServerResponse
var Stream = require('stream').Stream

var clone = require('utils-copy')
var replaceProto = require('./replace-proto.js')

var mockReq = { // defaults to version 1.1
  httpVersionMajor: 1,
  httpVersionMinor: 1,
  headers: {
    connection: 'close' // not 'keep-alive'
  }
}

module.exports = PassThroughServerResponse

function PassThroughServerResponse (req) {
  req = req || mockReq
  ServerResponse.call(this, req)
  PassThrough.call(this)
  if (req.headers) {
    this.shouldKeepAlive = /keep-alive/i.test(req.headers.connection)
  }
}

Object.setPrototypeOf(PassThroughServerResponse.prototype, clone(ServerResponse.prototype))

replaceProto(PassThroughServerResponse.prototype, Stream, PassThrough.prototype)
