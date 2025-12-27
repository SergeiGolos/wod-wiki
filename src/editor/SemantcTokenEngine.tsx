import type { IScript } from "@/parser/WodScript";
import { WodWikiToken } from "./WodWiki";


export class SemantcTokenEngine {
  constructor(public tokens: WodWikiToken[]) {
    for (let token of tokens) {
      this.tokenTypes.push(token.token);
    }
  }

  tokenTypes: string[] = [];
  tokenModifiers = [];
  cache: {
    data?: Uint32Array,
    resultId?: string | undefined
  } = {};
  getType(type: string) {
    return this.tokenTypes.indexOf(type);
  }

  write(_code: string, objectCode?: IScript) {
    if (!objectCode || !objectCode.statements) {
      return this.cache;
    }

    // Fragment type with proper meta structure
    interface FragmentMeta {
      line: number;
      columnStart: number;
      length: number;
    }
    interface FragmentWithMeta {
      meta?: FragmentMeta;
      type: string;
    }

    // Flatten and sort fragments
    const fragments = (objectCode?.statements || [])
      .flatMap((row: { fragments: FragmentWithMeta[] }) => 
        row.fragments.sort((a: FragmentWithMeta, b: FragmentWithMeta) => (a.meta?.columnStart ?? 0) - (b.meta?.columnStart ?? 0))
      )
      .filter((f: FragmentWithMeta): f is FragmentWithMeta & { meta: FragmentMeta } => f.meta != null);

    // Track 'previous' positions for delta calculations
    let prevLine = 0;
    let prevCol = 0;
    const data: number[] = [];

    for (const fragment of fragments) {

      const zeroBasedLine = fragment.meta.line - 1;
      const zeroBasedCol = fragment.meta.columnStart - 1;

      // Calculate deltas
      const deltaLine = zeroBasedLine - prevLine;
      const deltaCol = zeroBasedLine === prevLine
        ? zeroBasedCol - prevCol
        : zeroBasedCol;

      const type = this.getType(fragment.type);
      data.push(
        deltaLine,
        deltaCol,
        fragment.meta.length + 1,
        type,
        0
      );

      prevLine = zeroBasedLine;
      prevCol = zeroBasedCol;
    }
    this.cache = {
      data: new Uint32Array(data),
      resultId: undefined
    };
    return this.cache;
  }
}
