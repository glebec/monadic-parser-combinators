# Monadic Parser Combinators Demo

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
// some primitive parsers
const [hi, yo, bye, ciao] =
    ['hi', 'yo', 'bye', 'ciao'].map(P.literal)

// some resulting parsers from `or`:
const greeting = hi.or(yo)
const farewell = bye.or(ciao)

// passing the results back into `or` to generate another parser:
const salutation = greeting.or(farewell)
```

### Mapping with Functors

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

const hi = P.literal('hi')

hi.parse('hippo') // { result: 'hi', remainder: 'ppo' }
hi.parse('zebra') // null

const hiYell = hi.map(yell)

hiYell.parse('hippo') // { result: 'hi!', remainder: 'ppo' }
hiYell.parse('zebra') // null
```

Again, the context is unaltered; `map` returns a new parser (just like `Array#map` returns a new array, and `Promise#then` returns a new promise).

_*NB – for a context to truly be a functor, its `map` function has to obey [certain laws](https://wiki.haskell.org/Functor#Functor_Laws). Arrays and Parsers are "lawful" functors, but Promises technically are not, because of how `then` unwraps returned promises._

### Combining Sequences and Branching with Monads

We've seen "or"-style behavior. A hypothetical "and" method would run some first parser A then a follow-up parser B (if A succeeded). The problem is – what to do with both A and B results? An _opinionated_ solution would be to return them both in an array.

```js
const twoDigits = digit.and(digit)
twoDigits.parse('24 hours') // { result: [2, 4], remainder: ' hours' }
```

This is problematic for several reasons:

- continually chaining `and` results in nested arrays, not a flat array.
- we might not want to collect all results, but combine or select them in some custom way.
- this pattern doesn't allow for branching based on the result so far; we cannot decide which parsers to run mid-stream.

All of the above can be solved using another functional pattern: **monads**. A monad is similar to a functor in that you have some context (array, promise, parser) and a value you want to transform. The difference is that in a monad, you will produce _more context_, and you want the contexts to be merged in a sensible way.

Consider mapping an array with a function that _produces arrays_:

```js
// Array String   (String -> Array String)     Array (Array String)
['hi', 'sup']  .map(  str => [str, str]  ) // [['hi', 'hi], ['sup', 'sup']]
```

…We end up with a nested array. That may be what you wanted, but perhaps you would like to `join` or `flatten` the two layers of array into a single layer. Modern JS has an [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) method for just that:

```js
const arrArrStr = ['hi', 'sup'].map(str => [str, str])
const arrStr = arrArrStr.flat() // ['hi', 'hi', 'sup', 'sup']
```

In fact, the combination of `map` producing "extra" context and `flatten` used to fuse layers is so common in functional code, there is a helper function to do both: [`flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap), aka `bind` or `chain`.

```js
['hi', 'sup'].flatMap(str => [str, str]) // ['hi', 'hi', 'sup', 'sup']
```

What about promises?

```js
// Promise Int        Int -> Promise Int            Promise Int
Promise.resolve(5).then(n => Promise.resolve(n)) // Promise< 5 >
```

If `then` behaved exactly like `map`, we would see **nested** promises in the code above – a _promise for (a promise for (an int))_. However, we instead see a single layer of promise structure, just like `flatMap` / `chain`. Indeed, `then` acts like **either** `map` or `chain` depending on what type of value your callback returns. For this reason, promises aren't quite functors OR monads – because the behavior of `then` depends on runtime results. (Had promises been given two separate methods, they would have been proper functors AND monads, but oh well.)

So what is a monad, again? Like a functor, it is a context for values – e.g. multiple values, future values, maybe values, parsed values. Where mapping with a functor could result in nested structure, monads allow _joining_ two layers of structure into a single layer. Nested arrays become a single-level array; nested promises become a single promise wrapper.

So what does the monad instance for parsers look like? Our `chain` method lets you inspect the result so far, and *return a parser*. The outer returned parser from `chain` acts like that returned parser in your function, just like a returned promise from `then` behaves like the returned promise in your function.

```js
const x = promiseA.then(a => promiseB) // x equivalent to promiseB
const y = parserA.chain(a => parserB)  // y equivalent to parserB
```

This allows for sequencing parsers, choosing how to combine sequential results, and branching based on in-progress results. Or at least, it will with one more addition: a way to hard-code a parser to return whatever result we want.

```js
const pX = Promise.resolve('x')
pX.then(console.log) // logged: x

const pY = Parser.of('y')
pY.parse('1234') // { result: 'y', remainder: '1234' }
```

The `of` function, aka `pure`, `inject`, or (unfortunately) `return`, takes a value and puts it _into_ the context. This will mesh well with `chain`.

### Chaining Examples

Assuming the following primitive parsers:

```js
const [Go, Look, Up, Down] =
    ['Go', 'Look', 'Up', 'Down'].map(P.literal)
```

Sequence two parsers, keep the second result:

```js
const move = Go.chain(_ => Up.or(Down))

move.parse('LookDown') // null
move.parse('GoUp!')    // { result: 'Up', remainder: '!' }
move.parse('GoDown.')  // { result: 'Down', remainder: '.' }
```

Sequence two parsers, keep the first result:

```js
const skyward =
    Go.or(Look)
    .chain(act =>
        Up.chain(_ => P.of(act))) // nest chain to keep `act` in scope

skyward.parse('LookDown') // null
skyward.parse('LookUp')   // { result: 'Look', remainder: '' }
skyward.parse('GoUp?')    // { result: 'Go', remainder: '?' }
```

Sequence two parsers, combine results with ampersand:

```js
const doubleDirection =
    Up.or(Down)
    .chain(d1 =>
        Up.or(Down)
        .chain(d2 =>
            P.of(d1 + '&' + d2)))

doubleDirection.parse('Upwards')    // null
doubleDirection.parse('UpUp')       // { result: 'Up&Up', remainder: '' }
doubleDirection.parse('DownUpDown') // { result: 'Down&Up', remainder: 'Down' }
```

Use previous parsers to dynamically decide next parser(s), while applying transformations:

```js
const flyThenLand =
    Up.or(Down) // must match one, else stop the chain
    .chain(d => (d === 'Up') // which one matched?
        ? flyThenLand.map(h => 1 + h) // continue the chain
        : P.of(0)) // end the chain successfully

flyThenLand.parse('Down.') // { result: 0, remainder: '.' }
flyThenLand.parse('UpDownYeah') // { result: 1, remainder: 'Yeah' }
flyThenLand.parse('UpUpUpUpDown!') // { result: 4, remainder: '!' }
flyThenLand.parse('UpUpUpUpUpUpUpUp…') // null
```

In this repo, we include some common helper methods which internally use `chain`.

- `many0` (match 0 or more occurrences, result in a list)
- `many1` (match 1 or more occurrences, result in a list)
- `useRight` (match both parsers, only save right result)
- `useLeft` (match both parsers, only save left result)

Judicious use of these convenience functions, `chain`, and `map` make it relatively easy to express complex parsing logic.
