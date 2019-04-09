const mathParser = require('./math')

const inputStr = '-5 * -(4 + -2) / (0 + 5) - 3 * 2 is pretty cool'

const { result } = mathParser.parse(inputStr)

console.log(result) // -4
