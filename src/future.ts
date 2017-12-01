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
    ok(fn: (item: Item) => void): Future<Item, Error>;
    err(fn: (error: Error) => void): Future<Item, Error>;

    unend(fn: (res: Result<Item, Error>) => void): Future<Item, Error>;
    unok(fn: (item: Item) => void): Future<Item, Error>;
    unerr(fn: (error: Error) => void): Future<Item, Error>;

    start(): void;
    abort(): void;
}

export interface FutureEnd<Item, Error> {
    end(res: Result<Item, Error>): void;
    ok(item: Item): void;
    err(error: Error): void;

    /* feedback */
    start(fn: () => void): FutureEnd<Item, Error>;
    abort(fn: () => void): FutureEnd<Item, Error>;
}

class FutureAsync<Item, Error> implements Future<Item, Error> {
    private _: FutureAsyncControl<Item, Error>;

    constructor(ctrl: FutureAsyncControl<Item, Error>) {
        this._ = ctrl;
    }

    map<NewItem>(fn: (item: Item) => NewItem): Future<NewItem, Error> {
        const [future_end, future] = Async<NewItem, Error>();
        const on = (res: Result<Item, Error>) => { future_end.end(res.map(fn)); };
        this.end(on);
        future_end
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    map_err<NewError>(fn: (error: Error) => NewError): Future<Item, NewError> {
        const [future_end, future] = Async<Item, NewError>();
        const on = (res: Result<Item, Error>) => { future_end.end(res.map_err(fn)); };
        this.end(on);
        future_end
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    then<NewItem, NewError>(fn: (res: Result<Item, Error>) => Future<NewItem, NewError>): Future<NewItem, NewError> {
        const [future_end, future] = Async<NewItem, NewError>();
        const on = (res: Result<Item, Error>) => {
            const other = fn(res);
            const on = (res: Result<NewItem, NewError>) => { future_end.end(res); };
            other.end(on).start();
            future_end.abort(() => other.unend(on).abort());
        };
        this.end(on);
        future_end
            .start(() => this.start())
            .abort(() => this.unend(on).abort());
        return future;
    }

    and<NewItem>(other: Future<NewItem, Error>): Future<NewItem, Error> {
        const [future_end, future] = Async<NewItem, Error>();
        const on = (res: Result<Item, Error>) => {
            res.then(_ => {
                const on = (res: Result<NewItem, Error>) => { future_end.end(res); };
                other.end(on).start();
                future_end.abort(() => other.unend(on).abort());
            }, err => {
                future_end.err(err);
            });
        };
        this.end(on);
        future_end
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    and_then<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Future<NewItem, Error> {
        const [future_end, future] = Async<NewItem, Error>();
        const on = (res: Result<Item, Error>) => {
            res.then(item => {
                const other = fn(item);
                const on = (res: Result<NewItem, Error>) => { future_end.end(res); };
                other.end(on).start();
                future_end.abort(() => { other.unend(on).abort(); });
            }, err => {
                future_end.err(err);
            });
        };
        this.end(on);
        future_end
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    or<NewError>(other: Future<Item, NewError>): Future<Item, NewError> {
        const [future_end, future] = Async<Item, NewError>();
        const on = (res: Result<Item, Error>) => {
            res.then(item => {
                future_end.ok(item);
            }, err => {
                const on = (res: Result<Item, NewError>) => { future_end.end(res); };
                other.end(on).start();
                future_end.abort(() => { other.unend(on).abort(); });
            });
        };
        this.end(on);
        future_end
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    or_else<NewError>(fn: (err: Error) => Future<Item, NewError>): Future<Item, NewError> {
        const [future_end, future] = Async<Item, NewError>();
        const on = (res: Result<Item, Error>) => {
            res.then(item => {
                future_end.ok(item);
            }, err => {
                const other = fn(err);
                const on = (res: Result<Item, NewError>) => { future_end.end(res); };
                other.end(on).start();
                future_end.abort(() => { other.unend(on).abort(); });
            });
        };
        this.end(on);
        future_end
            .start(() => { this.start(); })
            .abort(() => { this.unend(on).abort(); });
        return future;
    }

    select(other: Future<Item, Error>): Future<Item, Error> {
        const [future_end, future] = Async<Item, Error>();
        const on_this = (res: Result<Item, Error>) => {
            other.unend(on_other).abort();
            future_end.end(res);
        };
        const on_other = (res: Result<Item, Error>) => {
            this.unend(on_this).abort();
            future_end.end(res);
        };
        this.end(on_this);
        other.end(on_other);
        future_end
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
        const [future_end, future] = Async<Either<Item, OtherItem>, Either<Error, OtherError>>();
        const on_this = (res: Result<Item, Error>) => {
            other.unend(on_other).abort();
            future_end.end(res.map(A).map_err(A) as Result<Either<Item, OtherItem>, Either<Error, OtherError>>);
        };
        const on_other = (res: Result<OtherItem, OtherError>) => {
            this.unend(on_this).abort();
            future_end.end(res.map(B).map_err(B) as Result<Either<Item, OtherItem>, Either<Error, OtherError>>);
        };
        this.end(on_this);
        other.end(on_other);
        future_end
            .start(() => { this.start(); other.start(); })
            .abort(() => { this.unend(on_this).abort(); other.unend(on_other).abort(); });
        return future;
    }

    join<OtherItem>(other: Future<OtherItem, Error>): Future<[Item, OtherItem], Error> {
        const [future_end, future] = Async<[Item, OtherItem], Error>();
        let item_this: Option<Item> = None();
        let item_other: Option<OtherItem> = None();
        const on_this = (res: Result<Item, Error>) => {
            res.then(item_this_raw => {
                item_other.map_or_else(() => { item_this = Some(item_this_raw); },
                    item_other_raw => future_end.ok([item_this_raw, item_other_raw]));
            }, error => {
                other.unend(on_other).abort();
                future_end.err(error);
            });
        };
        const on_other = (res: Result<OtherItem, Error>) => {
            res.then(item_other_raw => {
                item_this.map_or_else(() => { item_other = Some(item_other_raw) },
                    item_this_raw => future_end.ok([item_this_raw, item_other_raw]));
            }, error => {
                this.unend(on_this).abort();
                future_end.err(error);
            });
        };
        this.end(on_this);
        other.end(on_other);
        future_end
            .start(() => { this.start(); other.start(); })
            .abort(() => { this.unend(on_this).abort(); other.unend(on_other).abort(); });
        return future;
    }

    end(fn: (res: Result<Item, Error>) => void): Future<Item, Error> {
        this._.on_end(fn);
        return this;
    }

    ok(fn: (item: Item) => void): Future<Item, Error> {
        this._.on_ok(fn);
        return this;
    }

    err(fn: (error: Error) => void): Future<Item, Error> {
        this._.on_err(fn);
        return this;
    }

    unend(fn: (res: Result<Item, Error>) => void): Future<Item, Error> {
        this._.off_end(fn);
        return this;
    }

    unok(fn: (item: Item) => void): Future<Item, Error> {
        this._.off_ok(fn);
        return this;
    }

    unerr(fn: (error: Error) => void): Future<Item, Error> {
        this._.off_err(fn);
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

interface FutureAsyncHandlers<Item, Error> {
    end: ((res: Result<Item, Error>) => void)[];
    ok: ((item: Item) => void)[];
    err: ((error: Error) => void)[];

    /* feedback hooks */
    start: Option<() => void>; /* actually start task */
    abort: Option<() => void>; /* abort started task */
}

type FutureAsyncState<Item, Error> = Result<Result<Item, Error>, FutureAsyncHandlers<Item, Error>>;

function dummy_fn() { }

class FutureAsyncControl<Item, Error> {
    private _: FutureAsyncState<Item, Error> = Err({ end: [], ok: [], err: [], start: None<() => void>(), abort: None<() => void>() });

    on_end(fn: (res: Result<Item, Error>) => void) {
        this._.map_or_else(({ end }) => on_fn(end, fn), fn);
    }

    on_ok(fn: (item: Item) => void) {
        this._.map_or_else(({ ok }) => on_fn(ok, fn),
            res => res.map_or(undefined, fn));
    }

    on_err(fn: (error: Error) => void) {
        this._.map_or_else(({ err }) => on_fn(err, fn),
            res => res.map_err_or(undefined, fn));
    }

    off_end(fn: (res: Result<Item, Error>) => void) {
        this._.map_or_else(({ end }) => off_fn(end, fn),
            dummy_fn);
    }

    off_ok(fn: (item: Item) => void) {
        this._.map_or_else(({ ok }) => off_fn(ok, fn),
            dummy_fn);
    }

    off_err(fn: (error: Error) => void) {
        this._.map_or_else(({ err }) => off_fn(err, fn),
            dummy_fn);
    }

    end(res: Result<Item, Error>, fn: (cbs: FutureAsyncHandlers<Item, Error>) => void) {
        this._.map_or_else((cbs) => {
            this._ = Ok(res);
            fn(cbs);
        }, dummy_fn);
    }

    on_start(fn: () => void) {
        this._.map_or_else((cbs) => {
            cbs.start = Some(fn);
        }, dummy_fn);
    }

    on_abort(fn: () => void) {
        this._.map_or_else((cbs) => {
            cbs.abort = Some(fn);
        }, dummy_fn);
    }

    start() {
        this._.map_or_else((cbs) => {
            if (cbs.start.is_some) {
                const start = cbs.start.unwrap();
                cbs.start = None();
                start();
            }
        }, dummy_fn);
    }

    abort() {
        this._.map_or_else((cbs) => {
            if (cbs.abort.is_some &&
                cbs.end.length == 0 &&
                cbs.ok.length == 0 &&
                cbs.err.length == 0) {
                const abort = cbs.abort.unwrap();
                cbs.abort = None();
                abort();
            }
        }, dummy_fn);
    }
}

class FutureAsyncEnd<Item, Error> implements FutureEnd<Item, Error> {
    private _: FutureAsyncControl<Item, Error>;

    constructor(ctrl: FutureAsyncControl<Item, Error>) {
        this._ = ctrl;
    }

    end(res: Result<Item, Error>) {
        this._.end(res, ({ end, ok, err }) => {
            for (const fn of end) {
                fn(res);
            }
            res.then(item => {
                for (const fn of ok) {
                    fn(item);
                }
            }, error => {
                for (const fn of err) {
                    fn(error);
                }
            });
        });
    }

    ok(item: Item) {
        this.end(Ok(item));
    }

    err(error: Error) {
        this.end(Err(error));
    }

    start(fn: () => void): FutureAsyncEnd<Item, Error> {
        this._.on_start(fn);
        return this;
    }

    abort(fn: () => void): FutureAsyncEnd<Item, Error> {
        this._.on_abort(fn);
        return this;
    }
}

export function Async<Item, Error>(): [FutureEnd<Item, Error>, Future<Item, Error>] {
    const future_control = new FutureAsyncControl<Item, Error>();
    const future = new FutureAsync<Item, Error>(future_control);
    const future_end = new FutureAsyncEnd<Item, Error>(future_control);
    return [future_end, future];
}

const never = new FutureAsync<undefined, undefined>(new FutureAsyncControl<undefined, undefined>());

export function Never<Item, Error>(): Future<Item, Error> {
    return never as any as Future<Item, Error>;
}

export function EndOk<Item, Error>(item: Item): Future<Item, Error> {
    const [future_end, future] = Async<Item, Error>();
    future_end.ok(item);
    return future;
}

export function EndErr<Item, Error>(err: Error): Future<Item, Error> {
    const [future_end, future] = Async<Item, Error>();
    future_end.err(err);
    return future;
}

export function join_all<Item, Error>(futures: Future<Item, Error>[]): Future<Item[], Error> {
    if (futures.length == 0) {
        return Never();
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
