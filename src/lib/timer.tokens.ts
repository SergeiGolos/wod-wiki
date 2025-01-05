import { Lexer, createToken } from "chevrotain";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const Return = createToken({
  name: "Return",
  pattern: /\s*\r?\n/,
});

export const Minus = createToken({
  name: "Minus",
  pattern: /\-/,
});

export const Timer = createToken({
  name: "Timer",
  pattern: /(?::\d+|(?:\d+:){1,3}\d+)/,
});

export const Load = createToken({
  name: "Load",
  pattern: /(?:@\s*)?\d*\.?\d+\s*(?:kg|lb|BW)|@\s*\d+/,
});

export const AllowedSymbol = createToken({
  name: "AllowedSymbol",
  pattern: /[\\\/.,@!$%^*=&]+/,
  // pick up anything that isn't whitespace, a digit, or a "special" character
});

export const QuestionSymbol = createToken({
  name: "QuestionSymbol",
  pattern: /\?/,
});

export const Number = createToken({
  name: "Number",
  pattern: /\d*\.?\d+/,
});

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
});

export const Comma = createToken({
  name: "Comma",
  pattern: /,/,
});

export const Trend = createToken({
  name: "Trend",
  pattern: Lexer.NA,
});

export const Plus = createToken({
  name: "Plus",
  pattern: /\^/,
  categories: Trend,
});

export const GroupOpen = createToken({
  name: "GroupOpen",
  pattern: /\(/,
});
export const GroupClose = createToken({
  name: "GroupClose",
  pattern: /\)/,
});

export const allTokens = [  
  Return,
  WhiteSpace,
  // "keywords" appear before the Identifier
  GroupOpen,
  GroupClose,
  Comma,

  Timer,
  Trend,    
  Plus,
  Minus,
  Load,
  QuestionSymbol,
  AllowedSymbol,
  Identifier,
  Number,
];
