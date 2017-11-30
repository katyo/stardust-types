import { deepEqual } from 'assert';
import { timeout } from '../timer';
import { Ok } from '../result';

describe('timer', () => {
    it('timeout 0', (done) => {
        timeout(0).end(res => {
            deepEqual(res, Ok(undefined));
            done();
        });
    });

    it('timeout 10', (done) => {
        timeout(10).end(res => {
            deepEqual(res, Ok(undefined));
            done();
        });
    });

    it('timeout 100', (done) => {
        timeout(100).end(res => {
            deepEqual(res, Ok(undefined));
            done();
        });
    })

    it('timeout 10 earlier than 11', (done) => {
        timeout(10).map(() => 10).select(timeout(11).map(() => 11)).end(res => {
            deepEqual(res, Ok(10));
            done();
        });
    });

    it('timeout 11 later than 10', (done) => {
        timeout(11).map(() => 11).select(timeout(10).map(() => 10)).end(res => {
            deepEqual(res, Ok(10));
            done();
        });
    });

    it('timeout 100 earlier than 110', (done) => {
        timeout(100).map(() => 100).select(timeout(110).map(() => 110)).end(res => {
            deepEqual(res, Ok(100));
            done();
        });
    });

    it('timeout 110 later than 100', (done) => {
        timeout(110).map(() => 110).select(timeout(100).map(() => 100)).end(res => {
            deepEqual(res, Ok(100));
            done();
        });
    });
});
