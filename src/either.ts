import { Option, Some, None } from './option';
import { Result, Ok, Err } from './result';

export interface Either<ItemA, ItemB> {
  is_a: boolean;
  is_b: boolean;

  a(): Option<ItemA>;
  a_or<Error>(err: Error): Result<ItemA, Error>;
  a_or_else<Error>(fn: (item: ItemB) => Error): Result<ItemA, Error>;

  b(): Option<ItemB>;
  b_or<Error>(err: Error): Result<ItemB, Error>;
  b_or_else<Error>(fn: (item: ItemA) => Error): Result<ItemB, Error>;

  map_a<NewItemA>(fn: (item: ItemA) => NewItemA): Either<NewItemA, ItemB>;
  map_a_or<Type>(b: Type, fn: (item: ItemA) => Type): Type;
  map_a_or_else<Type>(b_fn: (item: ItemB) => Type, fn: (item: ItemA) => Type): Type;

  map_b<NewItemB>(fn: (item: ItemB) => NewItemB): Either<ItemA, NewItemB>;
  map_b_or<Type>(a: Type, fn: (item: ItemB) => Type): Type;
  map_b_or_else<Type>(a_fn: (item: ItemA) => Type, fn: (item: ItemB) => Type): Type;

  unwrap_a(): ItemA;
  unwrap_a_or(item: ItemA): ItemA;
  unwrap_a_or_else(fn: (item: ItemB) => ItemA): ItemA;

  unwrap_b(): ItemB;
  unwrap_b_or(item: ItemB): ItemB;
  unwrap_b_or_else(fn: (item: ItemA) => ItemB): ItemB;

  swap(): Either<ItemB, ItemA>;

  then<Type>(fn_a: (item: ItemA) => Type, fn_b: (item: ItemB) => Type): Type;
}

class EitherA<ItemA, ItemB> implements Either<ItemA, ItemB> {
  private _: ItemA;

  constructor(item: ItemA) {
    this._ = item;
  }

  readonly is_a: boolean = true;
  readonly is_b: boolean = false;

  a(): Option<ItemA> {
    return Some(this._);
  }

  a_or<Error>(_err: Error): Result<ItemA, Error> {
    return Ok(this._);
  }

  a_or_else<Error>(_fn: (item: ItemB) => Error): Result<ItemA, Error> {
    return Ok(this._);
  }

  b(): Option<ItemB> {
    return None();
  }

  b_or<Error>(err: Error): Result<ItemB, Error> {
    return Err(err);
  }

  b_or_else<Error>(fn: (item: ItemA) => Error): Result<ItemB, Error> {
    return Err(fn(this._));
  }

  map_a<NewItemA>(fn: (item: ItemA) => NewItemA): Either<NewItemA, ItemB> {
    return A(fn(this._));
  }

  map_a_or<Type>(_b: Type, fn: (item: ItemA) => Type): Type {
    return fn(this._);
  }

  map_a_or_else<Type>(_b_fn: (item: ItemB) => Type, fn: (item: ItemA) => Type): Type {
    return fn(this._);
  }

  map_b<NewItemB>(fn: (item: ItemB) => NewItemB): Either<ItemA, NewItemB> {
    return this as any as Either<ItemA, NewItemB>;
  }

  map_b_or<Type>(a: Type, _fn: (item: ItemB) => Type): Type {
    return a;
  }

  map_b_or_else<Type>(a_fn: (item: ItemA) => Type, _fn: (item: ItemB) => Type): Type {
    return a_fn(this._);
  }

  unwrap_a(): ItemA {
    return this._;
  }

  unwrap_a_or(_item: ItemA): ItemA {
    return this._;
  }

  unwrap_a_or_else(_fn: (item: ItemB) => ItemA): ItemA {
    return this._;
  }

  unwrap_b(): ItemB {
    throw new Error(`It is A: ${this._}`);
  }

  unwrap_b_or(item: ItemB): ItemB {
    return item;
  }

  unwrap_b_or_else(fn: (item: ItemA) => ItemB): ItemB {
    return fn(this._);
  }

  swap(): Either<ItemB, ItemA> {
    return B(this._);
  }

  then<Type>(fn_a: (item: ItemA) => Type, _fn_b: (error: ItemB) => Type): Type {
    return fn_a(this._);
  }
}

class EitherB<ItemA, ItemB> implements Either<ItemA, ItemB> {
  private _: ItemB;

  constructor(item: ItemB) {
    this._ = item;
  }

  readonly is_a: boolean = false;
  readonly is_b: boolean = true;

  a(): Option<ItemA> {
    return None();
  }

  a_or<Error>(err: Error): Result<ItemA, Error> {
    return Err(err);
  }

  a_or_else<Error>(fn: (item: ItemB) => Error): Result<ItemA, Error> {
    return Err(fn(this._));
  }

  b(): Option<ItemB> {
    return Some(this._);
  }

  b_or<Error>(_err: Error): Result<ItemB, Error> {
    return Ok(this._);
  }

  b_or_else<Error>(fn: (item: ItemA) => Error): Result<ItemB, Error> {
    return Ok(this._);
  }

  map_a<NewItemA>(fn: (item: ItemA) => NewItemA): Either<NewItemA, ItemB> {
    return B(this._);
  }

  map_a_or<Type>(b: Type, _fn: (item: ItemA) => Type): Type {
    return b;
  }

  map_a_or_else<Type>(b_fn: (item: ItemB) => Type, _fn: (item: ItemA) => Type): Type {
    return b_fn(this._);
  }

  map_b<NewItemB>(fn: (item: ItemB) => NewItemB): Either<ItemA, NewItemB> {
    return B(fn(this._));
  }

  map_b_or<Type>(_a: Type, fn: (item: ItemB) => Type): Type {
    return fn(this._);
  }

  map_b_or_else<Type>(_a_fn: (item: ItemA) => Type, fn: (item: ItemB) => Type): Type {
    return fn(this._);
  }

  unwrap_a(): ItemA {
    throw new Error(`It is B: ${this._}`);
  }

  unwrap_a_or(item: ItemA): ItemA {
    return item;
  }

  unwrap_a_or_else(fn: (item: ItemB) => ItemA): ItemA {
    return fn(this._);
  }

  unwrap_b(): ItemB {
    return this._;
  }

  unwrap_b_or(_item: ItemB): ItemB {
    return this._;
  }

  unwrap_b_or_else(_fn: (item: ItemA) => ItemB): ItemB {
    return this._;
  }

  swap(): Either<ItemB, ItemA> {
    return A(this._);
  }

  then<Type>(_fn_a: (item: ItemA) => Type, fn_b: (error: ItemB) => Type): Type {
    return fn_b(this._);
  }
}

export function A<ItemA, ItemB>(item: ItemA): Either<ItemA, ItemB> {
  return new EitherA(item);
}

export function B<ItemA, ItemB>(item: ItemB): Either<ItemA, ItemB> {
  return new EitherB(item);
}
