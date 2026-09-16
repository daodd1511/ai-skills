#!/usr/bin/env node
// Render a built page in headless Chrome at desktop and phone widths, report the
// collision check the graph runtime writes into the page, and save full-page
// screenshots with issues outlined in red.
//
// Usage: node check.mjs <page.html> [--out <dir>]
// Exit: 0 clean (warnings may print), 1 errors found, 2 usage or Chrome unavailable.
// Set CHROME_PATH to override Chrome discovery. Requires Node 22+ (global WebSocket).

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const WIDTHS = [1280, 400];
const RESULT_TIMEOUT_MS = 8000;
const TOTAL_TIMEOUT_MS = 90000;
const CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

function parseArgs(argv) {
  const out = { file: null, outDir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out.outDir = argv[++i];
    else if (!out.file) out.file = argv[i];
  }
  return out;
}

function launch(bin, profile) {
  const proc = spawn(bin, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0",
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const endpoint = new Promise((resolveUrl, reject) => {
    let buf = "";
    proc.stderr.on("data", (chunk) => {
      buf += chunk;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolveUrl(m[1]);
    });
    proc.on("exit", (code) => reject(new Error(`Chrome exited (${code}) before DevTools was ready`)));
    proc.on("error", reject);
  });
  return { proc, endpoint };
}

function connect(url) {
  return new Promise((resolveConn, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    const listeners = new Set();
    let nextId = 0;
    ws.onerror = () => reject(new Error(`cannot connect to ${url}`));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { ok, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) fail(new Error(msg.error.message));
        else ok(msg.result);
      } else for (const l of listeners) l(msg);
    };
    ws.onopen = () => resolveConn({
      send(method, params = {}, sessionId) {
        return new Promise((ok, fail) => {
          const id = ++nextId;
          pending.set(id, { ok, fail });
          ws.send(JSON.stringify({ id, method, params, sessionId }));
        });
      },
      once(method) {
        return new Promise((ok) => {
          const l = (msg) => {
            if (msg.method === method) {
              listeners.delete(l);
              ok(msg.params);
            }
          };
          listeners.add(l);
        });
      },
      close: () => ws.close(),
    });
  });
}

async function inspect(cdp, session, url, width) {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 }, session);
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url }, session);
  await loaded;
  const deadline = Date.now() + RESULT_TIMEOUT_MS;
  let raw = null;
  while (!raw && Date.now() < deadline) {
    const { result } = await cdp.send("Runtime.evaluate", { expression: 'document.documentElement.getAttribute("data-vg-check")', returnByValue: true }, session);
    raw = result.value;
    if (!raw) await new Promise((r) => setTimeout(r, 100));
  }
  if (!raw) return null;
  const report = JSON.parse(raw);
  const height = Math.min(Math.max(report.pageHeight, 600), 16000);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } }, session);
  return { report, png: Buffer.from(shot.data, "base64") };
}

function print(width, report, shotPath) {
  let errors = 0;
  console.log(`[${width}px] screenshot: ${shotPath}`);
  if (report.pageOverflowX) {
    console.log(`  error page-overflow-x: the page scrolls horizontally at ${width}px`);
    errors++;
  }
  for (const fig of report.figures) {
    const label = `diagram ${fig.index + 1}${fig.title ? ` ("${fig.title}")` : ""}${fig.type ? ` ${fig.type}` : ""}`;
    const layout = fig.width ? ` ${fig.width}x${fig.height}, ${fig.direction}${fig.scrolls ? ", scrolls inside its frame" : ""}` : "";
    console.log(`  ${label}:${layout}`);
    for (const e of fig.errors) console.log(`    error ${e.rule}: ${e.detail}`);
    for (const w of fig.warnings) console.log(`    warning ${w.rule}: ${w.detail}`);
    if (!fig.errors.length && !fig.warnings.length) console.log("    clean");
    errors += fig.errors.length;
  }
  return errors;
}

async function main() {
  const { file, outDir: outArg } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error("usage: node check.mjs <page.html> [--out <dir>]");
    return 2;
  }
  const bin = CANDIDATES.find((p) => p && existsSync(p));
  if (!bin) {
    console.error("error: Chrome not found; set CHROME_PATH");
    return 2;
  }
  const page = resolve(file);
  const name = basename(page).replace(/\.html?$/i, "");
  const outDir = outArg ? resolve(outArg) : join(tmpdir(), `visualize-check-${name}`);
  mkdirSync(outDir, { recursive: true });
  const url = `${pathToFileURL(page).href}?vg-check=1`;

  const profile = mkdtempSync(join(tmpdir(), "visualize-chrome-"));
  const { proc, endpoint } = launch(bin, profile);
  const killer = setTimeout(() => {
    console.error("error: check timed out");
    proc.kill("SIGKILL");
    process.exit(2);
  }, TOTAL_TIMEOUT_MS);

  let errors = 0;
  try {
    const cdp = await connect(await endpoint);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    for (const width of WIDTHS) {
      const result = await inspect(cdp, sessionId, url, width);
      if (!result) {
        console.log(`[${width}px] error: no check result in page; run build.mjs first, or the runtime failed to load`);
        errors++;
        continue;
      }
      const shotPath = join(outDir, `${name}-${width}.png`);
      writeFileSync(shotPath, result.png);
      errors += print(width, result.report, shotPath);
    }
    cdp.close();
  } finally {
    clearTimeout(killer);
    const exited = new Promise((r) => proc.once("exit", r));
    proc.kill();
    await exited;
    rmSync(profile, { recursive: true, force: true });
  }
  console.log(errors ? `check failed: ${errors} error(s); issues are outlined in red in the screenshots` : "check passed");
  return errors ? 1 : 0;
}

main().then((code) => process.exit(code), (err) => {
  console.error(`error: ${err.message}`);
  process.exit(2);
});
