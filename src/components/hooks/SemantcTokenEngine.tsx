import { WodRuntimeScript, WodWikiToken } from "@/core/parser/md-timer";

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

  write(code: string, objectCode?: WodRuntimeScript) {
    if (!objectCode || !objectCode.statements) {
      return this.cache;
    }

    // Flatten and sort fragments
    const fragments = (objectCode?.statements || [])
      .flatMap(row => row.fragments.sort((a: any, b: any) => a.meta!.columnStart - b.meta!.columnStart))
      .filter(f => f.meta);

    // Track 'previous' positions for delta calculations
    let prevLine = 0;
    let prevCol = 0;
    const data: number[] = [];

    for (const fragment of fragments) {

      const zeroBasedLine = fragment.meta!.line - 1;
      const zeroBasedCol = fragment.meta!.columnStart - 1;

      // Calculate deltas
      const deltaLine = zeroBasedLine - prevLine;
      const deltaCol = zeroBasedLine === prevLine
        ? zeroBasedCol - prevCol
        : zeroBasedCol;

      const type = this.getType(fragment.type);
      data.push(
        deltaLine,
        deltaCol,
        fragment.meta!.length + 1,
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
