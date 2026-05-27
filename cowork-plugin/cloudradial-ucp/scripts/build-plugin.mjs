#!/usr/bin/env node
// Build six per-OS .plugin files. Each .plugin contains the bundled MCP server
// plus exactly one platform's native keyring binary.
// Usage:
//   node scripts/build-plugin.mjs              # builds all six
//   node scripts/build-plugin.mjs macos-arm64  # builds just one (artifact tag)
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(PLUGIN_ROOT, "..");
const MCP_PKG = join(REPO_ROOT, "cloudradial-ucp-mcp");

// Maps a user-friendly artifact name (used in the .plugin filename) to the
// @napi-rs/keyring platform-tag (used to pick the right native binary).
const TARGETS = [
  { artifact: "macos-arm64", keyring: "darwin-arm64" },
  { artifact: "macos-x64", keyring: "darwin-x64" },
  { artifact: "windows-x64", keyring: "win32-x64-msvc" },
  { artifact: "windows-arm64", keyring: "win32-arm64-msvc" },
  { artifact: "linux-x64", keyring: "linux-x64-gnu" },
  { artifact: "linux-arm64", keyring: "linux-arm64-gnu" },
];

const requested = process.argv[2];
const targets = requested
  ? TARGETS.filter((t) => t.artifact === requested)
  : TARGETS;

if (requested && targets.length === 0) {
  console.error(
    `Unknown artifact: ${requested}\n` +
      `Valid: ${TARGETS.map((t) => t.artifact).join(", ")}`,
  );
  process.exit(1);
}

const INCLUDE = [
  ".claude-plugin",
  ".mcp.json",
  "DEPLOYMENT.md",
  "README.md",
  "references",
  "server",
  "skills",
];

const EXCLUDE_REL = new Set(["references/swagger.json"]);

const shouldSkip = (relPath) =>
  relPath.endsWith(".DS_Store") || EXCLUDE_REL.has(relPath);

/**
 * Rewrite every Central Directory File Header in the given zip file so its
 * "version made by" upper byte (the create_system field) reads 3 = Unix.
 *
 * ZIP central directory file header layout (PK\1\2 signature, 0x02014b50):
 *   offset  size  field
 *   0       4     signature (0x02014b50)
 *   4       2     version made by (lo = ZIP spec, hi = source OS)  <-- patch hi byte
 *   6       2     version needed to extract
 *   ...
 *
 * We only touch the high byte of the version-made-by field. Everything else
 * (CRC, sizes, offsets, file mode in external_attr) is untouched.
 */
function forceUnixCreateSystem(zipPath) {
  const buf = readFileSync(zipPath);
  const SIG = Buffer.from([0x50, 0x4b, 0x01, 0x02]); // "PK\x01\x02"
  let patched = 0;
  let offset = 0;
  while ((offset = buf.indexOf(SIG, offset)) !== -1) {
    // High byte of "version made by" is at signature + 5
    if (buf[offset + 5] !== 3) {
      buf[offset + 5] = 3; // 3 = Unix
      patched++;
    }
    offset += 4;
  }
  if (patched > 0) {
    writeFileSync(zipPath, buf);
    console.log(`  → patched create_system on ${patched} central directory entries`);
  }
}

const require = createRequire(join(MCP_PKG, "package.json"));

for (const target of targets) {
  console.log(`\n========== Building ${target.artifact} ==========`);

  execFileSync(
    process.execPath,
    [join(__dirname, "build-server.mjs"), target.keyring],
    { stdio: "inherit" },
  );

  // adm-zip is installed by build-server.mjs (it ran npm install in MCP_PKG).
  // require()'d fresh each iteration in case the path resolution caches.
  const AdmZip = require("adm-zip");
  const zip = new AdmZip();

  const walk = (absPath, relPath) => {
    const st = statSync(absPath);
    if (st.isDirectory()) {
      for (const child of readdirSync(absPath)) {
        const childRel = relPath ? posix.join(relPath, child) : child;
        if (shouldSkip(childRel)) continue;
        walk(join(absPath, child), childRel);
      }
    } else if (st.isFile()) {
      if (shouldSkip(relPath)) return;
      zip.addFile(relPath, readFileSync(absPath));
    }
  };

  for (const entry of INCLUDE) {
    const abs = join(PLUGIN_ROOT, entry);
    try {
      statSync(abs);
    } catch {
      continue;
    }
    walk(abs, entry.split(sep).join("/"));
  }

  const artifact = join(
    PLUGIN_ROOT,
    `cloudradial-ucp-${target.artifact}.plugin`,
  );
  rmSync(artifact, { force: true });
  zip.writeZip(artifact);

  // Post-process: rewrite every Central Directory File Header's
  // "version made by" upper byte to 3 (Unix). Without this, the zip claims
  // create_system = 10 (Windows NTFS) while carrying Unix-style mode bits —
  // a combo strict Mac extractors reject with "invalid path". The local file
  // headers don't carry create_system, only the central directory does, so
  // this is a small, safe in-place patch.
  forceUnixCreateSystem(artifact);

  const size = (statSync(artifact).size / 1024 / 1024).toFixed(1);
  console.log(`Built: cloudradial-ucp-${target.artifact}.plugin (${size} MB)`);
}

console.log(`\nDone. ${targets.length} .plugin file(s) built.`);
