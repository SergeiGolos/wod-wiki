
export interface ICodeMetadata {
  line: number;
  startOffset: number;
  endOffset: number;
  columnStart: number;
  columnEnd: number;
  length: number;
}

export class CodeMetadata implements ICodeMetadata {
    constructor(
        public line: number,
        public startOffset: number,
        public endOffset: number,
        public length: number,
        public columnStart: number = 0,
        public columnEnd: number = 0
    ) {}
}
