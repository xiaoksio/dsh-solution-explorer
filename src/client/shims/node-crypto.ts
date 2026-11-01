/**
 * Browser stand-in for the `node:crypto` requires that slip in through
 * pptx-preview's uuid build (its node variant wants randomBytes at module
 * scope, which the DSH module table has no seed word for). Only what uuid
 * touches is provided: randomBytes delegates to the platform
 * crypto.getRandomValues; hashing is never called in this bundle.
 * @module dsh-solution-explorer/client/shims/node-crypto
 */

/** The platform Web Crypto — available in every WebView this plugin boots on. */
const platformCrypto = globalThis.crypto as Crypto;

/**
 * Fill a buffer with cryptographically random bytes.
 * @param size - how many bytes to produce.
 * @returns the random bytes.
 */
export function randomBytes(size: number): Uint8Array {
  const out = new Uint8Array(size);
  platformCrypto.getRandomValues(out);
  return out;
}

/**
 * In-place random fill (uuid's node build calls this for v4 ids).
 * @param buffer - the buffer to fill.
 * @returns the same buffer, filled.
 */
export function randomFillSync(buffer: Uint8Array): Uint8Array {
  platformCrypto.getRandomValues(buffer);
  return buffer;
}

/** Callback variant of randomFillSync; the callback fires asynchronously. */
export function randomFill(buffer: Uint8Array, cb: (err: Error | null, buf: Uint8Array) => void): Uint8Array {
  platformCrypto.getRandomValues(buffer);
  setTimeout(() => cb(null, buffer), 0);
  return buffer;
}

/**
 * Hash digests do not exist here: uuid only reaches createHash for the v3/v5
 * namespace forms, which pptx-preview does not use.
 */
export function createHash(): never {
  throw new Error("node:crypto createHash is unavailable in the browser");
}

const nodeCrypto = { randomBytes, randomFillSync, randomFill, createHash };
export default nodeCrypto;
