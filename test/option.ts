import { equal, deepEqual, throws, doesNotThrow } from 'assert';
import { Option, Some, None } from '../src/option';
import { Ok, Err } from '../src/result';

describe('option', () => {
    let some: Option<string>;
    let none: Option<string>;

    beforeEach(() => {
        some = Some("abc");
        none = None();
    });

    it('ctor', () => {
        deepEqual(some, Some("abc"));
        deepEqual(none, None());
    });

    it('is_some', () => {
        equal(some.is_some, true);
        equal(none.is_some, false);
    });

    it('is_none', () => {
        equal(some.is_none, false);
        equal(none.is_none, true);
    });

    it('unwrap', () => {
        deepEqual(some.unwrap(), "abc");
        throws(none.unwrap);
    });

    it('unwrap_or', () => {
        deepEqual(some.unwrap_or("def"), "abc");
        deepEqual(none.unwrap_or("def"), "def");
    });

    it('unwrap_or_else', () => {
        deepEqual(some.unwrap_or_else(() => "def"), "abc");
        deepEqual(none.unwrap_or_else(() => "def"), "def");
    });

    it('unwrap_none', () => {
        throws(some.unwrap_none);
        doesNotThrow(none.unwrap_none);
    });

    it('map', () => {
        deepEqual(some.map(a => `${a}?`), Some("abc?"));
        deepEqual(none.map(a => `${a}?`), None());
    });

    it('map_or', () => {
        deepEqual(some.map_or(false, a => true), true);
        deepEqual(none.map_or(false, a => true), false);
    });

    it('map_or_else', () => {
        deepEqual(some.map_or_else(() => false, a => true), true);
        deepEqual(none.map_or_else(() => false, a => true), false);
    });

    it('ok_or', () => {
        deepEqual(some.ok_or("def"), Ok("abc"));
        deepEqual(none.ok_or("def"), Err("def"));
    });

    it('ok_or_else', () => {
        deepEqual(some.ok_or_else(() => "def"), Ok("abc"));
        deepEqual(none.ok_or_else(() => "def"), Err("def"));
    });

    it('and', () => {
        deepEqual(some.and(Some(123)), Some(123));
        deepEqual(some.and(None()), None());
        deepEqual(none.and(Some(123)), None());
        deepEqual(none.and(None()), None());
    });

    it('and_then', () => {
        deepEqual(some.and_then(a => Some(`${a}?`)), Some("abc?"));
        deepEqual(some.and_then(a => None()), None());
        deepEqual(none.and_then(a => Some(`${a}?`)), None());
        deepEqual(none.and_then(a => None()), None());
    });

    it('or', () => {
        deepEqual(some.or(Some("def")), Some("abc"));
        deepEqual(some.or(None()), Some("abc"));
        deepEqual(none.or(Some("def")), Some("def"));
        deepEqual(none.or(None()), None());
    });

    it('or_else', () => {
        deepEqual(some.or_else(() => Some("def")), Some("abc"));
        deepEqual(some.or_else(() => None()), Some("abc"));
        deepEqual(none.or_else(() => Some("def")), Some("def"));
        deepEqual(none.or_else(() => None()), None());
    });
});
