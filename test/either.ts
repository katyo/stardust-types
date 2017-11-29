import { equal, deepEqual, throws } from 'assert';
import { Either, A, B } from '../either';
import { Some, None } from '../option';
import { Ok, Err } from '../result';

describe('either', () => {
    let a: Either<number, string>;
    let b: Either<number, string>;

    beforeEach(() => {
        a = A(123);
        b = B("Not a number");
    });

    it('ctor', () => {
        deepEqual(a, A(123));
        deepEqual(b, B("Not a number"));
    });

    it('is_a', () => {
        equal(a.is_a, true);
        equal(b.is_a, false);
    });

    it('is_b', () => {
        equal(a.is_b, false);
        equal(b.is_b, true);
    });

    it('a', () => {
        deepEqual(a.a(), Some(123));
        deepEqual(b.a(), None());
    });

    it('a_or', () => {
        deepEqual(a.a_or("Something else"), Ok(123));
        deepEqual(b.a_or("Something else"), Err("Something else"));
    });

    it('a_or_else', () => {
        deepEqual(a.a_or_else(a => `Something else: ${a}`), Ok(123));
        deepEqual(b.a_or_else(a => `Something else: ${a}`), Err("Something else: Not a number"));
    });

    it('b', () => {
        deepEqual(a.b(), None());
        deepEqual(b.b(), Some("Not a number"));
    });

    it('b_or', () => {
        deepEqual(a.b_or("Something else"), Err("Something else"));
        deepEqual(b.b_or("Something else"), Ok("Not a number"));
    });

    it('b_or_else', () => {
        deepEqual(a.b_or_else(a => `Something else: ${a}`), Err("Something else: 123"));
        deepEqual(b.b_or_else(a => `Something else: ${a}`), Ok("Not a number"));
    });

    it('map_a', () => {
        deepEqual(a.map_a(a => a + 1), A(124));
        deepEqual(b.map_a(a => a + 1), B("Not a number"));
    });

    it('map_a_or', () => {
        deepEqual(a.map_a_or(456, a => a - 1), 122);
        deepEqual(b.map_a_or(456, a => a - 1), 456);
    });

    it('map_a_or_else', () => {
        deepEqual(a.map_a_or_else(err => err, a => "A number"), "A number");
        deepEqual(b.map_a_or_else(err => err, a => "A number"), "Not a number");
    });

    it('map_b', () => {
        deepEqual(a.map_b(r => `${r}!!!`), A(123));
        deepEqual(b.map_b(r => `${r}!!!`), B("Not a number!!!"));
    });

    it('map_b_or', () => {
        deepEqual(a.map_b_or(456, r => r.length), 456);
        deepEqual(b.map_b_or(456, r => r.length), 12);
    });

    it('map_b_or_else', () => {
        deepEqual(a.map_b_or_else(a => a + 1, r => r.length), 124);
        deepEqual(b.map_b_or_else(a => a + 1, r => r.length), 12);
    });

    it('unwrap_a', () => {
        deepEqual(a.unwrap_a(), 123);
        throws(b.unwrap_a);
    });

    it('unwrap_a_or', () => {
        deepEqual(a.unwrap_a_or(456), 123);
        deepEqual(b.unwrap_a_or(456), 456);
    });

    it('unwrap_a_or_else', () => {
        deepEqual(a.unwrap_a_or_else(() => 456), 123);
        deepEqual(b.unwrap_a_or_else(() => 456), 456);
    });

    it('unwrap_b', () => {
        throws(a.unwrap_b);
        deepEqual(b.unwrap_b(), "Not a number");
    });

    it('unwrap_b_or', () => {
        deepEqual(a.unwrap_b_or("A number"), "A number");
        deepEqual(b.unwrap_b_or("A number"), "Not a number");
    });

    it('unwrap_b_or_else', () => {
        deepEqual(a.unwrap_b_or_else(a => `a=${a}`), "a=123");
        deepEqual(b.unwrap_b_or_else(a => `a=${a}`), "Not a number");
    });
});
