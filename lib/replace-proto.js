var compose = require('101/compose')
var equals = require('101/equals')
var findIndex = require('101/find-index')
var pluck = require('101/pluck')
var protochain = require('protochain')
require('set-prototype-of')

module.exports = replaceProto

function replaceProto (instance, Class, replacement) {
  var directInstanceOfClass = compose(equals(Class), pluck('constructor'))
  var protos = protochain(instance)
  var index = findIndex(protos, directInstanceOfClass)
  if (index > 0) {
    Object.setPrototypeOf(protos[index - 1], replacement)
  }
}
