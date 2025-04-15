import pako from "pako";
import { Base64 } from "js-base64";

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
