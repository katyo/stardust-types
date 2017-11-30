import { Future, Async } from './future';

export function timeout(msec: number): Future<undefined, undefined> {
    const [future_end, future] = Async<undefined, undefined>();
    setTimeout(() => future_end.ok(undefined), msec);
    return future;
}
