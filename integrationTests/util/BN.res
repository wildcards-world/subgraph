type t

@module("bn.js") external max: (t, t) => t = "max"
@module("bn.js") external min: (t, t) => t = "min"

@send external add: (t, t) => t = "add"
@send external sub: (t, t) => t = "sub"
@send external mul: (t, t) => t = "mul"
@send external div: (t, t) => t = "div"

@send external cmp: (t, t) => int = "cmp"

@send external sqr: t => t = "sqr"

@send external gt: (t, t) => bool = "gt"
@send external lt: (t, t) => bool = "lt"
@send external lte: (t, t) => bool = "lte"
@send external eq: (t, t) => bool = "eq"

@send external toNumber: t => int = "toNumber"
@send external toNumberFloat: t => float = "toNumber"
@send external toString: t => string = "toString"

@new @module external new_: string => t = "bn.js"
@new @module external newInt_: int => t = "bn.js"
