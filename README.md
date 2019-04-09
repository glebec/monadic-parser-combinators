# Monadic Parser Demo

Originally a [gist](https://gist.github.com/glebec/572196e2ca30d9afe09c38b4e9d2b227).

## Contents and Usage

File | Notes
-----|------
[`src/parser.js`](src/parser.js) | Monadic parser combinator class
[`src/math.js`](src/math.js) | Example arithmetic expression parser built from above
[`src/demo.js`](src/demo.js) | Example usage of the arithmetic parser (only side effect)
[`docs/math.ebnf`](docs/math.ebnf) | EBNF grammar for arithmetic expressions

```sh
node src/demo # will print `-4`
```

## Topics and Explanations

### Functional Parser Basics

At its core, a **parser** is a function which reads the start of an input string and might produce a result. Because parsers could fail to match the input, we need a way to signal that. Pure functional languages typically use either a `Maybe` type or else _lists_ of results (with the empty list denoting failure). In this JS repo we use the more idiomatic `null` value for minimalism's sake.

```hs
ParserFn a :: String -> (a | Null)
```

```js
// ParserFn Number
const parseTwo = str =>
    str.starsWith('2')
        ? 2
        : null
```

Because parsers might not consume the entire input string, the function should also return the remaining portion, so chained parsers can pick up from the correct position. We therefore wrap our result and remainder in a container:

```hs
ParserFn a :: String -> ({ result: a, remainder: String } | Null)
```

```js
// ParserFn Number
const parseTwo = str =>
    str.startsWith('2')
        ? { result: 2, remaining: str.slice(1) }
        : null
```

Finally, in this repo we wrap our parsing function inside of a `Parser` class instance to have easy and memory-efficient infix methods between parsers. This means to actually "run" a parser we apply the `parse` method:

```hs
Parser a :: Parser.from(ParserFn)
```

```js
// Parser Number (from raw parsing function)
const two = Parser.from(parseTwo)

// generating a new Parser Number via infix `useRight`
const takeSecondTwo = two.useRight(two)

// using the new Parser Number via `parse` method
const output = takeSecondTwo.parse('229')
// { result: 2, remainder: '9' }
```

### The Combinator Pattern

The [combinator pattern](https://wiki.haskell.org/Combinator_pattern) is a common, versatile, powerful library design pattern in functional programming. A library provides a mixture of simple **primitives** and
a means of enhancing those primitives via **combinator** functions. Importantly, the result of applying a combinator is _another primitive_ – which can become a new input to the same combinators. This cycle creates a combinatorial explosion of possibilities, quickly and declaratively building up richer values without manually plumbing together implementations.

For example, in this repo the `or` combinator takes two _parsers_ and returns a _new parser_. Because the result is a parser, it in turn can be passed back into `or`:

```js
// some resulting parsers from `or`:
const parseGreeting = parseLiteral('hi').or(parseLiteral('yo'))
const parseFarewell = parseLiteral('bye').or(parseLiteral('ciao'))

// passing the results back into `or` to generate another parser:
const parseSalutation = parseGreeting.or(parseFarewell)
```

### Functors

Sometimes we want to transform a value using whatever functions are convenient, but our value is "stuck in a context" (such as an Array or Promise):

```js
const yell = str => str + '!'

yell(['hi', 'sup']) // doesn't work!
yell(Promise.resolve('sup')) // doesn't work!
```

For some contexts, it is possible to define a helper function which applies functions to the value(s) "inside" that context. Arrays and Promises come with such helpers built-in:

```js
['hi', 'sup'].map(yell) // ['hi!', 'sup!']
Promise.resolve('sup').then(yell) // Promise< 'sup!' >
```

Importantly, the context itself is completely unaltered:

- an array of two elements -> an array of two elements
- a possible future value -> a possible future value

Mappable contexts like these are called "functors".*

Parsers can be functors too. We might want to transform the _possible result_ of a parser, while still handling failure or preserving the remainder string. For this, we have a `map` method:

```js
const yell = str => str + '!'

const hi = P.parseLiteral('hi')

hi.parse('hippo') // { result: 'hi', remainder: 'ppo' }
hi.parse('zebra') // null

const hiYell = hi.map(yell)

hiYell.parse('hippo') // { result: 'hi!', remainder: 'ppo' }
hiYell.parse('zebra') // null
```

Again, the context is unaltered; `map` returns a new parser (just like `Array#map` returns a new array, and `Promise#then` returns a new promise).

_*NB – for a context to truly be a functor, its `map` function has to obey [certain laws](https://wiki.haskell.org/Functor#Functor_Laws). Arrays and Parsers are "lawful" functors, but Promises technically are not, because of how `then` unwraps returned promises._

### Monads

Coming soon
