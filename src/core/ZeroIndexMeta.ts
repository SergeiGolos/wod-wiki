import { CodeMetadata } from "./types/CodeMetadata";


export class ZeroIndexMeta implements CodeMetadata {
  line = 0;
  startOffset = 0;
  endOffset = 0;
  columnStart = 0;
  columnEnd = 0;
  length = 0;
}
