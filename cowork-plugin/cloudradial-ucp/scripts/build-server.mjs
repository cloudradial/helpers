#!/usr/bin/env node
// Build the bundled MCP server + one platform's native keyring binary into ./server/.
// Run from the plugin root: node scripts/build-server.mjs <keyring-platform-tag>
// e.g. node scripts/build-server.mjs darwin-arm64
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(PLUGIN_ROOT, "..");
const MCP_PKG = join(REPO_ROOT, "cloudradial-ucp-mcp");
const SERVER_OUT = join(PLUGIN_ROOT, "server");

const KEYRING_VERSION = "1.3.0";
const VALID_PLATFORMS = new Set([
  "darwin-arm64",
  "darwin-x64",
  "win32-x64-msvc",
  "win32-arm64-msvc",
  "linux-x64-gnu",
  "linux-arm64-gnu",
]);

const platform = process.argv[2];
if (!platform || !VALID_PLATFORMS.has(platform)) {
  console.error(
    `Usage: node scripts/build-server.mjs <platform>\n` +
      `  Valid platforms: ${[...VALID_PLATFORMS].join(", ")}`,
  );
  process.exit(1);
}

const sh = (cmd, cwd) => {
  console.log(`\n> (${cwd}) ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
};

sh("npm install", MCP_PKG);
sh("npm run bundle", MCP_PKG);

rmSync(SERVER_OUT, { recursive: true, force: true });
mkdirSync(join(SERVER_OUT, "node_modules", "@napi-rs"), { recursive: true });
cpSync(join(MCP_PKG, "dist-bundle", "index.mjs"), join(SERVER_OUT, "index.mjs"));

// npm pack the keyring wrapper + one platform binary, then extract into
// server/node_modules/@napi-rs/. Using `npm pack` (instead of `npm install`)
// bypasses os/cpu filtering on the platform tarballs.
const stage = join(MCP_PKG, ".plugin-stage");
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const packages = [
  `@napi-rs/keyring@${KEYRING_VERSION}`,
  `@napi-rs/keyring-${platform}@${KEYRING_VERSION}`,
];
for (const spec of packages) {
  sh(`npm pack ${spec} --pack-destination .`, stage);
}

for (const tgz of readdirSync(stage).filter((f) => f.endsWith(".tgz"))) {
  const subdir = tgz.replace(/\.tgz$/, "");
  mkdirSync(join(stage, subdir), { recursive: true });
  // --force-local: stop GNU tar from treating "C:" as a remote host on Windows.
  sh(`tar --force-local -xzf "${tgz}" -C "${subdir}"`, stage);
  const pkgJson = JSON.parse(
    readFileSync(join(stage, subdir, "package", "package.json"), "utf8"),
  );
  const [scope, name] = pkgJson.name.split("/");
  const dest = name
    ? join(SERVER_OUT, "node_modules", scope, name)
    : join(SERVER_OUT, "node_modules", scope);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(stage, subdir, "package"), dest, { recursive: true });
}

rmSync(stage, { recursive: true, force: true });
rmSync(join(MCP_PKG, "dist-bundle"), { recursive: true, force: true });

// ── Un-scope the keyring package ────────────────────────────────────────────
// Cowork's plugin-installer path validator rejects any zip entry whose path
// contains "@" (the npm scope separator). Scoped packages like
// @napi-rs/keyring can't avoid that inside node_modules, so we relocate the
// wrapper to a flat, unscoped path (server/vendor/keyring) and inline its
// native .node binary next to it.
//
// The napi-rs loader tries `require('./keyring.<platform>.node')` BEFORE the
// scoped `@napi-rs/keyring-<platform>` fallback (see the wrapper's index.js),
// so once the binary sits beside the wrapper the scoped platform package is
// never needed and the whole @napi-rs/ directory can be deleted. The bundle's
// single `import { Entry } from "@napi-rs/keyring"` is rewritten to the
// relative vendor path. Result: zero "@" characters in any shipped path.
const napiScope = join(SERVER_OUT, "node_modules", "@napi-rs");
const wrapperSrc = join(napiScope, "keyring");
const platformPkg = join(napiScope, `keyring-${platform}`);
const nodeFile = `keyring.${platform}.node`;
const vendorDir = join(SERVER_OUT, "vendor", "keyring");

if (!existsSync(join(platformPkg, nodeFile))) {
  throw new Error(`Native binary not found where expected: ${join(platformPkg, nodeFile)}`);
}

rmSync(vendorDir, { recursive: true, force: true });
mkdirSync(dirname(vendorDir), { recursive: true });
cpSync(wrapperSrc, vendorDir, { recursive: true });               // wrapper → vendor/keyring
cpSync(join(platformPkg, nodeFile), join(vendorDir, nodeFile));    // inline the .node binary

// Drop the scoped layout (and node_modules if it is now empty).
rmSync(napiScope, { recursive: true, force: true });
const nmDir = join(SERVER_OUT, "node_modules");
if (existsSync(nmDir) && readdirSync(nmDir).length === 0) {
  rmSync(nmDir, { recursive: true, force: true });
}

// Rewrite the one bare scoped import to the relative vendor path.
const indexPath = join(SERVER_OUT, "index.mjs");
const before = readFileSync(indexPath, "utf8");
const after = before.replace(
  /(['"])@napi-rs\/keyring\1/g,
  '"./vendor/keyring/index.js"',
);
if (after === before) {
  throw new Error("Could not find the @napi-rs/keyring import to rewrite in index.mjs");
}
writeFileSync(indexPath, after);
console.log(`Un-scoped keyring → vendor/keyring (binary ${nodeFile}); rewrote bundle import.`);

writeFileSync(
  join(SERVER_OUT, "BUILD_INFO.txt"),
  `Built ${new Date().toISOString()}\nkeyring ${KEYRING_VERSION}\nplatform: ${platform}\n`,
);

console.log(`\nBuilt server for ${platform}: ${SERVER_OUT}`);
