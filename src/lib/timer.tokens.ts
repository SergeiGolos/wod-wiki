import { Lexer, createToken } from "chevrotain";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});
export const Return = createToken({ name: "Return", pattern: /\r?\n/ })

export const Timer = createToken({ name: "Timer", pattern: /(?::\d+|(?:\d+:){1,3}\d+)/ });

export const Load = createToken({ name: "Load", pattern: /(?:@\s*)?\d+\s*(?:kg|lb)|@\s*\d+/ });

export const Integer = createToken({ name: "Integer", pattern: /\d+/ });
export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
});

export const Comma = createToken({ name: "Comma", pattern: /,/ });

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

export const GroupOpen = createToken({ name: "LabelOpen", pattern: /\(/ });
export const GroupClose = createToken({ name: "LabelClose", pattern: /\)/ });

export const allTokens = [
  Return,
  WhiteSpace,
  // "keywords" appear before the Identifier
  GroupOpen,
  GroupClose,

  Timer,

  CountDirection,
  Minus,
  Plus,
  Comma,

  Timer,
  Load,
  // The Identifier must appear after the keywords because all keywords are valid identifiers.
  Identifier,
  Integer,
];
