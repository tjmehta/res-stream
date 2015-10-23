'use strict'

var PassThrough = require('stream').PassThrough

module.exports = FakeSocket

function FakeSocket () {
  PassThrough.apply(this, arguments)
}

require('util').inherits(FakeSocket, PassThrough)

/**
 * setTimeout would normally call this.socket.setTimeout(msecs, callback)
 * In this case we just call the cb after the timeout if provided and
 * set __timedout to mark the resStream as timedout
 * @param {[type]}   msecs    [description]
 * @param {Function} callback [description]
 */
FakeSocket.prototype.setTimeout = function (msecs, callback) {
  if (this.__timer) {
    clearTimeout(this.__timer)
  }
  setTimeout()
}

FakeSocket.prototype.destroy = function (err) {
  if (this.__timer) {
    clearTimeout(this.__timer)
  }
  PassThrough.prototype.destroy.apply(this, arguments)
}
