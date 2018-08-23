/**
 * Minimal demo of parser combinators, possibly as a target for recent
 * JS web dev graduates to implement as an exercise.
 *
 * Huge credit to Hutton, Meijer, and Swierstra for their papers
 * on the subject.
 */

class Parser {

    // :: (String -> { result: a, remaining: String }) -> Parser a
    constructor (parser) {
        this._parser = parser
    }

    // :: Parser a ~> String -> { result: a, remaining: String }
    parse (string) {
        return this._parser(string)
    }

    // :: String -> Parser String
    static literal (string) {
        return new Parser(tokens => {
            const match = tokens.slice(0, string.length)
            if (match !== string) return null
            return {
                result: match,
                remaining: tokens.slice(match.length),
            }
        })
    }

    // :: Parser a ~> Parser b -> Parser a | b
    or (p2) {
        return new Parser(tokens => this.parse(tokens) || p2.parse(tokens))
    }

    // :: ...Parser * -> Parser *
    static any (...ps) {
        return ps.reduce((anyP, p) => anyP.or(p))
    }

    // OK here comes the monad stuff…

    // :: a -> Parser a
    static of (value) { // aka unit, pure, return, inject
        return new Parser(string => ({
            result: value,
            remaining: string,
        }))
    }

    // :: Parser a ~> (a -> Parser b) -> Parser b
    chain (step) { // aka bind, then, flatMap
        return new Parser(tokens => {
            const res1 = this.parse(tokens)
            if (!res1) return null
            const p2 = step(res1.result)
            return p2.parse(res1.remaining)
        })
    }

    // :: Parser a ~> (a -> b) -> Parser b
    map (f) {
        return this.chain(x => Parser.of(f(x)))
    }

    // :: Parser a -> Parser [a]
    static many0 (p1) {
        return p1.chain(r => {
            return Parser.many0(p1).chain(rs => {
                return Parser.of([r, ...rs])
            })
        }).or(Parser.of([]))
    }

    // :: Parser a -> Parser [a]
    static many1 (p1) {
        return p1.chain(r => {
            return Parser.many0(p1).chain(rs => {
                return Parser.of([r, ...rs])
            })
        })
    }

    // :: Parser a ~> Parser b -> Parser b
    useRight (p2) {
        return this.chain(() => p2)
    }

    // :: Parser a ~> Parser b -> Parser a
    useLeft (p2) {
        return this.chain(left => p2.chain(() => Parser.of(left)))
    }

    // :: Parser a ~> (* -> Parser b) -> Parser b
    useRightZ (mkP2) { // laZy version (thunked)
        return this.chain(mkP2)
    }
}

const P = Parser

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
        .useRightZ(() => EXPR)
        .useLeft(SPACE)
        .useLeft(P.literal(')')),

        P.literal('-')
        .useRightZ(() => FACTOR)
        .map(n => -n),

        NUM
    )

const F2 = // :: Parser Number
    P.any(
        SPACE
        .useRight(P.literal('*'))
        .useRight(SPACE)
        .useRight(FACTOR
        .chain(n1 => F2
        .map(n2 => n1 * n2))),

        SPACE
        .useRight(P.literal('/'))
        .useRight(SPACE)
        .useRight(FACTOR
        .chain(n1 => F2
        .map(n2 => 1/n1 * n2))),

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
        .useRight(TERM
        .chain(n1 => T2
        .map(n2 => n1 + n2))),

        SPACE
        .useRight(P.literal('-'))
        .useRight(SPACE)
        .useRight(TERM
        .chain(n1 => T2
        .map(n2 => -n1 + n2))),

        P.of(0)
    )

const EXPR = // :: Parser Number
    TERM
    .chain(n1 => T2
    .map(n2 => n1 + n2))

const res = EXPR.parse('-5 * -(4 + -2) / (0 + 5) - 3 * 2 is pretty cool')
console.log(res.result) // -4
