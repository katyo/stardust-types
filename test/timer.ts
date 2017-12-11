import { deepEqual } from 'assert';
import { timeout } from '../timer';
import { Ok, Err } from '../result';

describe('timer', () => {
    it('timeout 0 Ok(true)', (done) => {
        timeout(0, Ok(true)).end(res => {
            deepEqual(res, Ok(true));
            done();
        }).start();
    });

    it('timeout 10 Ok(1)', (done) => {
        timeout(10, Ok(1)).end(res => {
            deepEqual(res, Ok(1));
            done();
        }).start();
    });

    it('timeout 100 Err(str)', (done) => {
        timeout(100, Err("timeout")).end(res => {
            deepEqual(res, Err("timeout"));
            done();
        }).start();
    })

    it('timeout 10 earlier than 11', (done) => {
        timeout(10, Ok(1)).map((n) => n * 10).select(timeout(11, Ok(11)).map(() => 11)).end(res => {
            deepEqual(res, Ok(10));
            done();
        }).start();
    });

    it('timeout 11 later than 10', (done) => {
        timeout(11, Ok(11)).select(timeout(10, Ok(10))).end(res => {
            deepEqual(res, Ok(10));
            done();
        }).start();
    });

    it('timeout 100 earlier than 110', (done) => {
        timeout(100, Ok(100)).select(timeout(110, Ok(110))).end(res => {
            deepEqual(res, Ok(100));
            done();
        }).start();
    });

    it('timeout 110 later than 100', (done) => {
        timeout(110, Ok(110)).select(timeout(100, Ok(100))).end(res => {
            deepEqual(res, Ok(100));
            done();
        }).start();
    });
});
