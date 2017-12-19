import { Either, A, B } from './either';
import { Future, channel } from './future';

export type Loop<Item, State> = Either<Item, State>;

export function Break<Item, State>(item: Item): Loop<Item, State> {
    return A(item);
}

export function Continue<Item, State>(state: State): Loop<Item, State> {
    return B(state);
}

export type LoopFuture<State, Item, Error> = Future<Loop<Item, State>, Error>;

export function loop_fn<State, Item, Error>(init: State, fn: (state: State) => LoopFuture<State, Item, Error>): Future<Item, Error> {
    const [task, future] = channel<Item, Error>();
    let loop_future: LoopFuture<State, Item, Error> | undefined;
    let loop_active = true;
    const step = (state: State) => {
        loop_future = fn(state).end(res => {
            loop_future = undefined;
            res.map_or_else(
                err => { task.fail(err); },
                loop => {
                    loop.map_a_or_else(state => { if (loop_active) step(state); },
                                       item => { task.done(item); });
                }
            );
        });
        loop_future.start();
    }
    task.start(() => { step(init); })
        .abort(() => {
            if (loop_future) loop_future.abort();
            loop_active = false;
        });
    return future;
}
