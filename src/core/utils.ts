import { CodeFragment } from "./CodeFragment";
import { ICodeStatement } from "./CodeStatement";
import pako from "pako";
import { Base64 } from "js-base64";

export const cn = (...args: string[]) => args.filter(Boolean).join(' ');

/**
 * Helper function to extract a specific fragment type from a statement
 */

export function fragmentsToMany<T extends CodeFragment>(
  statements: ICodeStatement[],
  type: string
): T[] {
  const fragments: T[] = [];
  for (let statement of statements) {
    const fragment = statement.fragments.filter((f) => f.type === type);
    if (fragment) {
      fragments.push(...fragment as T[]);
    }
  }
  return fragments;
}


/**
 * Compress and encode a string to base64 (for URL sharing)
 */
export function encodeShareString(raw: string): string {
  const compressed = pako.deflate(raw, { to: "string" });
  return Base64.fromUint8Array(compressed, true);
}

/**
 * Decode and decompress a base64 string from URL
 */
export function decodeShareString(encoded: string): string {
  const compressed = Base64.toUint8Array(encoded);
  return pako.inflate(compressed, { to: "string" });
}


export function fragmentsTo<T extends CodeFragment>(
  statements: ICodeStatement[],
  type: string
): T | undefined {
  for (let statement of statements){ 
    const fragment = statement.fragments.find((f) => f.type === type);
    if  (fragment) {
      return fragment as T;
    }
  }  
}

export function fragmentTo<T extends CodeFragment>(
  statement: ICodeStatement,
  type: string
): T | undefined {
  const fragment = statement.fragments.find((f) => f.type === type);
  return fragment as T;
}