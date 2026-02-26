import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parser } from "../grammar/parser";

export const wodscriptLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Identifier: t.variableName,
        String: t.string,
        Number: t.number,
        Timer: t.keyword,
        collectibleTimer: t.keyword,
        distanceUnit: t.unit,
        weightUnit: t.unit,
        textComment: t.lineComment,
        minus: t.operator,
        plus: t.operator,
        trend: t.operator,
        atSign: t.operator,
        question: t.keyword,
        actionOpen: t.bracket,
        actionClose: t.bracket,
        groupOpen: t.bracket,
        groupClose: t.bracket,
        colon: t.punctuation,
        Property: t.propertyName,
        "Block/Lap": t.keyword,
      })
    ]
  }),
  languageData: {
    commentTokens: { line: "//" }
  }
});

export function wodscript() {
  return new LanguageSupport(wodscriptLanguage);
}
