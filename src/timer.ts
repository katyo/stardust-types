import { Ok } from './result';
import { Future, Async } from './future';

export function timeout(msec: number): Future<undefined, undefined> {
    const [future_end, future] = Async<undefined, undefined>();
    let timer: any;
    future_end.start(() => { timer = setTimeout(() => { future_end.end(Ok(undefined)); }, msec); });
    future_end.abort(() => { clearTimeout(timer); });
    return future;
}
