#!/usr/bin/env node
import { build } from "esbuild";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const outDir = resolve(root, "dist");
mkdirSync(outDir, { recursive: true });

const banner = {
  js: `/*! ${pkg.name} v${pkg.version} | ${pkg.license ?? "MIT"} License */`,
};

const common = {
  entryPoints: [resolve(root, "src/index.ts")],
  bundle: true,
  format: "iife",
  globalName: "DomCritique",
  target: ["es2020"],
  platform: "browser",
  legalComments: "none",
  logLevel: "info",
  banner,
};

await Promise.all([
  build({
    ...common,
    outfile: resolve(outDir, "dom-critique.global.js"),
    minify: false,
    sourcemap: true,
  }),
  build({
    ...common,
    outfile: resolve(outDir, "dom-critique.global.min.js"),
    minify: true,
    sourcemap: true,
  }),
]);

console.log("\nBundle built:");
console.log("  dist/dom-critique.global.js     (development, with sourcemap)");
console.log("  dist/dom-critique.global.min.js (minified, with sourcemap)");
