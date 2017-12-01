import { Option } from './option';
import { Result } from './result';
import { Future } from './future';

export interface Stream<Item, Error> {
    map<NewItem>(fn: (item: Item) => NewItem): Stream<NewItem, Error>;
    map_err<NewError>(fn: (error: Error) => NewError): Stream<Item, NewError>;

    filter(fn: (item: Item) => boolean): Stream<Item, Error>;
    filter_map<NewItem>(fn: (item: Item) => Option<NewItem>): Stream<NewItem, Error>;

    then<NewItem, NewError>(fn: (res: Result<Item, Error>) => Future<NewItem, NewError>): Stream<NewItem, NewError>;
    and_then<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Stream<NewItem, Error>;
    or_else<NewError>(fn: (err: Error) => Future<Item, NewError>): Stream<Item, NewError>;

    collect(): Future<Item[], Error>;
    fold<Type>(init: Type, fn: (prev: Type, item: Item) => Future<Type, Error>): Future<Type, Error>;

    skip(cnt: number): Stream<Item, Error>;
    take(cnt: number): Stream<Item, Error>;
    skip_while(fn: (item: Item) => Future<boolean, Error>): Stream<Item, Error>;
    take_while(fn: (item: Item) => Future<boolean, Error>): Stream<Item, Error>;

    zip<OtherItem>(other: Stream<OtherItem, Error>): Stream<[Item, OtherItem], Error>;
    chain(other: Stream<Item, Error>): Stream<Item, Error>;
    chunks(capacity: number): Stream<[Item], Error>;

    select(other: Stream<Item, Error>): Stream<Item, Error>;
    forward(sink: Sink<Item, Error>): Future<[Sink<Item, Error>, Stream<Item, Error>], Error>;

    start(): Stream<Item, Error>;
    abort(): Stream<Item, Error>;
}

export interface Sink<Item, Error> {
    with<NewItem>(fn: (item: Item) => Future<NewItem, Error>): Sink<NewItem, Error>;
    with_flat_map<NewItem>(fn: (item: Item) => Stream<NewItem, Error>): Sink<NewItem, Error>;

    map<NewItem>(fn: (item: Item) => NewItem): Sink<NewItem, Error>;
    map_err<NewError>(fn: (err: Error) => NewError): Sink<Item, NewError>;

    close(): Sink<Item, Error>;
    send(item: Item): Sink<Item, Error>;
    send_all(stream: Stream<Item, Error>): Sink<Item, Error>;

    start(fn: () => void): Sink<Item, Error>;
    abort(fn: () => void): Sink<Item, Error>;
}
