import { Lexer, createToken } from "chevrotain";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});
export const Return = createToken({ name: "Return", pattern: /\r?\n/ })
export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
});

export const Pounds = createToken({ name: "Pounds", pattern: /lb/i });
export const Kelos = createToken({ name: "Pounds", pattern: /kg/i });
export const AtResistance = createToken({ name: "AtResistance", pattern: /@/ });

export const Integer = createToken({ name: "Integer", pattern: /\d+/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });

export const CountDirection = createToken({
  name: "CountDirection",
  pattern: Lexer.NA,
});
export const Minus = createToken({
  name: "Minus",
  pattern: /-/,
  categories: CountDirection,
});
export const Plus = createToken({
  name: "Plus",
  pattern: /\+/,
  categories: CountDirection,
});

export const GroupOpen = createToken({ name: "LabelOpen", pattern: /\[/ });
export const GroupClose = createToken({ name: "LabelClose", pattern: /\]/ });

export const LabelOpen = createToken({ name: "LabelOpen", pattern: /\(/ });
export const LabelClose = createToken({ name: "LabelClose", pattern: /\)/ });

export const allTokens = [
  Return,
  WhiteSpace,
  // "keywords" appear before the Identifier
  GroupOpen,
  GroupClose,

  LabelOpen,
  LabelClose,
  Colon,
  CountDirection,
  Minus,
  Plus,
  Comma,

  // The Identifier must appear after the keywords because all keywords are valid identifiers.
  Identifier,
  Integer,
];
