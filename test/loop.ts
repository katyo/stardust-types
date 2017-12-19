import { deepEqual, fail } from 'assert';
import { ok } from '../future';
import { Ok } from '../result';
import { loop_fn, Break, Continue } from '../loop';

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
