import { equal, deepEqual } from 'assert';
import { Future, Task, channel, join_all, never, ok as f_ok, err as f_err } from '../future';
import { A, B } from '../either';
import { Ok, Err } from '../result';

describe('future', () => {
    let a: Future<string, Error>;
    let ea: Task<string, Error>;
    let b: Future<boolean, string>;
    let eb: Task<boolean, string>;
    let c: Future<number, Error>;
    let ec: Task<number, Error>;
    let d: Future<boolean, string>;
    let ed: Task<boolean, string>;

    beforeEach(() => {
        ([ea, a] = channel());
        ([eb, b] = channel());
        ([ec, c] = channel());
        ([ed, d] = channel());
    });

    it('never', (done) => {
        never().end(res => {
            done(new Error("unexpected end"));
        }).start();
        setTimeout(() => {
            done();
        }, 100);
    });

    it('ok', () => {
        f_ok(123).end(res => {
            deepEqual(res, Ok(123));
        }).start();
    });

    it('err', () => {
        f_err("invalid value").end(res => {
            deepEqual(res, Err("invalid value"));
        }).start();
    });

    it('ctor', () => {
        deepEqual([ea, a], channel());
        deepEqual([eb, b], channel());
    });

    it('end ok', () => {
        a.end(res => deepEqual(res, Ok("abc"))).start();
        ea.end(Ok("abc"));
        b.end(res => deepEqual(res, Ok(false))).start();
        eb.end(Ok(false));
    });

    it('end err', () => {
        a.end(res => deepEqual(res, Err(new Error("Not a string")))).start();
        ea.end(Err(new Error("abc")));
        b.end(res => deepEqual(res, Err("Not a boolean"))).start();
        eb.end(Err("Not a boolean"));
    });

    it('map', () => {
        a.map(item => `${item}!!!`).end(res => deepEqual(res, Ok("Awesome!!!")));
        ea.end(Ok("Awesome"));
    });

    it('map_err', () => {
        a.map_err(err => `${err.message}!!!`).end(res => deepEqual(res, Err("Not a string!!!"))).start();
        ea.end(Err(new Error("Not a string")));
    });

    it('then', () => {
        a.then(res => {
            deepEqual(res, Ok("A string"));
            return b;
        }).end(res => deepEqual(res, Ok(true))).start();
        ea.end(Ok("A string"));
        eb.end(Ok(true));
    });

    it('and 1', () => {
        a.and(c).end(res => deepEqual(res, Err(new Error("Not a string")))).start();
        ea.end(Err(new Error("Not a string")));
        ec.end(Ok(12));
    });

    it('and 2', () => {
        a.and(c).end(res => deepEqual(res, Err(new Error("Not a number")))).start();
        ea.end(Ok("A string"));
        ec.end(Err(new Error("Not a number")));
    });

    it('and 2', () => {
        a.and(c).end(res => deepEqual(res, Err(new Error("Not a number")))).start();
        ea.end(Ok("A string"));
        ec.end(Err(new Error("Not a number")));
    });

    it('and 3', () => {
        a.and(c).end(res => deepEqual(res, Ok(12))).start();
        ea.end(Ok("A string"));
        ec.end(Ok(12));
    });

    it('or 1', () => {
        b.or(d).end(res => deepEqual(res, Err("Bouncing"))).start();
        eb.end(Err("Unknown"));
        ed.end(Err("Bouncing"));
    });

    it('or 2', () => {
        b.or(d).end(res => deepEqual(res, Ok(false))).start();
        eb.end(Ok(false));
        ed.end(Err("Bouncing"));
    });

    it('or 3', () => {
        b.or(d).end(res => deepEqual(res, Ok(true))).start();
        eb.end(Err("Unknown"));
        ed.end(Ok(true));
    });

    it('or 4', () => {
        b.or(d).end(res => deepEqual(res, Ok(false))).start();
        eb.end(Ok(false));
        ed.end(Ok(true));
    });

    it('or 5', () => {
        b.or(d).end(res => deepEqual(res, Ok(true))).start();
        eb.end(Ok(true));
        ed.end(Ok(false));
    });

    it('and then 1', () => {
        a.and_then(a => {
            deepEqual(a, "A string");
            return c;
        }).end(res => deepEqual(res, Ok(12))).start();
        ea.end(Ok("A string"));
        ec.end(Ok(12));
    });

    it('and then 2', () => {
        a.and_then(a => {
            equal(a, "A string");
            return c;
        }).end(res => deepEqual(res, Err(new Error("Not a string")))).start();
        ea.end(Err(new Error("Not a string")));
        ec.end(Ok(12));
    });

    it('or_else 1', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(true))).start();
        eb.end(Ok(true));
        ed.end(Ok(false));
    });

    it('or_else 2', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(false))).start();
        eb.end(Ok(false));
        ed.end(Ok(true));
    });

    it('or_else 3', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(true))).start();
        eb.end(Err("Not a value"));
        ed.end(Ok(true));
    });

    it('or_else 4', () => {
        b.or_else((err) => {
            deepEqual(err, "Not a value");
            return d;
        }).end(res => deepEqual(res, Ok(false))).start();
        ed.end(Err("Not a value"));
        eb.end(Ok(false));
    });

    it('select 1', () => {
        b.select(d).end(res => deepEqual(res, Ok(false))).start();
        eb.end(Ok(false));
        ed.end(Err("Not a value"));
    });

    it('select 2', () => {
        b.select(d).end(res => deepEqual(res, Err("Not a value"))).start();
        ed.end(Err("Not a value"));
        eb.end(Ok(false));
    });

    it('select_either 1', () => {
        a.select_either(b).end(res => deepEqual(res, Ok(A("abc")))).start();
        ea.end(Ok("abc"));
        eb.end(Ok(false));
    });

    it('select_either 2', () => {
        a.select_either(b).end(res => deepEqual(res, Ok(B(true)))).start();
        eb.end(Ok(true));
        ea.end(Ok("abc"));
    });

    it('select_either 3', () => {
        a.select_either(b).end(res => deepEqual(res, Err(A(new Error("def"))))).start();
        ea.end(Err(new Error("def")));
        eb.end(Ok(false));
    });

    it('select_either 4', () => {
        a.select_either(b).end(res => deepEqual(res, Err(B("???")))).start();
        eb.end(Err("???"));
        ea.end(Ok("abc"));
    });

    it('join 1', () => {
        a.join(c).end(res => deepEqual(res, Ok(["abc", 123]))).start();
        ec.end(Ok(123));
        ea.end(Ok("abc"));
    });

    it('join 2', () => {
        a.join(c).end(res => deepEqual(res, Err(new Error("def")))).start();
        ea.end(Err(new Error("def")));
        ec.end(Ok(123));
    });

    it('join 3', () => {
        a.join(c).end(res => deepEqual(res, Err(new Error("xyz")))).start();
        ea.end(Ok("def"));
        ec.end(Err(new Error("xyz")));
    });

    it('join 4', () => {
        a.join(c).end(res => deepEqual(res, Err(new Error("xyz")))).start();
        ec.end(Err(new Error("xyz")));
        ea.end(Ok("def"));
    });

    it('join_all 1', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Ok(["xyz", "false", "123", "false"]))).start();
        ec.end(Ok(123));
        ea.end(Ok("xyz"));
        eb.end(Ok(false));
        ed.end(Ok(true));
    });

    it('join_all 2', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Err(new Error("hmm...")))).start();
        ec.end(Ok(123));
        ea.end(Ok("xyz"));
        eb.end(Err("hmm..."));
        ed.end(Ok(true));
    });

    it('join_all 3', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Err(new Error("Something went wrong")))).start();
        ec.end(Ok(123));
        ea.end(Err(new Error("Something went wrong")));
        eb.end(Err("hmm..."));
        ed.end(Ok(true));
    });

    it('join_all 4', () => {
        join_all([
            a,
            b.map(a => `${a}`).map_err(e => new Error(e)),
            c.map(a => `${a}`),
            d.map(a => `${!a}`).map_err(e => new Error(e)),
        ]).end(res => deepEqual(res, Err(new Error("Not a number")))).start();
        ec.end(Err(new Error("Not a number")));
        ea.end(Err(new Error("Something went wrong")));
        eb.end(Err("hmm..."));
        ed.end(Ok(true));
    });
});
