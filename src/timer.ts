import { Result } from './result';
import { Future, Async } from './future';

export function timeout<Item, Error>(msec: number, res: Result<Item, Error>): Future<Item, Error> {
    const [end, future] = Async<Item, Error>();
    let timer: any;
    end.start(() => { timer = setTimeout(() => { end.end(res); }, msec); });
    end.abort(() => { clearTimeout(timer); });
    return future;
}
