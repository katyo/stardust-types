import { Option, Some, None } from './option';
import { Result, Ok, Err } from './result';
import { Either, A, B } from './either';

export interface Future<Item, Error> {
    map<NewItem>(fn: (item: Item) => NewItem): Future<NewItem, Error>;
    map_err<NewError>(fn: (error: Error) => NewError): Future<Item, NewError>;

    then<NewItem, NewError>(fn: (res: Result<Item, Error>) => Future<NewItem, NewError>): Future<NewItem, NewError>;
    and<NewItem>(other: Future<NewItem, Error>): Future<NewItem, Error>;
    and_then<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Future<NewItem, Error>;
    or<NewError>(other: Future<Item, NewError>): Future<Item, NewError>;
    or_else<NewError>(fn: (err: Error) => Future<Item, NewError>): Future<Item, NewError>;

    select(other: Future<Item, Error>): Future<Item, Error>;
    select_either<OtherItem, OtherError>(other: Future<OtherItem, OtherError>): Future<Either<Item, OtherItem>, Either<Error, OtherError>>;

    join<OtherItem>(other: Future<OtherItem, Error>): Future<[Item, OtherItem], Error>;

    end(fn: (res: Result<Item, Error>) => void): Future<Item, Error>;
    unend(fn: (res: Result<Item, Error>) => void): Future<Item, Error>;

    start(): void;
    abort(): void;
}

export interface Task<Item, Error> {
    end(res: Result<Item, Error>): void;
    fail(err: Error): void;
    done(item: Item): void;
    
    /* feedback */
    start(fn: () => void): Task<Item, Error>;
    abort(fn: () => void): Task<Item, Error>;
}

class AsyncFuture<Item, Error> implements Future<Item, Error> {
    private _: AsyncControl<Item, Error>;

    constructor(ctrl: AsyncControl<Item, Error>) {
        this._ = ctrl;
    }

    map<NewItem>(fn: (item: Item) => NewItem): Future<NewItem, Error> {
        const [task, future] = oneshot<NewItem, Error>();
        const on = (res: Result<Item, Error>) => { task.end(res.map(fn)); };
        this.end(on);
        task
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    map_err<NewError>(fn: (error: Error) => NewError): Future<Item, NewError> {
        const [task, future] = oneshot<Item, NewError>();
        const on = (res: Result<Item, Error>) => { task.end(res.map_err(fn)); };
        this.end(on);
        task
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    then<NewItem, NewError>(fn: (res: Result<Item, Error>) => Future<NewItem, NewError>): Future<NewItem, NewError> {
        const [task, future] = oneshot<NewItem, NewError>();
        const on = (res: Result<Item, Error>) => {
            const other = fn(res);
            const on = (res: Result<NewItem, NewError>) => { task.end(res); };
            other.end(on).start();
            task.abort(() => other.unend(on).abort());
        };
        this.end(on);
        task
            .start(() => this.start())
            .abort(() => this.unend(on).abort());
        return future;
    }

    and<NewItem>(other: Future<NewItem, Error>): Future<NewItem, Error> {
        const [task, future] = oneshot<NewItem, Error>();
        const on = (res: Result<Item, Error>) => {
            res.then(_ => {
                const on = (res: Result<NewItem, Error>) => { task.end(res); };
                other.end(on).start();
                task.abort(() => other.unend(on).abort());
            }, err => {
                task.end(Err(err));
            });
        };
        this.end(on);
        task
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    and_then<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Future<NewItem, Error> {
        const [task, future] = oneshot<NewItem, Error>();
        const on = (res: Result<Item, Error>) => {
            res.then(item => {
                const other = fn(item);
                const on = (res: Result<NewItem, Error>) => { task.end(res); };
                other.end(on).start();
                task.abort(() => { other.unend(on).abort(); });
            }, err => {
                task.end(Err(err));
            });
        };
        this.end(on);
        task
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    or<NewError>(other: Future<Item, NewError>): Future<Item, NewError> {
        const [task, future] = oneshot<Item, NewError>();
        const on = (res: Result<Item, Error>) => {
            res.then(item => {
                task.end(Ok(item));
            }, err => {
                const on = (res: Result<Item, NewError>) => { task.end(res); };
                other.end(on).start();
                task.abort(() => { other.unend(on).abort(); });
            });
        };
        this.end(on);
        task
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    or_else<NewError>(fn: (err: Error) => Future<Item, NewError>): Future<Item, NewError> {
        const [task, future] = oneshot<Item, NewError>();
        const on = (res: Result<Item, Error>) => {
            res.then(item => {
                task.end(Ok(item));
            }, err => {
                const other = fn(err);
                const on = (res: Result<Item, NewError>) => { task.end(res); };
                other.end(on).start();
                task.abort(() => { other.unend(on).abort(); });
            });
        };
        this.end(on);
        task
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    select(other: Future<Item, Error>): Future<Item, Error> {
        const [task, future] = oneshot<Item, Error>();
        const on_this = (res: Result<Item, Error>) => {
            other.unend(on_other).abort();
            task.end(res);
        };
        const on_other = (res: Result<Item, Error>) => {
            this.unend(on_this).abort();
            task.end(res);
        };
        this.end(on_this);
        other.end(on_other);
        task
            .start(() => {
                this.start();
                other.start();
            })
            .abort(() => {
                this.unend(on_this).abort();
                other.unend(on_other).abort();
            });
        return future;
    }

    select_either<OtherItem, OtherError>(other: Future<OtherItem, OtherError>): Future<Either<Item, OtherItem>, Either<Error, OtherError>> {
        const [task, future] = oneshot<Either<Item, OtherItem>, Either<Error, OtherError>>();
        const on_this = (res: Result<Item, Error>) => {
            other.unend(on_other).abort();
            task.end(res.map(A).map_err(A) as Result<Either<Item, OtherItem>, Either<Error, OtherError>>);
        };
        const on_other = (res: Result<OtherItem, OtherError>) => {
            this.unend(on_this).abort();
            task.end(res.map(B).map_err(B) as Result<Either<Item, OtherItem>, Either<Error, OtherError>>);
        };
        this.end(on_this);
        other.end(on_other);
        task
            .start(() => { this.start(); other.start(); })
            .abort(() => { this.unend(on_this).abort(); other.unend(on_other).abort(); });
        return future;
    }

    join<OtherItem>(other: Future<OtherItem, Error>): Future<[Item, OtherItem], Error> {
        const [task, future] = oneshot<[Item, OtherItem], Error>();
        let item_this: Option<Item> = None();
        let item_other: Option<OtherItem> = None();
        const on_this = (res: Result<Item, Error>) => {
            res.then(item_this_raw => {
                item_other.map_or_else(() => { item_this = Some(item_this_raw); },
                                       item_other_raw => {
                                           task.end(Ok([item_this_raw, item_other_raw] as [Item, OtherItem]));
                                       });
            }, error => {
                other.unend(on_other).abort();
                task.end(Err(error));
            });
        };
        const on_other = (res: Result<OtherItem, Error>) => {
            res.then(item_other_raw => {
                item_this.map_or_else(() => { item_other = Some(item_other_raw); },
                                      item_this_raw => {
                                          task.end(Ok([item_this_raw, item_other_raw] as [Item, OtherItem]));
                                      });
            }, error => {
                this.unend(on_this).abort();
                task.end(Err(error));
            });
        };
        this.end(on_this);
        other.end(on_other);
        task
            .start(() => { this.start(); other.start(); })
            .abort(() => { this.unend(on_this).abort(); other.unend(on_other).abort(); });
        return future;
    }

    end(fn: (res: Result<Item, Error>) => void): Future<Item, Error> {
        this._.on_end(fn);
        return this;
    }

    unend(fn: (res: Result<Item, Error>) => void): Future<Item, Error> {
        this._.off_end(fn);
        return this;
    }

    start() {
        this._.start();
    }

    abort() {
        this._.abort();
    }
}

function on_fn<Fn>(fns: Fn[], fn: Fn) {
    const i = fns.indexOf(fn);
    if (i < 0) {
        fns.push(fn);
    }
}

function off_fn<Fn>(fns: Fn[], fn: Fn) {
    const i = fns.indexOf(fn);
    if (i >= 0) {
        fns.splice(i, 1);
    }
}

const [defer, unfer]: [(fn: () => void) => any, (id: any) => void] =
    typeof setImmediate == 'function' ? [setImmediate, clearImmediate] :
    [(fn: () => void) => { setTimeout(fn, 0); }, clearTimeout];

type AsyncCallback<Item, Error> = (res: Result<Item, Error>) => void;
type AsyncHook = () => void;

interface AsyncHandlers<Item, Error> {
    end: AsyncCallback<Item, Error>[];

    /* feedback hooks */
    start: Option<AsyncHook>; /* actually start task */
    abort: Option<AsyncHook>; /* abort started task */
}

type AsyncState<Item, Error> = Option<AsyncHandlers<Item, Error>>;

class AsyncControl<Item, Error> {
    private _: AsyncState<Item, Error> = Some({ end: [], start: None<AsyncHook>(), abort: None<AsyncHook>() });
    private $: boolean = false;
    private D: any;

    on_end(fn: (res: Result<Item, Error>) => void) {
        this._.map(({ end }) => on_fn(end, fn));
    }

    off_end(fn: (res: Result<Item, Error>) => void) {
        this._.map(({ end }) => off_fn(end, fn));
    }

    end(res: Result<Item, Error>) {
        this._.map(({ end }) => {
            this._ = None();
            const emit = () => {
                for (const fn of end) {
                    fn(res);
                }
            };
            if (this.$) this.D = defer(emit);
            else emit();
        });
    }

    on_start(fn: () => void) {
        this._.map((cbs) => {
            cbs.start = Some(fn);
        });
    }

    on_abort(fn: () => void) {
        this._.map((cbs) => {
            cbs.abort = Some(fn);
        });
    }

    start() {
        this._.map((cbs) => {
            if (cbs.start.is_some) {
                const start = cbs.start.unwrap();
                cbs.start = None();
                this.$ = true;
                start();
                this.$ = false;
            }
        });
    }

    abort() {
        this._.map((cbs) => {
            if (this.D) {
                unfer(this.D);
                delete this.D;
            }
            if (cbs.abort.is_some) {
                const abort = cbs.abort.unwrap();
                this._ = None();
                abort();
            }
        });
    }
}

class AsyncTask<Item, Error> implements Task<Item, Error> {
    private _: AsyncControl<Item, Error>;

    constructor(ctrl: AsyncControl<Item, Error>) {
        this._ = ctrl;
    }

    fail(err: Error) {
        this.end(Err(err));
    }
    
    done(item: Item) {
        this.end(Ok(item));
    }

    end(res: Result<Item, Error>) {
        this._.end(res);
    }

    start(fn: () => void): AsyncTask<Item, Error> {
        this._.on_start(fn);
        return this;
    }

    abort(fn: () => void): AsyncTask<Item, Error> {
        this._.on_abort(fn);
        return this;
    }
}

export function oneshot<Item, Error>(): [Task<Item, Error>, Future<Item, Error>] {
    const control = new AsyncControl<Item, Error>();
    const task = new AsyncTask<Item, Error>(control);
    const future = new AsyncFuture<Item, Error>(control);
    return [task, future];
}

const async_never = new AsyncFuture<undefined, undefined>(new AsyncControl<undefined, undefined>());

export function never<Item, Error>(): Future<Item, Error> {
    return async_never as any as Future<Item, Error>;
}

export function ok<Item, Error>(item: Item): Future<Item, Error> {
    const [task, future] = oneshot<Item, Error>();
    task.start(() => {
        task.done(item);
    });
    return future;
}

export function err<Item, Error>(error: Error): Future<Item, Error> {
    const [task, future] = oneshot<Item, Error>();
    task.start(() => {
        task.fail(error);
    });
    return future;
}

export function join_all<Item, Error>(futures: Future<Item, Error>[]): Future<Item[], Error> {
    if (futures.length == 0) {
        return never();
    }

    let future: Future<Item[], Error> = futures[0].map(item => [item]);
    for (let i = 1; i < futures.length; i++) {
        future = future.join(futures[i]).map(([items, item]) => {
            items.push(item);
            return items;
        });
    }
    return future;
}

export type Loop<Item, State> = Either<Item, State>;

export function Break<Item, State>(item: Item): Loop<Item, State> {
    return A(item);
}

export function Continue<Item, State>(state: State): Loop<Item, State> {
    return B(state);
}

export type LoopFuture<State, Item, Error> = Future<Loop<Item, State>, Error>;

export function loop_fn<State, Item, Error>(init: State, fn: (state: State) => LoopFuture<State, Item, Error>): Future<Item, Error> {
    const [task, future] = oneshot<Item, Error>();
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
