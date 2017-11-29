import { Result, Ok, Err } from './result';

export interface Option<Item> {
    is_some: boolean;
    is_none: boolean;

    unwrap(): Item;
    unwrap_or(item: Item): Item;
    unwrap_or_else(fn: () => Item): Item;
    unwrap_none(): void;

    map<NewItem>(fn: (item: Item) => NewItem): Option<NewItem>;
    map_or<Type>(def: Type, fn: (item: Item) => Type): Type;
    map_or_else<Type>(def_fn: () => Type, fn: (item: Item) => Type): Type;

    ok_or<Error>(err: Error): Result<Item, Error>;
    ok_or_else<Error>(err_fn: () => Error): Result<Item, Error>;

    and<OtherItem>(other: Option<OtherItem>): Option<OtherItem>;
    and_then<OtherItem>(other_fn: (item: Item) => Option<OtherItem>): Option<OtherItem>;

    or(other: Option<Item>): Option<Item>;
    or_else(other_fn: () => Option<Item>): Option<Item>;

    then<Type>(fn: (item: Item) => Type, def_fn: () => Type): Type;
}

class OptionSome<Item> implements Option<Item> {
    private _: Item;

    constructor(item: Item) {
        this._ = item;
    }

    readonly is_some: boolean = true;
    readonly is_none: boolean = false;

    unwrap(): Item {
        return this._;
    }

    unwrap_or(_item: Item): Item {
        return this._;
    }

    unwrap_or_else(_fn: () => Item): Item {
        return this._;
    }

    unwrap_none() {
        throw new Error(`Option is Some: ${this._}`);
    }

    map<NewItem>(fn: (item: Item) => NewItem): Option<NewItem> {
        return Some(fn(this._));
    }

    map_or<Type>(_def: Type, fn: (item: Item) => Type): Type {
        return fn(this._);
    }

    map_or_else<Type>(_def_fn: () => Type, fn: (item: Item) => Type): Type {
        return fn(this._);
    }

    ok_or<Error>(_err: Error): Result<Item, Error> {
        return Ok(this._);
    }

    ok_or_else<Error>(_err_fn: () => Error): Result<Item, Error> {
        return Ok(this._);
    }

    and<OtherItem>(other: Option<OtherItem>): Option<OtherItem> {
        return other;
    }

    and_then<OtherItem>(other_fn: (item: Item) => Option<OtherItem>): Option<OtherItem> {
        return other_fn(this._);
    }

    or(other: Option<Item>): Option<Item> {
        return this;
    }

    or_else(other_fn: () => Option<Item>): Option<Item> {
        return this;
    }

    then<Type>(fn: (item: Item) => Type, _def_fn: () => Type): Type {
        return fn(this._);
    }
}

class OptionNone<Item> implements Option<Item> {
    constructor() { }

    readonly is_some: boolean = false;
    readonly is_none: boolean = true;

    unwrap(): Item {
        throw new Error("Option is None");
    }

    unwrap_or(item: Item): Item {
        return item;
    }

    unwrap_or_else(fn: () => Item): Item {
        return fn();
    }

    unwrap_none() { }

    map<NewItem>(_fn: (item: Item) => NewItem): Option<NewItem> {
        return this as any as Option<NewItem>;
    }

    map_or<Type>(def: Type, _fn: (item: Item) => Type): Type {
        return def;
    }

    map_or_else<Type>(def_fn: () => Type, _fn: (item: Item) => Type): Type {
        return def_fn();
    }

    ok_or<Error>(err: Error): Result<Item, Error> {
        return Err(err);
    }

    ok_or_else<Error>(err_fn: () => Error): Result<Item, Error> {
        return Err(err_fn());
    }

    and<OtherItem>(_other: Option<OtherItem>): Option<OtherItem> {
        return this as any as Option<OtherItem>;
    }

    and_then<OtherItem>(other_fn: (item: Item) => Option<OtherItem>): Option<OtherItem> {
        return this as any as Option<OtherItem>;
    }

    or(other: Option<Item>): Option<Item> {
        return other;
    }

    or_else(other_fn: () => Option<Item>): Option<Item> {
        return other_fn();
    }

    then<Type>(_fn: (item: Item) => Type, def_fn: () => Type): Type {
        return def_fn();
    }
}

export function Some<Item>(item: Item): Option<Item> {
    return new OptionSome(item);
}

export function None<Item>(): Option<Item> {
    return new OptionNone();
}
