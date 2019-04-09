const P = require('./parser')

/**
 * Demonstration using math expressions
 */

const DIGIT = // :: Parser Number
    P.any(...'0123456789'.split('').map(P.literal))

const SPACE = // :: Parser String
    P.many0(P.literal(' '))

const NUM = // :: Parser Number
    P.many1(DIGIT)
    .map(nums => +nums.join(''))

const FACTOR = // :: Parser Number
    P.any(
        P.literal('(')
        .useRight(SPACE)
        .useRight(P.lazy(() => EXPR))
        .useLeft(SPACE)
        .useLeft(P.literal(')')),

        P.literal('-')
        .useRight(P.lazy(() => FACTOR))
        .map(n => -n),

        NUM
    )

const F2 = // :: Parser Number
    P.any(
        SPACE
        .useRight(P.literal('*'))
        .useRight(SPACE)
        .useRight(FACTOR)
        .chain(n1 => F2
        .map(n2 => n1 * n2)),

        SPACE
        .useRight(P.literal('/'))
        .useRight(SPACE)
        .useRight(FACTOR)
        .chain(n1 => F2
        .map(n2 => 1/n1 * n2)),

        P.of(1)
    )

const TERM = // :: Parser Number
    FACTOR
    .chain(n1 => F2
    .map(n2 => n1 * n2))

const T2 = // :: Parser Number
    P.any(
        SPACE
        .useRight(P.literal('+'))
        .useRight(SPACE)
        .useRight(TERM)
        .chain(n1 => T2
        .map(n2 => n1 + n2)),

        SPACE
        .useRight(P.literal('-'))
        .useRight(SPACE)
        .useRight(TERM)
        .chain(n1 => T2
        .map(n2 => -n1 + n2)),

        P.of(0)
    )

const EXPR = // :: Parser Number
    TERM
    .chain(n1 => T2
    .map(n2 => n1 + n2))

module.exports = EXPR
