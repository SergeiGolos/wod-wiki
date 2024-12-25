import { Lexer, createToken } from "chevrotain";

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const Heading = createToken({
  name: "Heading",
  pattern: /#{1,3}/,  
});

export const Paragraph = createToken({
  name: "Paragraph",
  pattern: />/,  
});

export const Return = createToken({ name: "Return", pattern: /\s*\r?\n/ })

export const Timer = createToken({ name: "Timer", pattern: /(?::\d+|(?:\d+:){1,3}\d+)/ });

export const Load = createToken({ name: "Load", pattern: /(?:@\s*)?\d+\s*(?:kg|lb)|@\s*\d+/ });

export const AllowedSymbol = createToken({
  name: "AllowedSymbol",
  pattern: /[\\\/.,@!$%^*=&]+/, // pick up anything that isn't whitespace, a digit, or a "special" character
});

export const QuestionSymbol = createToken({ name: "QuestionSymbol", pattern: /\?/ });

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

export const GroupOpen = createToken({ name: "GroupOpen", pattern: /\(/ });
export const GroupClose = createToken({ name: "GroupClose", pattern: /\)/ });

export const allTokens = [
  Heading,
  Paragraph,
  Return,
  WhiteSpace,
  // "keywords" appear before the Identifier
  GroupOpen,
  GroupClose,
  Comma,

  Timer,
  
  CountDirection,
  Minus,
  Plus,
      
  Load,  
  QuestionSymbol,
  AllowedSymbol,
  Identifier,
  Integer,  
];
