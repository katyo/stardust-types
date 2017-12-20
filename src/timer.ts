import { Result } from './result';
import { Future, oneshot } from './future';

export function timeout<Item, Error>(msec: number, res: Result<Item, Error>): Future<Item, Error> {
    const [task, future] = oneshot<Item, Error>();
    let timer: any;
    task.start(() => { timer = setTimeout(() => {
        task.end(res);
    }, msec); }).abort(() => { clearTimeout(timer); });
    return future;
}
