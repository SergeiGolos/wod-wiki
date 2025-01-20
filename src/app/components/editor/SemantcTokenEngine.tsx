import { WodWikiToken, WodRuntimeScript } from '@/lib/md-timer';



export class SemantcTokenEngine {
  constructor(public tokens: WodWikiToken[]) {
    for (let token of tokens) {
      this.tokenTypes.push(token.token);
    }
  }

  tokenTypes: string[] = [];
  tokenModifiers = [];
  cache: any = {};
  getType(type: string) {
    return this.tokenTypes.indexOf(type);
  }

  write(code: string, objectCode?: WodRuntimeScript) {
    if (!objectCode || !objectCode.outcome) {
      return this.cache;
    }
    
    // Flatten and sort fragments
    const fragments = (objectCode?.outcome || [])
      .flatMap(row => row.fragments)
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
    console.log(data);
    this.cache = {
      data: new Uint32Array(data),
      resultId: null
    };
    return this.cache;
  }
}
