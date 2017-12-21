import { equal, deepEqual, strictEqual, fail } from 'assert';
import { Future, Task, oneshot, select_all, select_ok, join_all, never, ok, err, Continue, Break, loop_fn } from '../src/future';
import { A, B } from '../src/either';
import { Ok, Err } from '../src/result';

interface FakeError {
    code: number;
    message: string;
}

function newError(message: string, code: number = 0): FakeError {
    return { code, message };
}

describe('future', () => {
    let a: Future<string, FakeError>;
    let ea: Task<string, FakeError>;
    let b: Future<boolean, string>;
    let eb: Task<boolean, string>;
    let c: Future<number, FakeError>;
    let ec: Task<number, FakeError>;
    let d: Future<boolean, string>;
    let ed: Task<boolean, string>;

    beforeEach(() => {
        ([ea, a] = oneshot());
        ([eb, b] = oneshot());
        ([ec, c] = oneshot());
        ([ed, d] = oneshot());
    });

    it('never', (done) => {
        never().end(res => {
            done(newError("unexpected end"));
        }).start();
        setTimeout(() => {
            done();
        }, 100);
    });

    it('ok', (done) => {
        ok(123).end(res => {
            deepEqual(res, Ok(123));
            done();
        }).start();
    });

    it('err', (done) => {
        err("invalid value").end(res => {
            deepEqual(res, Err("invalid value"));
            done();
        }).start();
    });

    it('ctor', () => {
        deepEqual([ea, a], oneshot());
        deepEqual([eb, b], oneshot());
    });

    it('end ok', (done) => {
        a.end(res => {
            deepEqual(res, Ok("abc"));
            b.end(res => {
                deepEqual(res, Ok(false));
                done();
            });
            b.start();
            eb.end(Ok(false));
        }).start();
        ea.end(Ok("abc"));
    });

    it('end err', (done) => {
        a.end(res => {
            deepEqual(res, Err(newError("Not a string")));
            b.end(res => {
                deepEqual(res, Err("Not a boolean"));
                done();
            }).start();
            eb.end(Err("Not a boolean"));
        }).start();
        ea.end(Err(newError("Not a string")));
    });

    it('map', (done) => {
        a.map(item => `${item}!!!`).end(res => {
            deepEqual(res, Ok("Awesome!!!"));
            done();
        });
        ea.end(Ok("Awesome"));
    });

    it('map_err', (done) => {
        a.map_err(err => `${err.message}!!!`).end(res => {
            deepEqual(res, Err("Not a string!!!"));
            done();
        }).start();
        ea.end(Err(newError("Not a string")));
    });

    it('then', (done) => {
        a.then(res => {
            deepEqual(res, Ok("A string"));
            return b;
        }).end(res => {
            deepEqual(res, Ok(true));
            done();
        }).start();
        ea.end(Ok("A string"));
        eb.end(Ok(true));
    });

    describe('and', () => {
        it('case 1', (done) => {
            a.and(c).end(res => {
                deepEqual(res, Err(newError("Not a string")));
                done();
            }).start();
            ea.end(Err(newError("Not a string")));
            ec.end(Ok(12));
        });
        
        it('case 2', (done) => {
            a.and(c).end(res => {
                deepEqual(res, Err(newError("Not a number")));
                done();
            }).start();
            ea.end(Ok("A string"));
            ec.end(Err(newError("Not a number")));
        });
        
        it('case 3', (done) => {
            a.and(c).end(res => {
                deepEqual(res, Err(newError("Not a number")));
                done();
            }).start();
            ea.end(Ok("A string"));
            ec.end(Err(newError("Not a number")));
        });
        
        it('case 4', (done) => {
            a.and(c).end(res => {
                deepEqual(res, Ok(12));
                done();
            }).start();
            ea.end(Ok("A string"));
            ec.end(Ok(12));
        });
    });

    describe('or', () => {
        it('case 1', (done) => {
            b.or(d).end(res => {
                deepEqual(res, Err("Bouncing"));
                done();
            }).start();
            eb.end(Err("Unknown"));
            ed.end(Err("Bouncing"));
        });
        
        it('case 2', (done) => {
            b.or(d).end(res => {
                deepEqual(res, Ok(false));
                done();
            }).start();
            eb.end(Ok(false));
            ed.end(Err("Bouncing"));
        });

        it('case 3', (done) => {
            b.or(d).end(res => {
                deepEqual(res, Ok(true));
                done();
            }).start();
            eb.end(Err("Unknown"));
            ed.end(Ok(true));
        });
        
        it('case 4', (done) => {
            b.or(d).end(res => {
                deepEqual(res, Ok(false));
                done();
            }).start();
            eb.end(Ok(false));
            ed.end(Ok(true));
        });
        
        it('case 5', (done) => {
            b.or(d).end(res => {
                deepEqual(res, Ok(true));
                done();
            }).start();
            eb.end(Ok(true));
            ed.end(Ok(false));
        });
    });
    
    describe('and_then', () => {
        it('case 1', (done) => {
            a.and_then(a => {
                deepEqual(a, "A string");
                return c;
            }).end(res => {
                deepEqual(res, Ok(12));
                done();
            }).start();
            ea.end(Ok("A string"));
            ec.end(Ok(12));
        });
        
        it('case 2', (done) => {
            a.and_then(a => {
                equal(a, "A string");
                return c;
            }).end(res => {
                deepEqual(res, Err(newError("Not a string")));
                done();
            }).start();
            ea.end(Err(newError("Not a string")));
            ec.end(Ok(12));
        });
    });

    describe('or_else', () => {
        it('case 1', (done) => {
            b.or_else((err) => {
                deepEqual(err, "Not a value");
                return d;
            }).end(res => {
                deepEqual(res, Ok(true));
                done();
            }).start();
            eb.end(Ok(true));
            ed.end(Ok(false));
        });
        
        it('case 2', (done) => {
            b.or_else((err) => {
                deepEqual(err, "Not a value");
                return d;
            }).end(res => {
                deepEqual(res, Ok(false));
                done();
            }).start();
            eb.end(Ok(false));
            ed.end(Ok(true));
        });
        
        it('case 3', (done) => {
            b.or_else((err) => {
                deepEqual(err, "Not a value");
                return d;
            }).end(res => {
                deepEqual(res, Ok(true));
                done();
            }).start();
            eb.end(Err("Not a value"));
            ed.end(Ok(true));
        });
        
        it('case 4', (done) => {
            b.or_else((err) => {
                deepEqual(err, "Not a value");
                return d;
            }).end(res => {
                deepEqual(res, Ok(false));
                done();
            }).start();
            ed.end(Err("Not a value"));
            eb.end(Ok(false));
        });
    });

    describe('select', () => {
        it('case 1', (done) => {
            b.select(d).end(res => {
                deepEqual(res, Ok(false));
                done();
            }).start();
            eb.end(Ok(false));
            ed.end(Err("Not a value"));
        });
        
        it('case 2', (done) => {
            b.select(d).end(res => {
                deepEqual(res, Err("Not a value"));
                done();
            }).start();
            ed.end(Err("Not a value"));
            eb.end(Ok(false));
        });
    });

    describe('select_either', () => {
        it('case 1', (done) => {
            a.select_either(b).end(res => {
                deepEqual(res, Ok(A("abc")));
                done();
            }).start();
            ea.end(Ok("abc"));
            eb.end(Ok(false));
        });
        
        it('case 2', (done) => {
            a.select_either(b).end(res => {
                deepEqual(res, Ok(B(true)));
                done();
            }).start();
            eb.end(Ok(true));
            ea.end(Ok("abc"));
        });
        
        it('case 3', (done) => {
            a.select_either(b).end(res => {
                deepEqual(res, Err(A(newError("def"))));
                done();
            }).start();
            ea.end(Err(newError("def")));
            eb.end(Ok(false));
        });
        
        it('case 4', (done) => {
            a.select_either(b).end(res => {
                deepEqual(res, Err(B("???")));
                done();
            }).start();
            eb.end(Err("???"));
            ea.end(Ok("abc"));
        });
    });

    describe('select_all', () => {
        it('case 1', (done) => {
            const a_ = a.map(s => !!s).map_err(e => e.message);
            select_all([a_, b, d]).end(res => {
                const [val, i, futures] = res.unwrap();
                strictEqual(val, true);
                equal(i, 1);
                equal(futures.length, 2);
                strictEqual(futures[0], a_);
                strictEqual(futures[1], d);
                done();
            }).start();
            eb.end(Ok(true));
            ed.end(Err("Not a value"));
        });
        
        it('case 2', (done) => {
            const a_ = a.map(s => !!s).map_err(e => e.message);
            select_all([a_, b, d]).end(res => {
                const [err, i, futures] = res.unwrap_err();
                strictEqual(err, "Not a value");
                equal(i, 2);
                equal(futures.length, 2);
                strictEqual(futures[0], a_);
                strictEqual(futures[1], b);
                done();
            }).start();
            ed.end(Err("Not a value"));
            eb.end(Ok(false));
        });

        it('case 3', (done) => {
            const a_ = a.map(s => !!s).map_err(e => e.message);
            select_all([a_, b, d]).end(res => {
                const [val, i, futures] = res.unwrap();
                strictEqual(val, false);
                equal(i, 0);
                equal(futures.length, 2);
                strictEqual(futures[0], b);
                strictEqual(futures[1], d);
                done();
            }).start();
            ea.end(Ok(""));
            ed.end(Err("Not a value"));
            eb.end(Ok(false));
        });
    });

    describe('select_ok', () => {
        it('case 1', (done) => {
            const a_ = a.map(s => !!s).map_err(e => e.message);
            select_ok([a_, b, d]).end(res => {
                const [val, futures] = res.unwrap();
                strictEqual(val, false);
                equal(futures.length, 2);
                strictEqual(futures[0], a_);
                strictEqual(futures[1], d);
                done();
            }).start();
            eb.end(Ok(false));
            ed.end(Err("Not a value"));
        });
        
        it('case 2', (done) => {
            const a_  = a.map(s => !!s).map_err(e => e.message);
            select_ok([a_, b, d]).end(res => {
                const [val, futures] = res.unwrap();
                strictEqual(val, true);
                equal(futures.length, 1);
                strictEqual(futures[0], a_);
                done();
            }).start();
            ed.end(Err("Not a value"));
            eb.end(Ok(true));
        });

        it('case 3', (done) => {
            const a_ = a.map(s => !!s).map_err(e => e.message);
            select_ok([a_, b, d]).end(res => {
                deepEqual(res, Err("Invalid"));
                done();
            }).start();
            ea.end(Err(newError("Unexpected")));
            ed.end(Err("Not a value"));
            eb.end(Err("Invalid"));
        });
    });

    describe('join', () => {
        it('case 1', (done) => {
            a.join(c).end(res => {
                deepEqual(res, Ok(["abc", 123]));
                done();
            }).start();
            ec.end(Ok(123));
            ea.end(Ok("abc"));
        });
        
        it('case 2', (done) => {
            a.join(c).end(res => {
                deepEqual(res, Err(newError("def")));
                done();
            }).start();
            ea.end(Err(newError("def")));
            ec.end(Ok(123));
        });
        
        it('case 3', (done) => {
            a.join(c).end(res => {
                deepEqual(res, Err(newError("xyz")));
                done();
            }).start();
            ea.end(Ok("def"));
            ec.end(Err(newError("xyz")));
        });
        
        it('case 4', (done) => {
            a.join(c).end(res => {
                deepEqual(res, Err(newError("xyz")));
                done();
            }).start();
            ec.end(Err(newError("xyz")));
            ea.end(Ok("def"));
        });
    });

    describe('join_all', () => {
        it('case 1', (done) => {
            join_all([
                a,
                b.map(a => `${a}`).map_err(e => newError(e)),
                c.map(a => `${a}`),
                d.map(a => `${!a}`).map_err(e => newError(e)),
            ]).end(res => {
                deepEqual(res, Ok(["xyz", "false", "123", "false"]));
                done();
            }).start();
            ec.end(Ok(123));
            ea.end(Ok("xyz"));
            eb.end(Ok(false));
            ed.end(Ok(true));
        });

        it('case 2', (done) => {
            join_all([
                a,
                b.map(a => `${a}`).map_err(e => newError(e)),
                c.map(a => `${a}`),
                d.map(a => `${!a}`).map_err(e => newError(e)),
            ]).end(res => {
                deepEqual(res, Err(newError("hmm...")));
                done();
            }).start();
            ec.end(Ok(123));
            ea.end(Ok("xyz"));
            eb.end(Err("hmm..."));
            ed.end(Ok(true));
        });
        
        it('case 3', (done) => {
            join_all([
                a,
                b.map(a => `${a}`).map_err(e => newError(e)),
                c.map(a => `${a}`),
                d.map(a => `${!a}`).map_err(e => newError(e)),
            ]).end(res => {
                deepEqual(res, Err(newError("Something went wrong")));
                done();
            }).start();
            ec.end(Ok(123));
            ea.end(Err(newError("Something went wrong")));
            eb.end(Err("hmm..."));
            ed.end(Ok(true));
        });
        
        it('case 4', (done) => {
            join_all([
                a,
                b.map(a => `${a}`).map_err(e => newError(e)),
                c.map(a => `${a}`),
                d.map(a => `${!a}`).map_err(e => newError(e)),
            ]).end(res => {
                deepEqual(res, Err(newError("Not a number")));
                done();
            }).start();
            ec.end(Err(newError("Not a number")));
            ea.end(Err(newError("Something went wrong")));
            eb.end(Err("hmm..."));
            ed.end(Ok(true));
        });
    });

    describe('loop', () => {
        it('no iterations', () => {
            loop_fn({ cnt: 0 }, ({ cnt }) =>
                    ok(cnt == 0 ? Break("end") : Continue({ cnt: cnt + 1 })))
                .end(res => { deepEqual(res, Ok("end")); }).start();
        });
        
        it('one iteration', () => {
            loop_fn({ cnt: 0 }, ({ cnt }) =>
                    ok(cnt == 1 ? Break("end") : Continue({ cnt: cnt + 1 })))
                .end(res => { deepEqual(res, Ok("end")); }).start();
        });
        
        it('5 iterations', () => {
            loop_fn({ cnt: 0 }, ({ cnt }) =>
                    ok(cnt == 5 ? Break("end") : Continue({ cnt: cnt + 1 })))
                .end(res => { deepEqual(res, Ok("end")); }).start();
        });
        
        it('99 iterations', () => {
            loop_fn({ cnt: 0 }, ({ cnt }) =>
                    ok(cnt == 99 ? Break(cnt) : Continue({ cnt: cnt + 1 })))
                .end(res => { deepEqual(res, Ok(99)); }).start();
        });
        
        it('infinite loop', (done) => {
            let loop = loop_fn(undefined, () => ok(Continue(undefined)))
                .end(res => { fail("Break"); })
            setTimeout(() => {
                loop.abort();
                done();
            }, 100);
            loop.start();
        });
    });
});
