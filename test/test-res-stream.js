// core
var domain = require('domain')
var http = require('http')
// npm
var concat = require('concat-stream')
var expect = require('code').expect
var Lab = require('lab')
var multiline = require('multiline')
var forEach = require('object-loops/for-each')
var reduce = require('object-loops/reduce')
var sinon = require('sinon')
// local
var createCount = require('callback-count')
var FakeSocket = require('../lib/fake-socket.js')
var ResStream = require('../index.js')
// vars
var lab = exports.lab = Lab.script()
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var describe = lab.describe
var it = lab.it
var PORT = process.env.PORT || 3000
var CRLF = '\r\n'

describe('res-stream', function () {
  var ctx
  beforeEach(function (done) {
    ctx = {}
    done()
  })

  describe('using like a response', function () {
    beforeEach(function (done) {
      ctx.server = http.createServer()
      done()
    })
    afterEach(function (done) {
      ctx.server.close(function () {
        // ignore errors
        done()
      })
    })

    describe('addTrailers', function () {
      it('should be able to modify trailers', function (done) {
        ctx.server.on('request', function (req, res) {
          var trailers = { 'custom-trailer': 'value' }
          var resStream = new ResStream()
          // add trailers to both
          res.addTrailers(trailers)
          resStream.addTrailers(trailers)
          expect(resStream._trailer)
            .to.exist()
            .to.equal(res._trailer)
          // respond to close socket
          res.end()
          done()
        })
        ctx.server.on('error', done)
        ctx.server.listen(PORT, function () {
          http.get({ port: PORT })
        })
      })
    })

    describe('assignSocket, detachSocket', function () {
      it('should assign a socket to the res', function (done) {
        ctx.server.on('request', function (req, res) {
          var resSocket = res.connection
          var altSocket1 = new FakeSocket()
          var altSocket2 = new FakeSocket()
          var resStream = new ResStream()
          // detach res's socket
          res.detachSocket(resSocket)
          // assign fake socket to both
          res.assignSocket(altSocket1)
          resStream.assignSocket(altSocket2)
          expect(res.socket).to.equals(res.connection)
          expect(resStream.socket).to.equals(resStream.connection)
          // assigning a socket already assign to another res will throw
          expect(function () {
            resStream.assignSocket(altSocket1)
          }).to.throw()
          // restore socket and respond to close socket
          res.detachSocket(altSocket1)
          res.assignSocket(resSocket)
          res.end()
          done()
        })
        ctx.server.on('error', done)
        ctx.server.listen(PORT, function () {
          http.get({ port: PORT })
        })
      })
    })

    describe('destroy', function () {
      it('should destroy the socket', function (done) {
        ctx.server.on('request', function (req, res) {
          var resStream = new ResStream()
          // call destroy w/ socket attached
          // stub socket destroy
          sinon.stub(resStream.socket, 'destroy')
          sinon.stub(res.socket, 'destroy')
          resStream.destroy()
          res.destroy()
          sinon.assert.calledOnce(resStream.socket.destroy)
          sinon.assert.calledOnce(res.socket.destroy)
          // restore res back to normal
          res.socket.destroy.restore()
          // call destroy w/ socket detached
          sinon.stub(resStream.__super, 'once')
          sinon.stub(res, 'once')
          var resSocket = res.socket // cache to restore later
          resStream.detachSocket(resStream.socket)
          res.detachSocket(res.socket)
          resStream.destroy()
          res.destroy()
          sinon.assert.calledWith(resStream.once, 'socket')
          sinon.assert.calledWith(res.once, 'socket')
          // restore res back to normal
          res.once.restore()
          res.assignSocket(resSocket)
          res.end()
          done()
        })
        ctx.server.on('error', done)
        ctx.server.listen(PORT, function () {
          http.get({ port: PORT })
        })
      })
    })

    describe('end', function () {
      it('should end the response', function (done) {
        ctx.server.on('request', function (req, res) {
          var count = createCount(done)
          // resStream
          var resStream = new ResStream()
          resStream.end()
          resStream.connection.on('finish', count.inc().next)
          // res
          res.end()
          res.connection.on('finish', count.inc().next)
        })
        ctx.server.on('error', done)
        ctx.server.listen(PORT, function () {
          http.get({ port: PORT })
        })
      })
    })

    // describe('assignSocket', function () {})

    // describe('setHeader, getHeader, removeHeader', function () {
    //   it('should be able to modify headers', function (done) {
    //     var resStream = new ResStream()
    //     var key = 'custom-header'
    //     var val = 'value'
    //     resStream.setHeader(key, val)
    //     expect(resStream.getHeader(key)).to.equal(val)
    //     resStream.removeHeader(key)
    //     expect(resStream.getHeader(key)).to.be.undefined()
    //     done()
    //   })
    // })

  // describe('writeHead', function () {
  //   it('should writeHead', function (done) {
  //     var resStream = new ResStream()
  //     var headers = {
  //       'custom-header1': 'foo',
  //       'custom-header2': 'bar'
  //     }
  //     resStream.connection
  //       .pipe(concat({ objectMode: false }, function (data) {
  //         var strSplit = data.toString().split('\r\n')
  //         expect(strSplit[0]).to.equal('HTTP/1.1 200 OK')
  //         expect(strSplit[1]).to.equal('custom-header1: foo')
  //         expect(strSplit[2]).to.equal('custom-header2: bar')
  //         expect(strSplit[3]).to.match(/^Date:.*$/)
  //         expect(strSplit[4]).to.equal('Connection: keep-alive')
  //         expect(strSplit[5]).to.equal('Transfer-Encoding: chunked')
  //         expect(strSplit[6]).to.equal('')
  //         expect(strSplit[7]).to.equal('2')
  //         expect(strSplit[8]).to.equal('yo')
  //         expect(strSplit[9]).to.equal('0')
  //         expect(strSplit[10]).to.equal('')
  //         done()
  //       }))
  //     resStream.writeHead(200, headers)
  //     resStream.write('yo')
  //     resStream.end()
  //     resStream.connection.end()
  //   })
  // })
  })

  // describe('when using like a stream', function () {
  //   beforeEach(function (done) {
  //     ctx = {}
  //     ctx.server = http.createServer()
  //     ctx.headers = {
  //       'custom-header1': 'value1',
  //       'custom-header2': 'value2',
  //       'custom-header3': 'value3'
  //     }
  //     done()
  //   })

  //   it('it proxy all response methods to pipes', function (done) {
  //     var server = ctx.server

  //     server.on('request', function (req, res) {
  //       var resStream = new ResStream()
  //       // resStream.pipe(res)
  //       resStream.pipe(res)
  //       forEach(ctx.headers, function (key, val) {
  //         resStream.writeHead(key, val)
  //       })
  //       resStream.end('done')
  //     })
  //     server.on('error', done)

//   })
// })
})
