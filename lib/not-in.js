module.exports = notIn

function notIn (removeArr) {
  return function (item) {
    return !~removeArr.indexOf(item)
  }
}
