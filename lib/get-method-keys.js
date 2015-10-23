var isFunction = require('101/is-function')
var reduce = require('object-loops/reduce')

module.exports = getMethodKeys

function getMethodKeys (obj) {
  return reduce(obj, function (methodNames, method, key) {
    if (isFunction(method)) {
      methodNames.push(key)
    }
    return methodNames
  }, [])
}
