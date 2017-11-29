import { Option, Some, None } from './option';

export interface Result<Item, Error> {
    is_ok: boolean;
    is_err: boolean;

    ok(): Option<Item>;
    err(): Option<Error>;

    map<NewItem>(fn: (item: Item) => NewItem): Result<NewItem, Error>;
    map_or<Type>(err: Type, fn: (item: Item) => Type): Type;
    map_or_else<Type>(err_fn: (err: Error) => Type, fn: (item: Item) => Type): Type;
    map_err<NewError>(fn: (error: Error) => NewError): Result<Item, NewError>;
    map_err_or<Type>(err: Type, fn: (error: Error) => Type): Type;
    map_err_or_else<Type>(err_fn: (item: Item) => Type, fn: (error: Error) => Type): Type;

    and<OtherItem>(other: Result<OtherItem, Error>): Result<OtherItem, Error>;
    and_then<OtherItem>(other_fn: (item: Item) => Result<OtherItem, Error>): Result<OtherItem, Error>;

    or(other: Result<Item, Error>): Result<Item, Error>;
    or_else(other_fn: (err: Error) => Result<Item, Error>): Result<Item, Error>;

    unwrap(): Item;
    unwrap_or(item: Item): Item;
    unwrap_or_else(fn: (err: Error) => Item): Item;
    unwrap_err(): Error;

    then<Type>(fn: (item: Item) => Type, err_fn: (err: Error) => Type): Type;
}

class ResultOk<Item, Error> implements Result<Item, Error> {
    private _: Item;

    constructor(item: Item) {
        this._ = item;
    }

    readonly is_ok: boolean = true;
    readonly is_err: boolean = false;

    ok(): Option<Item> {
        return Some(this._);
    }

    err(): Option<Error> {
        return None();
    }

    map<NewItem>(fn: (item: Item) => NewItem): Result<NewItem, Error> {
        return Ok(fn(this._));
    }

    map_or<Type>(_err: Type, fn: (item: Item) => Type): Type {
        return fn(this._);
    }

    map_or_else<Type>(_err_fn: (err: Error) => Type, fn: (item: Item) => Type): Type {
        return fn(this._);
    }

    map_err<NewError>(fn: (error: Error) => NewError): Result<Item, NewError> {
        return this as any as Result<Item, NewError>;
    }

    map_err_or<Type>(err: Type, _fn: (error: Error) => Type): Type {
        return err;
    }

    map_err_or_else<Type>(err_fn: (item: Item) => Type, _fn: (error: Error) => Type): Type {
        return err_fn(this._);
    }

    and<OtherItem>(other: Result<OtherItem, Error>): Result<OtherItem, Error> {
        return other;
    }

    and_then<OtherItem>(other_fn: (item: Item) => Result<OtherItem, Error>): Result<OtherItem, Error> {
        return other_fn(this._);
    }

    or(_other: Result<Item, Error>): Result<Item, Error> {
        return this;
    }

    or_else(_other_fn: (err: Error) => Result<Item, Error>): Result<Item, Error> {
        return this;
    }

    unwrap(): Item {
        return this._;
    }

    unwrap_or(item: Item): Item {
        return this._;
    }

    unwrap_or_else(_fn: (err: Error) => Item): Item {
        return this._;
    }

    unwrap_err(): Error {
        throw new Error(`Ok result: ${this._}`);
    }

    then<Type>(fn: (item: Item) => Type, _err_fn: (error: Error) => Type): Type {
        return fn(this._);
    }
}

class ResultErr<Item, Error> implements Result<Item, Error> {
    private _: Error;

    constructor(error: Error) {
        this._ = error;
    }

    readonly is_ok: boolean = false;
    readonly is_err: boolean = true;

    ok(): Option<Item> {
        return None();
    }

    err(): Option<Error> {
        return Some(this._);
    }

    map<NewItem>(_fn: (item: Item) => NewItem): Result<NewItem, Error> {
        return this as any as Result<NewItem, Error>;
    }

    map_or<Type>(err: Type, _fn: (item: Item) => Type): Type {
        return err;
    }

    map_or_else<Type>(err_fn: (err: Error) => Type, _fn: (item: Item) => Type): Type {
        return err_fn(this._);
    }

    map_err<NewError>(fn: (error: Error) => NewError): Result<Item, NewError> {
        return Err(fn(this._));
    }

    map_err_or<Type>(_err: Type, fn: (error: Error) => Type): Type {
        return fn(this._);
    }

    map_err_or_else<Type>(_err_fn: (item: Item) => Type, fn: (error: Error) => Type): Type {
        return fn(this._);
    }

    and<OtherItem>(_other: Result<OtherItem, Error>): Result<OtherItem, Error> {
        return this as any as Result<OtherItem, Error>;
    }

    and_then<OtherItem>(_other_fn: (item: Item) => Result<OtherItem, Error>): Result<OtherItem, Error> {
        return this as any as Result<OtherItem, Error>;
    }

    or(other: Result<Item, Error>): Result<Item, Error> {
        return other;
    }

    or_else(other_fn: (err: Error) => Result<Item, Error>): Result<Item, Error> {
        return other_fn(this._);
    }

    unwrap(): Item {
        throw new Error(`Error result: ${this._}`);
    }

    unwrap_or(item: Item): Item {
        return item;
    }

    unwrap_or_else(fn: (err: Error) => Item): Item {
        return fn(this._);
    }

    unwrap_err(): Error {
        return this._;
    }

    then<Type>(_fn: (item: Item) => Type, err_fn: (error: Error) => Type): Type {
        return err_fn(this._);
    }
}

export function Ok<Item, Error>(item: Item): Result<Item, Error> {
    return new ResultOk(item);
}

export function Err<Item, Error>(error: Error): Result<Item, Error> {
    return new ResultErr(error);
}
