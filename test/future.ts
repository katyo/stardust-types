import { equal, deepEqual } from 'assert';
import { Future, FutureEnd, Async, join_all } from '../future';
import { A, B } from '../either';
import { Ok, Err } from '../result';

describe('future', () => {
    let a: Future<string, Error>;
    let ea: FutureEnd<string, Error>;
    let b: Future<boolean, string>;
    let eb: FutureEnd<boolean, string>;
    let c: Future<number, Error>;
    let ec: FutureEnd<number, Error>;
    let d: Future<boolean, string>;
    let ed: FutureEnd<boolean, string>;

    beforeEach(() => {
        ([ea, a] = Async());
        ([eb, b] = Async());
        ([ec, c] = Async());
        ([ed, d] = Async());
    });

    it('ctor', () => {
        deepEqual([ea, a], Async());
        deepEqual([eb, b], Async());
    });

    it('end ok', () => {
        a.end(res => deepEqual(res, Ok("abc")));
        ea.end(Ok("abc"));
        b.end(res => deepEqual(res, Ok(false)));
        eb.ok(false);
    });

    it('end err', () => {
        a.end(res => deepEqual(res, Err(new Error("Not a string"))));
        ea.err(new Error("abc"));
        b.end(res => deepEqual(res, Err("Not a boolean")));
        eb.end(Err("Not a boolean"));
    });

    it('ok', () => {
        a.ok(item => deepEqual(item, "abc"));
        ea.end(Ok("abc"));
        b.ok(item => equal(item, true));
        eb.ok(true);
    });

    it('err', () => {
        a.err(err => deepEqual(err, new Error("Not a string")));
        ea.err(new Error("Not a string"));
        b.err(err => equal(err, "Not a boolean"));
        eb.end(Err("Not a boolean"));
    });

    it('map', () => {
        a.map(item => `${item}!!!`).end(res => deepEqual(res, Ok("Awesome!!!")));
        ea.ok("Awesome");
    });

    it('map_err', () => {
        a.map_err(err => `${err.message}!!!`).end(res => deepEqual(res, Err("Not a string!!!")));
        ea.err(new Error("Not a string"));
    });

    it('then', () => {
        a.then(res => {
            deepEqual(res, Ok("A string"));
            return b;
        }).end(res => deepEqual(res, Ok(true)));
        ea.ok("A string");
        eb.ok(true);
    });

    it('and 1', () => {
        a.and(c).end(res => deepEqual(res, Err(new Error("Not a string"))));
        ea.err(new Error("Not a string"));
        ec.ok(12);
    });

    it('and 2', () => {
        a.and(c).end(res => deepEqual(res, Err(new Error("Not a number"))));
        ea.ok("A string");
        ec.err(new Error("Not a number"));
    });

    it('and 2', () => {
        a.and(c).end(res => deepEqual(res, Err(new Error("Not a number"))));
        ea.ok("A string");
        ec.err(new Error("Not a number"));
    });

    it('and 3', () => {
        a.and(c).end(res => deepEqual(res, Ok(12)));
        ea.ok("A string");
        ec.ok(12);
    });

    it('or 1', () => {
        b.or(d).end(res => deepEqual(res, Err("Bouncing")));
        eb.err("Unknown");
        ed.err("Bouncing");
    });

    it('or 2', () => {
        b.or(d).end(res => deepEqual(res, Ok(false)));
        eb.ok(false);
        ed.err("Bouncing");
    });

    it('or 3', () => {
        b.or(d).end(res => deepEqual(res, Ok(true)));
        eb.err("Unknown");
        ed.ok(true);
    });

    it('or 4', () => {
        b.or(d).end(res => deepEqual(res, Ok(false)));
        eb.ok(false);
        ed.ok(true);
    });

    it('or 5', () => {
        b.or(d).end(res => deepEqual(res, Ok(true)));
        eb.ok(true);
        ed.ok(false);
    });

    it('and then 1', () => {
        a.and_then(a => {
            deepEqual(a, "A string");
            return c;
        }).end(res => deepEqual(res, Ok(12)));
        ea.ok("A string");
        ec.ok(12);
    });

    it('and then 2', () => {
        a.and_then(a => {
            equal(a, "A string");
            return c;
        }).end(res => deepEqual(res, Err(new Error("Not a string"))));
        ea.err(new Error("Not a string"));
        ec.ok(12);
    });

    it('or_else 1', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(true)));
        eb.ok(true);
        ed.ok(false);
    });

    it('or_else 2', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(false)));
        eb.ok(false);
        ed.ok(true);
    });

    it('or_else 3', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(true)));
        eb.err("Not a value");
        ed.ok(true);
    });

    it('or_else 4', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(false)));
        ed.err("Not a value");
        eb.ok(false);
    });

    it('select 1', () => {
        b.select(d).end(res => deepEqual(res, Ok(false)));
        eb.ok(false);
        ed.err("Not a value");
    });

    it('select 2', () => {
        b.select(d).end(res => deepEqual(res, Err("Not a value")));
        ed.err("Not a value");
        eb.ok(false);
    });

    it('select_either 1', () => {
        a.select_either(b).end(res => deepEqual(res, Ok(A("abc"))));
        ea.ok("abc");
        eb.ok(false);
    });

    it('select_either 2', () => {
        a.select_either(b).end(res => deepEqual(res, Ok(B(true))));
        eb.ok(true);
        ea.ok("abc");
    });

    it('select_either 3', () => {
        a.select_either(b).end(res => deepEqual(res, Err(A(new Error("def")))));
        ea.err(new Error("def"));
        eb.ok(false);
    });

    it('select_either 4', () => {
        a.select_either(b).end(res => deepEqual(res, Err(B("???"))));
        eb.err("???");
        ea.ok("abc");
    });

    it('join 1', () => {
        a.join(c).end(res => deepEqual(res, Ok(["abc", 123])));
        ec.ok(123);
        ea.ok("abc");
    });

    it('join 2', () => {
        a.join(c).end(res => deepEqual(res, Err(new Error("def"))));
        ea.err(new Error("def"));
        ec.ok(123);
    });

    it('join 3', () => {
        a.join(c).end(res => deepEqual(res, Err(new Error("xyz"))));
        ea.ok("def");
        ec.err(new Error("xyz"));
    });

    it('join 4', () => {
        a.join(c).end(res => deepEqual(res, Err(new Error("xyz"))));
        ec.err(new Error("xyz"));
        ea.ok("def");
    });

    it('join_all 1', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Ok(["xyz", "false", "123", "false"])));
        ec.ok(123);
        ea.ok("xyz");
        eb.ok(false);
        ed.ok(true);
    });

    it('join_all 2', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Err(new Error("hmm..."))));
        ec.ok(123);
        ea.ok("xyz");
        eb.err("hmm...");
        ed.ok(true);
    });

    it('join_all 3', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Err(new Error("Something went wrong"))));
        ec.ok(123);
        ea.err(new Error("Something went wrong"));
        eb.err("hmm...");
        ed.ok(true);
    });

    it('join_all 4', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Err(new Error("Not a number"))));
        ec.err(new Error("Not a number"));
        ea.err(new Error("Something went wrong"));
        eb.err("hmm...");
        ed.ok(true);
    });
});
