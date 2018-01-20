# Rust-style monad types for TypeScript [![Build Status](https://travis-ci.org/katyo/stardust-types.svg?branch=master)](https://travis-ci.org/katyo/stardust-types)

## Implemented types

### Option\<Item>

The option can hold some value or none. This type is preferred to use instead of special values like `null` or `undefined`.

```typescript
import { Option, Some, None } from 'stardust-types/option';

function square_odd(opt: Option<number>): Option<string> {
    return opt
        .and_then(a => a % 2 ? Some([a, a * a]) : None())
        .map(([a, s] => `The square of odd number ${a} is ${s}`)
        .unwrap_or("Please give me odd numbers");
}

console.log(square_odd(None)); // Please give me odd numbers
console.log(square_odd(Some(1))); // The square of odd number 1 is 1
console.log(square_odd(Some(2))); // Please give me odd numbers
console.log(square_odd(Some(3))); // The square of odd number 3 is 9
```

See also: [test/option.ts](test/option.ts)

### Result<Item, Error>

The result can hold resulting value or error. This type helpful to return from functions or asynchronous operations which may be failed. This type is preferred than throwing errors or using nullable error-result arguments in NodeJS style callbacks or using different callbacks in Promise-style.

```typescript
import { Result, Ok, Err } from 'stardust-types/result';

// TODO
```

See also: [test/result.ts](test/result.ts)

### Either<ItemA, ItemB>

The either type is similar to result but preffered for another usecases.

```typescript
import { Either, A, B } from 'stardust-types/either';

// TODO
```

See also: [test/either.ts](test/either.ts)

### Future<Item, Error>

The future type is intended for representing results which cannot be given at same moment when it requested.

```typescript
import { Task, Future, oneshot } from 'stardust-types/future';

const [task, future] = oneshot<number, string>();

let timer;
task.start(() => {
    timer = setTimeout(() => {
        task.done(123);
        // end.fail("Something went wrong");
    }, 1000);
}).abort(() => {
    clearTimeout(timer);
});

future
    .map(a => a * a)
    .map_err(e => new Error(e))
    .end(res => {
        res.map_or_else(
            err => { throw err; },
            val => {
                console.log(`The number is: ${val}`);
            }
        );
    })
    .start();

// prints '123' if not aborted within 1 sec
// setTimeout(() => { future.abort(); }, 500);
```

See also: [test/future.ts](test/future.ts)

### Stream<Item, Error> _(TODO)_

```typescript
import { Sink, Stream, channel } from 'stardust-types/stream';

// TODO
```

## Implemented functions

### timeout(msec: number): Future<undefined, undefined>

```typescript
import { timeout } from 'stardust-types/timer';

const future = timeout(1000, Ok("Hello"))
    .map(phrase => `${phrase}!!!`)
    .end(res => { console.log(res.unwrap()); })
    .start();
// prints 'Hello!!!' if not aborted within 1 sec
// setTimeout(() => { future.abort(); }, 500);
```

See also: [test/timer.ts](test/timer.ts)

### interval(msec: number): Stream<undefined, undefined> _(TODO)_

```typescript
import { interval } from 'stardust-types/timer';

interval(1000)
    .map(() => 
```

### request(Request): Future<Response, ResponseError> _(TODO)_

```typescript
import { request } from 'stardust-types/request';

// TODO
```
