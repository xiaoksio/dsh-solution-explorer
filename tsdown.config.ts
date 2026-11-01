/**
 * Build config for dsh-solution-explorer.
 *
 * Emits two artifacts:
 * - lib/index.js   — the node half (host fs/git services), ESM, externalizes
 *                    node builtins and @deepseek-ai packages.
 * - lib/client.js  — the browser half, a closure-factory artifact for the
 *                    GUI's __ModuleLoader__ (CJS with banner/footer/intro).
 * @module dsh-solution-explorer/tsdown
 */
import { defineConfig } from 'tsdown'
import { fileURLToPath } from 'node:url'

const PKG_ID = 'dsh-solution-explorer'

// pptx-preview's uuid build requires `node:crypto` at module scope; the DSH
// module loader has no seed word for it, so it is aliased to a Web Crypto shim.
const CLIENT_ALIAS: Record<string, string> = {
  'node:crypto': fileURLToPath(new URL('./src/client/shims/node-crypto.ts', import.meta.url)),
}

/** Node half: ESM, stays external on node builtins and @deepseek-ai packages. */
const nodeExternal = (specifier: string): boolean =>
  specifier.startsWith('node:') ||
  specifier.startsWith('@deepseek-ai/') ||
  specifier === 'react' || specifier === 'react-dom' || specifier === 'react/jsx-runtime'

export default defineConfig([
  {
    name: 'dsh-solution-explorer/lib',
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    deps: {
      neverBundle: nodeExternal,
      alwaysBundle: (specifier: string) => !nodeExternal(specifier),
    },
    outputOptions: {
      entryFileNames: 'index.js',
    },
  },
  {
    name: 'dsh-solution-explorer/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    // es2022: the Android app WebView can be as old as Chromium 110 — the
    // `Iterator` global (Chrome 122) and later syntax must not leak through.
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: false,
    alias: CLIENT_ALIAS,
    // Bundle only non-shared third-party deps (e.g. highlight.js) into the
    // artifact; keep react and the @deepseek-ai/dsh-client-* packages external —
    // the DSH web shell seeds them through the module table / PLATFORM_MODULES,
    // so official icons & primitives are loaded at runtime, never duplicated.
    deps: {
      neverBundle: (specifier: string) =>
        specifier === 'react' || specifier.startsWith('react/') ||
        specifier === 'react-dom' || specifier.startsWith('react-dom/') ||
        specifier.startsWith('@deepseek-ai/'),
      alwaysBundle: (specifier: string) =>
        specifier !== 'react' && !specifier.startsWith('react/') &&
        specifier !== 'react-dom' && !specifier.startsWith('react-dom/') &&
        !specifier.startsWith('@deepseek-ai/'),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      // One file only: the loader consumes this single closure artifact, so a
      // dynamic import() must not split into sibling chunks — inlined, the
      // omni-doc-viewer modules still execute lazily at their first require.
      inlineDynamicImports: true,
      // Pre-banner shims for WebViews older than the APIs a bundled dependency
      // touches at import time (pdf.js ≥6): the ES2025 `Iterator` global
      // (Chrome 122) and `Promise.withResolvers` (Chrome 119). The Iterator
      // shim must be constructor-like — the dependency reads
      // `Iterator.prototype.join` — so it gets `.prototype` from the real
      // %IteratorPrototype% chain (the same object user iterators inherit).
      banner:
        'if (typeof globalThis.process === "undefined") { globalThis.process = { env: {}, platform: "browser", argv: [] }; }\n'
        + 'if (typeof Promise.try !== "function") { Promise.try = function (fn) { try { return Promise.resolve(fn.apply(undefined, Array.prototype.slice.call(arguments, 1))); } catch (e) { return Promise.reject(e); } }; }\n'
        + 'if (typeof globalThis.Iterator === "undefined") { try { var __iterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())); var __IteratorCtor = function Iterator() { throw new TypeError("Iterator is not callable"); }; __IteratorCtor.prototype = __iterProto; globalThis.Iterator = __IteratorCtor; } catch (e) {} }\n'
        + 'if (typeof Promise.withResolvers !== "function") { Promise.withResolvers = function () { var resolve, reject; var promise = new Promise(function (res, rej) { resolve = res; reject = rej; }); return { promise: promise, resolve: resolve, reject: reject }; }; }\n'
        + `window.__ModuleLoader__.load({ id: ${JSON.stringify(PKG_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
