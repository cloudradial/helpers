#!/usr/bin/env node
/*
 * Bootstrap for the CloudRadial UCP MCP server.
 *
 * On first run, npm-installs production dependencies into this directory,
 * then spawns dist/index.js with inherited stdio so MCP JSON-RPC flows
 * unchanged through the child process.
 *
 * stderr is used for any bootstrap messages (the MCP protocol owns stdout).
 */
const { spawnSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const HERE = __dirname;
const NODE_MODULES = path.join(HERE, "node_modules");
const ENTRY = path.join(HERE, "dist", "index.js");
const MARKER = path.join(HERE, ".install-complete");

function log(msg) {
  process.stderr.write(`[cloudradial-ucp-mcp] ${msg}\n`);
}

function npmInstall() {
  log("First run: installing dependencies (one-time, ~10 seconds)...");
  // shell:true so `npm` resolves on Windows (npm.cmd) and Unix alike.
  const result = spawnSync(
    "npm install --omit=dev --ignore-scripts --no-audit --no-fund --prefer-offline --loglevel=error",
    {
      cwd: HERE,
      stdio: ["ignore", "inherit", "inherit"],
      shell: true,
    }
  );
  if (result.status !== 0) {
    log(`npm install failed (exit ${result.status}). Try running manually:`);
    log(`  cd "${HERE}" && npm install --omit=dev`);
    process.exit(result.status || 1);
  }
  fs.writeFileSync(MARKER, new Date().toISOString());
  log("Dependencies installed.");
}

if (!fs.existsSync(NODE_MODULES) || !fs.existsSync(MARKER)) {
  npmInstall();
}

if (!fs.existsSync(ENTRY)) {
  log(`Built entry not found at ${ENTRY}. The plugin bundle may be incomplete.`);
  process.exit(1);
}

const child = spawn(process.execPath, [ENTRY], {
  cwd: HERE,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => { try { child.kill(sig); } catch {} });
}
