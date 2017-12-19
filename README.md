# Rust-style monad types for TypeScript [![Build Status](https://travis-ci.org/katyo/stardust-types.svg?branch=master)](https://travis-ci.org/katyo/stardust-types)

## Implemented types

### Option<Item>

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

```typescript
import { Result, Ok, Err } from 'stardust-types/result';

// TODO
```

See also: [test/result.ts](test/result.ts)

### Either<ItemA, ItemB>

```typescript
import { Either, A, B } from 'stardust-types/either';

// TODO
```

See also: [test/either.ts](test/either.ts)

### Future<Item, Error>

```typescript
import { Future, Async } from 'stardust-types/future';

const [end, future] = Async<number, string>();

let timer;
end.start(() => {
    timer = setTimeout(() => {
        end.ok(123);
        // end.err("Something went wrong");
    }, 1000);
}).abort(() => {
    clearTimeout(timer);
});

future
    .map(a => a * a)
    .map_err(e => new Error(e))
    .ok(a => { console.log(`The number is: ${a}`); })
    .err(e => { throw e; })
    .start();

// prints '123' if not aborted within 1 sec
// setTimeout(() => { future.abort(); }, 500);
```

See also: [test/future.ts](test/future.ts)

### Stream<Item, Error> _(TODO)_

```typescript
import { Stream, StreamSink, Channel } from 'stardust-types/stream';

// TODO
```

## Implemented functions

### timeout(msec: number): Future<undefined, undefined>

```typescript
import { timeout } from 'stardust-types/timer';

const future = timeout(1000)
    .map(() => "Hello")
    .map((phrase) => `${phrase}!!!`)
    .ok((text) => { console.log(text); })
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
