import { equal, deepEqual, throws } from 'assert';
import { Some, None } from '../src/option';
import { Result, Ok, Err } from '../src/result';

interface FakeError {
    code: number;
    message: string;
}

function newError(message: string, code: number = 0): FakeError {
    return { code, message };
}

describe('result', () => {
    let ok: Result<number, string>;
    let err: Result<number, string>;

    beforeEach(() => {
        ok = Ok(123);
        err = Err("Not a number");
    });

    it('ctor', () => {
        deepEqual(ok, Ok(123));
        deepEqual(err, Err("Not a number"));
    });

    it('is_ok', () => {
        equal(ok.is_ok, true);
        equal(err.is_ok, false);
    });

    it('is_err', () => {
        equal(ok.is_err, false);
        equal(err.is_err, true);
    });

    it('ok', () => {
        deepEqual(ok.ok(), Some(123));
        deepEqual(err.ok(), None());
    });

    it('err', () => {
        deepEqual(ok.err(), None());
        deepEqual(err.err(), Some("Not a number"));
    });

    it('map', () => {
        deepEqual(ok.map(a => a + 1), Ok(124));
        deepEqual(err.map(a => a + 1), Err("Not a number"));
    });

    it('map_or', () => {
        deepEqual(ok.map_or(456, a => a - 1), 122);
        deepEqual(err.map_or(456, a => a - 1), 456);
    });

    it('map_or_else', () => {
        deepEqual(ok.map_or_else(err => err, a => "A number"), "A number");
        deepEqual(err.map_or_else(err => err, a => "A number"), "Not a number");
    });

    it('map_err', () => {
        deepEqual(ok.map_err(err => newError(err)), Ok(123));
        deepEqual(err.map_err(err => newError(err)), Err(newError("Not a number")));
    });

    it('map_err_or', () => {
        deepEqual(ok.map_err_or(newError("A number"), err => newError(err)), newError("A number"));
        deepEqual(err.map_err_or(newError("Something else"), err => newError(err)), newError("Not a number"));
    });

    it('map_err_or_else', () => {
        deepEqual(ok.map_err_or_else(a => "A number", err => err), "A number");
        deepEqual(err.map_err_or_else(a => "A number", err => err), "Not a number");
    });

    it('and', () => {
        deepEqual(ok.and(Ok("A number")), Ok("A number"));
        deepEqual(ok.and(Err("Something else")), Err("Something else"));
        deepEqual(err.and(Ok("A number")), Err("Not a number"));
        deepEqual(err.and(Err("Something else")), Err("Not a number"));
    });

    it('and_then', () => {
        deepEqual(ok.and_then(a => Ok(`${a}?`)), Ok("123?"));
        deepEqual(ok.and_then(a => Err("Something else")), Err("Something else"));
        deepEqual(err.and_then(a => Ok(`${a}?`)), Err("Not a number"));
        deepEqual(err.and_then(a => Err("Something else")), Err("Not a number"));
    });

    it('or', () => {
        deepEqual(ok.or(Ok(456)), Ok(123));
        deepEqual(ok.or(Err("Something else")), Ok(123));
        deepEqual(err.or(Ok(456)), Ok(456));
        deepEqual(err.or(Err("Something else")), Err("Something else"));
    });

    it('or_else', () => {
        deepEqual(ok.or_else(() => Ok(456)), Ok(123));
        deepEqual(ok.or_else(() => Err("Something else")), Ok(123));
        deepEqual(err.or_else(() => Ok(456)), Ok(456));
        deepEqual(err.or_else(() => Err("Something else")), Err("Something else"));
    });

    it('unwrap', () => {
        deepEqual(ok.unwrap(), 123);
        throws(err.unwrap);
    });

    it('unwrap_or', () => {
        deepEqual(ok.unwrap_or(456), 123);
        deepEqual(err.unwrap_or(456), 456);
    });

    it('unwrap_or_else', () => {
        deepEqual(ok.unwrap_or_else(() => 456), 123);
        deepEqual(err.unwrap_or_else(() => 456), 456);
    });

    it('unwrap_err', () => {
        throws(ok.unwrap_err);
        deepEqual(err.unwrap_err(), "Not a number");
    });
});
