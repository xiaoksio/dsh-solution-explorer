/**
 * Legacy WebView polyfills — one source, two consumers.
 *
 * The side effects run at client boot (this module is the client entry's
 * first import, so every statement executes before any dependency's module
 * body). The exported POLYFILL_SOURCE is the same JavaScript as a string,
 * prepended to the pdf.js worker Blob, because a Blob worker never sees the
 * client bundle.
 *
 * Covered APIs, by the oldest engine this plugin must boot on (Chromium 110,
 * the MuMu-class Android WebViews) up through the pdf.js 6.3 requirements:
 * - `process` — pptx-preview's platform probes read it at render time.
 * - `Promise.withResolvers` (Chrome 119) — pdf.js and friends.
 * - `Promise.try` (Chrome 128) — pdf.js worker handshake.
 * - `Iterator` (Chrome 122) — pdf.js module scope; must be constructor-like
 *   with the real %IteratorPrototype% so `Iterator.prototype.join` reads.
 * - `Uint8Array.prototype.toHex/toBase64` + statics (Chrome 129) — pdf.js
 *   request encoding.
 * @module dsh-solution-explorer/client/shims/legacy-polyfills
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Worker-safe polyfill source (no `process` — workers have no platform probes here). */
export const POLYFILL_SOURCE = [
  'if (typeof Promise.withResolvers !== "function") { Promise.withResolvers = function () { var resolve, reject; var promise = new Promise(function (res, rej) { resolve = res; reject = rej; }); return { promise: promise, resolve: resolve, reject: reject }; }; }\n',
  'if (typeof Promise.try !== "function") { Promise.try = function (fn) { try { return Promise.resolve(fn.apply(undefined, Array.prototype.slice.call(arguments, 1))); } catch (e) { return Promise.reject(e); } }; }\n',
  'if (typeof globalThis.Iterator === "undefined") { try { var __iterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())); var __IteratorCtor = function Iterator() { throw new TypeError("Iterator is not callable"); }; __IteratorCtor.prototype = __iterProto; globalThis.Iterator = __IteratorCtor; } catch (e) {} }\n',
  'if (typeof Map.prototype.getOrInsert !== "function") { Map.prototype.getOrInsert = function (key, value) { if (this.has(key)) return this.get(key); this.set(key, value); return value; }; }\n',
  'if (typeof Map.prototype.getOrInsertComputed !== "function") { Map.prototype.getOrInsertComputed = function (key, cb) { if (this.has(key)) return this.get(key); var v = cb(key); this.set(key, v); return v; }; }\n',
  'if (typeof Uint8Array.prototype.toHex !== "function") { Uint8Array.prototype.toHex = function () { var o = ""; for (var i = 0; i < this.length; i++) o += this[i].toString(16).padStart(2, "0"); return o; }; }\n',
  'if (typeof Uint8Array.fromHex !== "function") { Uint8Array.fromHex = function (s) { var a = new Uint8Array(s.length >> 1); for (var i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; }; }\n',
  'if (typeof Uint8Array.prototype.toBase64 !== "function") { Uint8Array.prototype.toBase64 = function () { var o = ""; for (var i = 0; i < this.length; i++) o += String.fromCharCode(this[i]); return btoa(o); }; }\n',
  'if (typeof Uint8Array.fromBase64 !== "function") { Uint8Array.fromBase64 = function (s) { var b = atob(s); var a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }; }\n',
].join("");

// --- the same polyfills as live side effects, plus `process` ---

const g = globalThis as any;

if (typeof g.process === "undefined") {
  g.process = { env: {}, platform: "browser", argv: [] };
}

if (typeof (Promise as any).withResolvers !== "function") {
  (Promise as any).withResolvers = function () {
    let resolve: (v: unknown) => void;
    let reject: (e: unknown) => void;
    const promise = new Promise<void>((res, rej) => { resolve = res as (v: unknown) => void; reject = rej; });
    return { promise, resolve, reject };
  };
}

if (typeof (Promise as any).try !== "function") {
  (Promise as any).try = function (fn: () => unknown, ...args: unknown[]): Promise<unknown> {
    try {
      return Promise.resolve((fn as (...a: unknown[]) => unknown).apply(undefined, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

if (typeof g.Iterator === "undefined") {
  try {
    const iterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
    const IteratorCtor = function Iterator() {
      throw new TypeError("Iterator is not callable");
    } as unknown as new () => object;
    (IteratorCtor as any).prototype = iterProto;
    g.Iterator = IteratorCtor;
  } catch {
    // Iterator stays missing; the API surface that reads it will fail loudly.
  }
}

if (typeof (Map.prototype as any).getOrInsert !== "function") {
  (Map.prototype as any).getOrInsert = function (key: unknown, value: unknown): unknown {
    if (this.has(key)) return this.get(key);
    this.set(key, value);
    return value;
  };
}

if (typeof (Map.prototype as any).getOrInsertComputed !== "function") {
  (Map.prototype as any).getOrInsertComputed = function (key: unknown, cb: (k: unknown) => unknown): unknown {
    if (this.has(key)) return this.get(key);
    const value = cb(key);
    this.set(key, value);
    return value;
  };
}

if (typeof (Uint8Array.prototype as any).toHex !== "function") {
  (Uint8Array.prototype as any).toHex = function (this: Uint8Array): string {
    let out = "";
    for (let i = 0; i < this.length; i += 1) out += this[i].toString(16).padStart(2, "0");
    return out;
  };
}

if (typeof (Uint8Array as any).fromHex !== "function") {
  (Uint8Array as any).fromHex = function (s: string): Uint8Array {
    const out = new Uint8Array(s.length >> 1);
    for (let i = 0; i < out.length; i += 1) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  };
}

if (typeof (Uint8Array.prototype as any).toBase64 !== "function") {
  (Uint8Array.prototype as any).toBase64 = function (this: Uint8Array): string {
    let out = "";
    for (let i = 0; i < this.length; i += 1) out += String.fromCharCode(this[i]);
    return btoa(out);
  };
}

if (typeof (Uint8Array as any).fromBase64 !== "function") {
  (Uint8Array as any).fromBase64 = function (s: string): Uint8Array {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  };
}
