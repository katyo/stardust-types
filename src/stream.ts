import { Option, None, Some } from './option';
import { Result, Ok, Err } from './result';
import { Either, A, B } from './either';
import { Future, ok, oneshot } from './future';
import { AsyncHook, AsyncCall } from './async';

export type StreamItem<Item, Error> = [Option<Item>, Stream<Item, Error>];
export type StreamFuture<Item, Error> = Future<StreamItem<Item, Error>, Error>;

export interface Stream<Item, Error> {
    map<NewItem>(fn: (item: Item) => NewItem): Stream<NewItem, Error>;
    map_err<NewError>(fn: (error: Error) => NewError): Stream<Item, NewError>;

    filter(fn: (item: Item) => boolean): Stream<Item, Error>;
    filter_map<NewItem>(fn: (item: Item) => Option<NewItem>): Stream<NewItem, Error>;

    then<NewItem, NewError>(fn: (res: Result<Item, Error>) => Future<NewItem, NewError>): Stream<NewItem, NewError>;
    and_then<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Stream<NewItem, Error>;
    or_else<NewError>(fn: (err: Error) => Future<Item, NewError>): Stream<Item, NewError>;

    for_each(fn: (item: Item) => Future<void, Error>): Future<void, Error>;
    collect(): Future<Item[], Error>;
    fold<Type>(init: Type, fn: (prev: Type, item: Item) => Future<Type, Error>): Future<Type, Error>;

    skip(cnt: number): Stream<Item, Error>;
    take(cnt: number): Stream<Item, Error>;

    skip_while(fn: (item: Item) => Future<boolean, Error>): Stream<Item, Error>;
    take_while(fn: (item: Item) => Future<boolean, Error>): Stream<Item, Error>;

    chunks(capacity: number): Stream<Item[], Error>;

    //zip<OtherItem>(other: Stream<OtherItem, Error>): Stream<[Item, OtherItem], Error>;
    //chain(other: Stream<Item, Error>): Stream<Item, Error>;

    select(other: Stream<Item, Error>): Stream<Item, Error>;
    select_either<OtherItem, OtherError>(other: Stream<OtherItem, OtherError>): Stream<Either<Item, OtherItem>, Either<Error, OtherError>>;

    //join<OtherItem>(other: Stream<OtherItem, Error>): Stream<[Item, OtherItem], Error>;

    forward(sink: Sink<Item, Error>): Future<[Sink<Item, Error>, Stream<Item, Error>], Error>;

    future(): StreamFuture<Item, Error>;

    end(fn: (res: Result<Option<Item>, Error>) => void): Stream<Item, Error>;
    unend(): Stream<Item, Error>;

    start(): Stream<Item, Error>;
    abort(): Stream<Item, Error>;
}

export interface Sink<Item, Error> {
    with<NewItem>(fn: (item: NewItem) => Future<Item, Error>): Sink<NewItem, Error>;
    with_flat_map<NewItem>(fn: (item: NewItem) => Stream<Item, Error>): Sink<NewItem, Error>;

    map<NewItem>(fn: (item: NewItem) => Item): Sink<NewItem, Error>;
    map_err<NewError>(fn: (err: NewError) => Error): Sink<Item, NewError>;

    send_all(stream: Stream<Item, Error>): Future<[Sink<Item, Error>, Stream<Item, Error>], Error>;

    end(res: Result<Option<Item>, Error>): void;
    done(): void;
    fail(error: Error): void;
    send(item: Item): void;

    start(fn: () => void): Sink<Item, Error>;
    abort(fn: () => void): Sink<Item, Error>;

    stop(): Sink<Item, Error>;
}

type AsyncCallback<Item, Error> = (val: Result<Option<Item>, Error>) => void;

interface AsyncHandlers<Item, Error> {
    end: Option<AsyncCallback<Item, Error>>;

    started: boolean,
    /* feedback hooks */
    start: Option<AsyncHook>; /* actually start stream */
    abort: Option<AsyncHook>; /* abort started stream */
}

type AsyncState<Item, Error> = Option<AsyncHandlers<Item, Error>>;

class AsyncControl<Item, Error> {
    private _: AsyncState<Item, Error> = Some({
        end: None<AsyncCallback<Item, Error>>(),
        started: false,
        start: None<AsyncHook>(),
        abort: None<AsyncHook>(),
    });
    private $: AsyncCall = new AsyncCall();

    on_end(fn: (res: Result<Option<Item>, Error>) => void) {
        this._.map(cbs => { cbs.end = Some(fn); });
    }

    off_end() {
        this._.map(cbs => { cbs.end = None(); });
    }

    send(res: Result<Option<Item>, Error>) {
        this._.map(cbs => {
            if (cbs.started) {
                cbs.started = false;

                if (res.is_ok && res.unwrap().is_none) {
                    this._ = None();
                }

                cbs.end.map(end => {
                    this.$.call(() => { end(res); });
                });
            }
        });
    }

    on_start(fn: () => void) {
        this._.map(cbs => {
            cbs.start = Some(fn);
        });
    }

    off_start() {
        this._.map(cbs => {
            cbs.start = None();
        });
    }

    on_abort(fn: () => void) {
        this._.map(cbs => {
            cbs.abort = Some(fn);
        });
    }

    start() {
        this._.map(cbs => {
            if (!cbs.started) {
                cbs.started = true;

                cbs.start.map_or_else(() => {
                    this.send(Ok(None()));
                    this._ = None();
                }, start => {
                    this.$.wrap(start);
                });
            }
        });
    }

    abort() {
        this._.map(cbs => {
            this.$.drop();
            this._ = None();
            cbs.abort.map(abort => { abort(); });
        });
    }
}

function stream_end<Item, Error>(stream: Stream<Item, Error>, fn: (item: Item) => void, fn_err: (error: Error) => void, fn_end: () => void) {
    stream.end(res => {
        res.map_or_else(error => { fn_err(error); },
            opt => {
                opt.map_or_else(() => { fn_end(); },
                    item => { fn(item); });
            });
    });
}

function sink_send<Item, Error>(sink: Sink<Item, Error>): (item: Item) => void {
    return item => { sink.send(item); };
}

function sink_fail<Item, Error>(sink: Sink<Item, Error>): (error: Error) => void {
    return error => { sink.fail(error); };
}

function sink_done<Item, Error>(sink: Sink<Item, Error>): () => void {
    return () => { sink.done(); };
}

function stream_start<Item, Error>(stream: Stream<Item, Error>): () => void {
    return () => { stream.start(); };
}

function stream_abort<Item, Error>(stream: Stream<Item, Error>): () => void {
    return () => { stream.abort(); };
}

function future_then<Item, Error, NewItem, NewError>(stream: Stream<Item, Error>, future: Future<NewItem, NewError>, sink: Sink<NewItem, NewError>) {
    sink.abort(() => { stream.abort(); future.abort(); });

    future.end(res => {
        sink.abort(stream_abort(stream));

        res.map_or_else(sink_fail(sink),
            sink_send(sink));
    }).start();
}

class AsyncStream<Item, Error> implements Stream<Item, Error> {
    private _: AsyncControl<Item, Error>;

    constructor(ctrl: AsyncControl<Item, Error>) {
        this._ = ctrl;
    }

    map<NewItem>(fn: (item: Item) => NewItem): Stream<NewItem, Error> {
        const [sink, stream] = channel<NewItem, Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, item => { sink.send(fn(item)); },
            sink_fail(sink), sink_done(sink));

        return stream;
    }

    map_err<NewError>(fn: (error: Error) => NewError): Stream<Item, NewError> {
        const [sink, stream] = channel<Item, NewError>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, sink_send(sink),
            error => { sink.fail(fn(error)); },
            sink_done(sink));

        return stream;
    }

    filter(fn: (item: Item) => boolean): Stream<Item, Error> {
        return this.filter_map(item => fn(item) ? Some(item) : None());
    }

    filter_map<NewItem>(fn: (item: Item) => Option<NewItem>): Stream<NewItem, Error> {
        const [sink, stream] = channel<NewItem, Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, item => {
            fn(item).map_or_else(
                () => { this.start() },
                item => { sink.send(item); }
            );
        }, sink_fail(sink), sink_done(sink));

        return stream;
    }

    then<NewItem, NewError>(fn: (res: Result<Item, Error>) => Future<NewItem, NewError>): Stream<NewItem, NewError> {
        const [sink, stream] = channel<NewItem, NewError>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, item => {
            future_then(this, fn(Ok(item)), sink);
        }, error => {
            future_then(this, fn(Err(error)), sink);
        }, sink_done(sink));

        return stream;
    }

    and_then<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Stream<NewItem, Error> {
        const [sink, stream] = channel<NewItem, Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, item => {
            future_then(this, fn(item), sink);
        }, sink_fail(sink), sink_done(sink));

        return stream;
    }

    or_else<NewError>(fn: (err: Error) => Future<Item, NewError>): Stream<Item, NewError> {
        const [sink, stream] = channel<Item, NewError>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, sink_send(sink),
            error => {
                future_then(this, fn(error), sink);
            }, sink_done(sink));

        return stream;
    }

    for_each(fn: (item: Item) => Future<void, Error>): Future<void, Error> {
        const [task, future] = oneshot<void, Error>();
        const abort = stream_abort(this);

        task.start(stream_start(this))
            .abort(abort);

        stream_end(this, item => {
            const fn_future = fn(item);

            task.abort(() => { this.abort(); fn_future.abort(); });

            fn_future.end(res => {
                res.map_or_else(error => { task.fail(error); abort(); },
                    () => {
                        task.abort(abort);
                        this.start();
                    });
            }).start();
        }, err => { task.fail(err); }, () => { task.done(undefined); });

        return future;
    }

    collect(): Future<Item[], Error> {
        return this.fold<Item[]>([], (prev, item) => (prev.push(item), ok(prev)));
    }

    fold<Type>(init: Type, fn: (prev: Type, item: Item) => Future<Type, Error>): Future<Type, Error> {
        return this.for_each(item => fn(init, item).map(item => (init = item, undefined))).map(() => init);
    }

    skip(cnt: number): Stream<Item, Error> {
        return this.skip_while(() => ok(cnt > 0 ? (--cnt, true) : false));
    }

    take(cnt: number): Stream<Item, Error> {
        const [sink, stream] = channel<Item, Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        this.end(res => {
            if (cnt > 0) {
                cnt--;
                res.map_or_else(sink_fail(sink), opt => {
                    opt.map_or_else(sink_done(sink), sink_send(sink));
                });
            } else {
                sink.done();
            }
        });

        return stream;
    }

    skip_while(fn: (item: Item) => Future<boolean, Error>): Stream<Item, Error> {
        const [sink, stream] = channel<Item, Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, item => {
            const future = fn(item);

            future.end(res => {
                res.map_or_else(error => {
                    this.abort();
                    sink.fail(error);
                }, cond => {
                    if (cond) {
                        this.start();
                    } else {
                        sink.send(item);
                    }
                });
            }).start();
        }, sink_fail(sink), sink_done(sink));

        return stream;
    }

    take_while(fn: (item: Item) => Future<boolean, Error>): Stream<Item, Error> {
        const [sink, stream] = channel<Item, Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        stream_end(this, item => {
            const future = fn(item);

            future.end(res => {
                res.map_or_else(error => {
                    this.abort();
                    sink.fail(error);
                }, cond => {
                    if (cond) {
                        sink.send(item);
                    } else {
                        sink.done();
                        this.abort();
                    }
                });
            }).start();
        }, sink_fail(sink), sink_done(sink));

        return stream;
    }

    chunks(capacity: number): Stream<Item[], Error> {
        const [sink, stream] = channel<Item[], Error>();

        sink.start(stream_start(this))
            .abort(stream_abort(this));

        let list: Item[] = [];

        stream_end(this, item => {
            list.push(item);

            if (list.length >= capacity) {
                sink.send(list);
                list = [];
            } else {
                this.start();
            }
        }, sink_fail(sink), () => {
            sink.stop().send(list);
            list = [];
        });

        return stream;
    }

    select(other: Stream<Item, Error>): Stream<Item, Error> {
        const [sink, stream] = channel<Item, Error>();

        let opt: Option<Item> = None();
        let sent = false;

        sink.start(() => {
            sent = false;
            opt.map_or_else(() => {
                this.start();
                other.start();
            }, item => {
                opt = None();
                sink.send(item);
            });
        }).abort(() => {
            this.abort();
            other.abort();
        });

        const fn = (item: Item) => {
            if (sent) {
                opt = Some(item);
            } else {
                sent = true;
                sink.send(item);
            }
        };

        const fail = sink_fail(sink);

        let end = false;
        const done = () => {
            if (end) {
                sink.done();
            } else {
                end = true;
            }
        };

        stream_end(this, fn, fail, done);
        stream_end(other, fn, fail, done);

        return stream;
    }

    select_either<OtherItem, OtherError>(other: Stream<OtherItem, OtherError>): Stream<Either<Item, OtherItem>, Either<Error, OtherError>> {
        return this.map<Either<Item, OtherItem>>(A)
            .map_err<Either<Error, OtherError>>(A)
            .select(other.map<Either<Item, OtherItem>>(B)
                .map_err<Either<Error, OtherError>>(B));
    }

    forward(sink: Sink<Item, Error>): Future<[Sink<Item, Error>, Stream<Item, Error>], Error> {
        const [task, future] = oneshot<[Sink<Item, Error>, Stream<Item, Error>], Error>();

        sink.start(() => {
            sink.start(() => { this.start(); });
            task.start(() => {
                this.start();
            });
        }).abort(() => { future.abort(); });

        task.start(() => {
            sink.start(() => {
                this.start();
            });
        }).abort(() => { sink.done(); });

        this.end(res => {
            res.map_or_else(err => {
                sink.fail(err);
                task.fail(err);
            }, opt => {
                opt.map_or_else(() => {
                    sink.done();
                    task.done([sink, this]);
                }, item => {
                    sink.send(item);
                });
            });
        });
        return future;
    }

    future(): Future<[Option<Item>, Stream<Item, Error>], Error> {
        const [task, future] = oneshot<[Option<Item>, Stream<Item, Error>], Error>();

        task.start(() => {
            this.start();
        }).abort(() => {
            this.abort();
        });

        this.end(res => {
            this.unend();
            res.map_or_else(err => {
                task.fail(err);
            }, opt => {
                task.done([opt, this]);
            });
        });

        return future;
    }

    end(fn: (res: Result<Option<Item>, Error>) => void): Stream<Item, Error> {
        this._.on_end(fn);
        return this;
    }

    unend(): Stream<Item, Error> {
        this._.off_end();
        return this;
    }

    start() {
        this._.start();
        return this;
    }

    abort() {
        this._.abort();
        return this;
    }
}

class AsyncSink<Item, Error> implements Sink<Item, Error> {
    private _: AsyncControl<Item, Error>;

    constructor(ctrl: AsyncControl<Item, Error>) {
        this._ = ctrl;
    }

    with<NewItem>(fn: (item: NewItem) => Future<Item, Error>): Sink<NewItem, Error> {
        const [sink, stream] = channel<NewItem, Error>();

        stream_end(stream, item => {
            future_then(stream, fn(item), this);
        }, sink_fail(this), sink_done(this));

        this.start(stream_start(stream))
            .abort(stream_abort(stream));

        return sink;
    }

    with_flat_map<NewItem>(fn: (item: NewItem) => Stream<Item, Error>): Sink<NewItem, Error> {
        const [sink, stream] = channel<NewItem, Error>();
        const start = stream_start(stream);
        const abort = stream_abort(stream);

        stream_end(stream, item => {
            const fn_stream = fn(item);

            stream_end(fn_stream, sink_send(this), sink_fail(this), () => {
                this.start(start).abort(abort);
                stream.start();
            });

            this.start(() => {
                fn_stream.start();
            }).abort(() => {
                stream.abort();
                fn_stream.abort();
            });

            fn_stream.start();
        }, sink_fail(this), sink_done(this));

        this.start(start).abort(abort);

        return sink;
    }

    map<NewItem>(fn: (item: NewItem) => Item): Sink<NewItem, Error> {
        return this.with(item => ok(fn(item)));
    }

    map_err<NewError>(fn: (err: NewError) => Error): Sink<Item, NewError> {
        const [sink, stream] = channel<Item, NewError>();

        stream_end(stream, sink_send(this), error => {
            this.fail(fn(error));
        }, sink_done(this));

        this.start(stream_start(stream))
            .abort(stream_abort(stream));

        return sink;
    }

    send_all(stream: Stream<Item, Error>): Future<[Sink<Item, Error>, Stream<Item, Error>], Error> {
        return stream.forward(this);
    }

    end(res: Result<Option<Item>, Error>) {
        this._.send(res);
    }

    done() {
        this._.send(Ok(None()));
    }

    fail(error: Error) {
        this._.send(Err(error));
    }

    send(item: Item) {
        this._.send(Ok(Some(item)));
        return this;
    }

    start(fn: () => void): Sink<Item, Error> {
        this._.on_start(fn);
        return this;
    }

    stop(): Sink<Item, Error> {
        this._.off_start();
        return this;
    }

    abort(fn: () => void): Sink<Item, Error> {
        this._.on_abort(fn);
        return this;
    }
}

export function channel<Item, Error>(): [Sink<Item, Error>, Stream<Item, Error>] {
    const ctrl = new AsyncControl<Item, Error>();
    const sink = new AsyncSink<Item, Error>(ctrl);
    const stream = new AsyncStream<Item, Error>(ctrl);
    return [sink, stream];
}

export function iter_arr<Item, Error>(list: Item[]): Stream<Item, Error> {
    const [sink, stream] = channel<Item, Error>();

    let i = 0;

    sink.start(() => {
        if (i < list.length) {
            sink.send(list[i]);
            i++;
        } else {
            sink.done();
        }
    });

    return stream;
}

export function empty<Item, Error>(): Stream<Item, Error> {
    const [sink, stream] = channel<Item, Error>();
    sink.start(() => { sink.done(); });
    return stream;
}

export function once<Item, Error>(item: Item): Stream<Item, Error> {
    const [sink, stream] = channel<Item, Error>();
    sink.start(() => { sink.stop().send(item); });
    return stream;
}

export function repeat<Item, Error>(item: Item): Stream<Item, Error> {
    const [sink, stream] = channel<Item, Error>();
    sink.start(() => { sink.send(item); });
    return stream;
}

export function unfold<Type, Item, Error>(init: Type, fn: (prev: Type) => Future<Option<[Item, Type]>, Error>): Stream<Item, Error> {
    const [sink, stream] = channel<Item, Error>();
    sink.start(() => {
        const future = fn(init);

        sink.abort(() => { future.abort(); });

        future.end(res => {
            res.map_or_else(sink_fail(sink), opt => {
                opt.map_or_else(sink_done(sink), ([item, next]) => {
                    init = next;

                    sink.abort(() => undefined);
                    sink.send(item);
                });
            });
        }).start();
    });
    return stream;
}
