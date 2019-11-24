// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  TypedMap,
  Entity,
  Value,
  ValueKind,
  store,
  Address,
  Bytes,
  BigInt,
  BigDecimal
} from "@graphprotocol/graph-ts";

export class Tester extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Tester entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Tester entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Tester", id.toString(), this);
  }

  static load(id: string): Tester | null {
    return store.get("Tester", id) as Tester | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get eventTimeStamp(): BigInt {
    let value = this.get("eventTimeStamp");
    return value.toBigInt();
  }

  set eventTimeStamp(value: BigInt) {
    this.set("eventTimeStamp", Value.fromBigInt(value));
  }

  get timeAcquired0(): BigInt {
    let value = this.get("timeAcquired0");
    return value.toBigInt();
  }

  set timeAcquired0(value: BigInt) {
    this.set("timeAcquired0", Value.fromBigInt(value));
  }

  get timeAcquired1(): BigInt {
    let value = this.get("timeAcquired1");
    return value.toBigInt();
  }

  set timeAcquired1(value: BigInt) {
    this.set("timeAcquired1", Value.fromBigInt(value));
  }
}

export class Wildcard extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Wildcard entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Wildcard entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Wildcard", id.toString(), this);
  }

  static load(id: string): Wildcard | null {
    return store.get("Wildcard", id) as Wildcard | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get tokenId(): BigInt {
    let value = this.get("tokenId");
    return value.toBigInt();
  }

  set tokenId(value: BigInt) {
    this.set("tokenId", Value.fromBigInt(value));
  }

  get price(): BigInt {
    let value = this.get("price");
    return value.toBigInt();
  }

  set price(value: BigInt) {
    this.set("price", Value.fromBigInt(value));
  }

  get owner(): Bytes {
    let value = this.get("owner");
    return value.toBytes();
  }

  set owner(value: Bytes) {
    this.set("owner", Value.fromBytes(value));
  }

  get patronageNumerator(): BigInt {
    let value = this.get("patronageNumerator");
    return value.toBigInt();
  }

  set patronageNumerator(value: BigInt) {
    this.set("patronageNumerator", Value.fromBigInt(value));
  }

  get timeAcquired(): BigInt {
    let value = this.get("timeAcquired");
    return value.toBigInt();
  }

  set timeAcquired(value: BigInt) {
    this.set("timeAcquired", Value.fromBigInt(value));
  }
}

export class Patron extends Entity {
  constructor(id: string) {
    super();
    this.set("id", Value.fromString(id));
  }

  save(): void {
    let id = this.get("id");
    assert(id !== null, "Cannot save Patron entity without an ID");
    assert(
      id.kind == ValueKind.STRING,
      "Cannot save Patron entity with non-string ID. " +
        'Considering using .toHex() to convert the "id" to a string.'
    );
    store.set("Patron", id.toString(), this);
  }

  static load(id: string): Patron | null {
    return store.get("Patron", id) as Patron | null;
  }

  get id(): string {
    let value = this.get("id");
    return value.toString();
  }

  set id(value: string) {
    this.set("id", Value.fromString(value));
  }

  get address(): Bytes {
    let value = this.get("address");
    return value.toBytes();
  }

  set address(value: Bytes) {
    this.set("address", Value.fromBytes(value));
  }

  get tokens(): Array<string> | null {
    let value = this.get("tokens");
    if (value === null) {
      return null;
    } else {
      return value.toStringArray();
    }
  }

  set tokens(value: Array<string> | null) {
    if (value === null) {
      this.unset("tokens");
    } else {
      this.set("tokens", Value.fromStringArray(value as Array<string>));
    }
  }

  get deposit(): BigInt {
    let value = this.get("deposit");
    return value.toBigInt();
  }

  set deposit(value: BigInt) {
    this.set("deposit", Value.fromBigInt(value));
  }
}