#!/usr/bin/env node
// Validate every <script type="application/json" data-graph> spec in a page and inline
// the graph runtime (plus dagre when a layered diagram needs it). Rewrites the page in
// place; safe to re-run after editing a spec.
//
// Usage: node build.mjs <page.html>
// Exit: 0 built (warnings on stderr), 1 spec errors (page untouched), 2 usage.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const START = "<!-- visualize:runtime:start -->";
const END = "<!-- visualize:runtime:end -->";
const SPEC_RE = /<script\b([^>]*\bdata-graph\b[^>]*)>([\s\S]*?)<\/script>/gi;

const TYPES = ["flow", "architecture", "sequence", "state", "tree", "dag"];
const KINDS = {
  flow: ["process", "decision", "terminal", "store", "external"],
  dag: ["process", "store", "external"],
  architecture: ["process", "store", "external"],
  state: ["state", "initial", "final"],
  tree: ["process", "decision", "outcome"],
  sequence: [],
};
const STYLES = { sequence: ["sync", "async", "return"], other: ["sync", "async", "return", "optional"] };
const FRAME_KINDS = ["alt", "opt", "loop", "par", "critical"];
const KEYS = {
  spec: ["type", "title", "direction", "nodes", "edges", "groups", "lanes", "frames", "numbered"],
  node: ["id", "label", "kind", "group", "lane", "source", "inferred", "emphasis"],
  edge: ["from", "to", "label", "style", "minlen", "source", "inferred", "emphasis"],
  frame: ["kind", "label", "from", "to", "else"],
};
const NODE_LIMIT = 15;
const MESSAGE_LIMIT = 25;

export function validate(spec) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const unknownKeys = (obj, allowed, where) => {
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) warn(`${where}: unknown key "${k}" (ignored)`);
  };

  if (!spec || typeof spec !== "object" || Array.isArray(spec)) return { errors: ["spec must be a JSON object"], warnings };
  unknownKeys(spec, KEYS.spec, "spec");
  if (!TYPES.includes(spec.type)) return { errors: [`type must be one of ${TYPES.join(", ")}`], warnings };
  const { type } = spec;
  const nodes = Array.isArray(spec.nodes) ? spec.nodes : [];
  const edges = Array.isArray(spec.edges) ? spec.edges : [];
  if (!nodes.length) err("nodes must be a non-empty array");
  if (!Array.isArray(spec.edges)) err("edges must be an array");

  if (spec.direction != null) {
    if (type === "sequence") err("direction does not apply to sequence diagrams");
    else if (!["LR", "TB"].includes(spec.direction)) err('direction must be "LR" or "TB"');
  }

  const groupIds = new Set();
  for (const [i, g] of (spec.groups || []).entries()) {
    if (!g || typeof g.id !== "string" || typeof g.label !== "string") err(`groups[${i}] needs string id and label`);
    else if (groupIds.has(g.id)) err(`groups[${i}]: duplicate id "${g.id}"`);
    else groupIds.add(g.id);
  }
  const laneIds = new Set();
  for (const [i, l] of (spec.lanes || []).entries()) {
    if (!l || typeof l.id !== "string" || typeof l.label !== "string") err(`lanes[${i}] needs string id and label`);
    else if (laneIds.has(l.id)) err(`lanes[${i}]: duplicate id "${l.id}"`);
    else laneIds.add(l.id);
  }
  if (groupIds.size && !["flow", "architecture", "dag"].includes(type)) err(`groups apply only to flow, architecture, and dag diagrams`);
  if (laneIds.size && type !== "flow") err("lanes apply only to flow diagrams");
  if (laneIds.size && groupIds.size) err("use lanes or groups, not both");
  if (laneIds.size && spec.direction === "TB") err("swimlane flows are always LR");
  if (spec.frames && type !== "sequence") err("frames apply only to sequence diagrams");
  if (spec.numbered != null && type !== "sequence") warn("numbered applies only to sequence diagrams");

  const byId = new Map();
  for (const [i, n] of nodes.entries()) {
    const where = `nodes[${i}]`;
    if (!n || typeof n !== "object") {
      err(`${where} must be an object`);
      continue;
    }
    unknownKeys(n, KEYS.node, where);
    if (typeof n.id !== "string" || !n.id) err(`${where}: id must be a non-empty string`);
    else if (byId.has(n.id)) err(`${where}: duplicate id "${n.id}"`);
    else byId.set(n.id, n);
    const labelOptional = n.kind === "initial" || n.kind === "final";
    if (!labelOptional && (typeof n.label !== "string" || !n.label.trim())) err(`${where} ("${n.id}"): label is required`);
    if (n.kind != null) {
      if (type === "sequence") warn(`${where}: kind is ignored in sequence diagrams`);
      else if (!KINDS[type].includes(n.kind)) err(`${where}: kind "${n.kind}" is not valid for ${type}; use ${KINDS[type].join(", ")}`);
    }
    if (n.group != null && !groupIds.has(n.group)) err(`${where}: group "${n.group}" is not defined in groups`);
    if (laneIds.size && !laneIds.has(n.lane)) err(`${where} ("${n.id}"): every node needs a lane from lanes`);
    if (n.lane != null && !laneIds.size) err(`${where}: lane set but spec has no lanes`);
  }

  const styles = type === "sequence" ? STYLES.sequence : STYLES.other;
  const out = new Map();
  const inc = new Map();
  for (const id of byId.keys()) {
    out.set(id, []);
    inc.set(id, []);
  }
  for (const [i, e] of edges.entries()) {
    const where = `edges[${i}]`;
    if (!e || typeof e !== "object") {
      err(`${where} must be an object`);
      continue;
    }
    unknownKeys(e, KEYS.edge, where);
    const ok = byId.has(e.from) && byId.has(e.to);
    if (!byId.has(e.from)) err(`${where}: from "${e.from}" is not a node id`);
    if (!byId.has(e.to)) err(`${where}: to "${e.to}" is not a node id`);
    if (e.style != null && !styles.includes(e.style)) err(`${where}: style "${e.style}" is not valid for ${type}; use ${styles.join(", ")}`);
    if (e.minlen != null && (type === "sequence" || !Number.isInteger(e.minlen) || e.minlen < 1)) err(`${where}: minlen must be a positive integer (layered diagrams only)`);
    if (e.label != null && typeof e.label !== "string") err(`${where}: label must be a string`);
    if (!ok) continue;
    out.get(e.from).push(e);
    inc.get(e.to).push(e);
    const hasLabel = typeof e.label === "string" && e.label.trim();
    const from = byId.get(e.from);
    if (!hasLabel) {
      if (type === "sequence") err(`${where}: every message needs a label`);
      if (type === "architecture") err(`${where} (${e.from} -> ${e.to}): label the edge with what crosses it (protocol, verb)`);
      if (type === "state" && from.kind !== "initial") err(`${where} (${e.from} -> ${e.to}): label the transition as "event [guard] / action"`);
      if (type === "flow" && from.kind === "decision") err(`${where} (${e.from} -> ${e.to}): edges leaving a decision need the answer as label`);
    }
  }

  if (type === "tree" && byId.size) {
    const roots = [...byId.keys()].filter((id) => inc.get(id).length === 0);
    if (roots.length !== 1) err(`tree needs exactly one root (node with no incoming edge); found ${roots.length}: ${roots.join(", ")}`);
    for (const [id, list] of inc) if (list.length > 1) err(`tree node "${id}" has ${list.length} parents; a tree node has one`);
    for (const [id, list] of out) if (list.length > 1 && list.some((e) => !e.label)) err(`tree node "${id}": label every branch with its answer`);
    if (roots.length === 1) {
      const seen = reach(roots[0], out);
      const orphans = [...byId.keys()].filter((id) => !seen.has(id));
      if (orphans.length) err(`tree nodes unreachable from root: ${orphans.join(", ")}`);
    }
    const depth = maxDepth(roots[0], out);
    if (depth > 4) warn(`tree is ${depth} levels deep; past 4, consider a decision table`);
  }

  if (type === "dag" && hasCycle(byId, out)) err("dag contains a cycle; use flow or state instead");

  if (type === "state" && byId.size) {
    const initials = [...byId.values()].filter((n) => n.kind === "initial");
    if (!initials.length) err('state diagram needs a node with kind "initial"');
    for (const n of initials) if (inc.get(n.id).length) err(`initial node "${n.id}" cannot have incoming transitions`);
    for (const n of byId.values()) if (n.kind === "final" && out.get(n.id).length) err(`final node "${n.id}" cannot have outgoing transitions`);
    const seen = new Set();
    for (const n of initials) for (const id of reach(n.id, out)) seen.add(id);
    for (const n of byId.values()) {
      if (initials.length && !seen.has(n.id)) warn(`FINDING: state "${n.id}" is unreachable from the initial state`);
      if (n.kind !== "final" && n.kind !== "initial" && !out.get(n.id).length) warn(`FINDING: state "${n.id}" has no way out and is not final`);
    }
  }

  if (type === "sequence") {
    const frames = spec.frames || [];
    for (const [i, f] of frames.entries()) {
      const where = `frames[${i}]`;
      unknownKeys(f, KEYS.frame, where);
      if (!FRAME_KINDS.includes(f.kind)) err(`${where}: kind must be one of ${FRAME_KINDS.join(", ")}`);
      const inRange = (v) => Number.isInteger(v) && v >= 1 && v <= edges.length;
      if (!inRange(f.from) || !inRange(f.to) || f.from > f.to) err(`${where}: from/to must be message numbers 1..${edges.length} with from <= to`);
      for (const [j, x] of (f.else || []).entries()) {
        if (typeof x.label !== "string" || !Number.isInteger(x.at) || x.at <= f.from || x.at > f.to) err(`${where}.else[${j}]: needs label and an "at" message number inside (from, to]`);
      }
    }
    for (let i = 0; i < frames.length; i++) {
      for (let j = i + 1; j < frames.length; j++) {
        const [a, b] = [frames[i], frames[j]];
        const partial = a.from < b.from && b.from <= a.to && a.to < b.to || b.from < a.from && a.from <= b.to && b.to < a.to;
        if (partial) err(`frames[${i}] and frames[${j}] overlap without nesting`);
        if (a.from === b.from && a.to === b.to) err(`frames[${i}] and frames[${j}] cover the same messages; merge them`);
      }
    }
    if (byId.size > 8) warn(`${byId.size} participants; past 8, split the sequence or collapse participants`);
    if (edges.length > MESSAGE_LIMIT) warn(`${edges.length} messages; past ${MESSAGE_LIMIT}, split into several sequences`);
  } else if (byId.size > NODE_LIMIT) {
    warn(`${byId.size} nodes; past ${NODE_LIMIT}, split into an overview plus detail diagrams`);
  }

  return { errors, warnings };
}

function reach(start, out) {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) for (const e of out.get(stack.pop()) || []) if (!seen.has(e.to)) {
    seen.add(e.to);
    stack.push(e.to);
  }
  return seen;
}

function maxDepth(id, out, guard = new Set()) {
  if (id == null || guard.has(id)) return 0;
  guard.add(id);
  const kids = (out.get(id) || []).map((e) => maxDepth(e.to, out, guard));
  return 1 + Math.max(0, ...kids);
}

function hasCycle(byId, out) {
  const state = new Map();
  const visit = (id) => {
    state.set(id, 1);
    for (const e of out.get(id) || []) {
      const s = state.get(e.to);
      if (s === 1 || (!s && visit(e.to))) return true;
    }
    state.set(id, 2);
    return false;
  };
  return [...byId.keys()].some((id) => !state.get(id) && visit(id));
}

function runtime(needsDagre) {
  const read = (p) => readFileSync(join(ASSETS, p), "utf8");
  const parts = [];
  if (needsDagre) {
    const dagre = read("vendor/dagre.min.js").replace(/^\/\/# sourceMappingURL=.*$/m, "").trim();
    parts.push(`/*! @dagrejs/dagre 3.1.1 | MIT | https://github.com/dagrejs/dagre */\n${dagre}`);
  }
  parts.push(read("graph.js").trim());
  for (const p of parts) if (/<\/script/i.test(p)) throw new Error("runtime asset contains </script and cannot be inlined");
  return `${START}\n${parts.map((p) => `<script>\n${p}\n</script>`).join("\n")}\n${END}`;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node build.mjs <page.html>");
    process.exit(2);
  }
  let html = readFileSync(file, "utf8");
  const blockStart = html.indexOf(START);
  const blockEnd = html.indexOf(END);
  if (blockStart !== -1 && blockEnd > blockStart) html = html.slice(0, blockStart) + html.slice(blockEnd + END.length);

  const errors = [];
  const warnings = [];
  const types = [];
  let index = 0;
  html = html.replace(SPEC_RE, (whole, attrs, body) => {
    const label = `diagram ${++index}`;
    if (!/\btype\s*=\s*["']application\/json["']/i.test(attrs)) {
      errors.push(`${label}: the data-graph script needs type="application/json"`);
      return whole;
    }
    let spec;
    try {
      spec = JSON.parse(body);
    } catch (e) {
      // An odd quote count means the HTML parser cut the spec inside a string, which a
      // literal "</script>" in a label does.
      const cutInString = (body.match(/(?<!\\)"/g) || []).length % 2 === 1;
      const hint = cutInString ? ' (if a label contains "</script>", write "<\\/script>")' : "";
      errors.push(`${label}: invalid JSON: ${e.message}${hint}`);
      return whole;
    }
    const named = spec && spec.title ? `${label} ("${spec.title}")` : label;
    const result = validate(spec);
    errors.push(...result.errors.map((m) => `${named}: ${m}`));
    warnings.push(...result.warnings.map((m) => `${named}: ${m}`));
    types.push(spec.type);
    const json = JSON.stringify(spec, null, 2).replace(/</g, "\\u003c");
    return `<script${attrs}>\n${json}\n</script>`;
  });

  for (const w of warnings) console.error(`warning: ${w}`);
  if (!index) errors.push('no <script type="application/json" data-graph> specs found');
  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    console.error(`build failed: ${errors.length} error(s); ${file} not modified`);
    process.exit(1);
  }

  const needsDagre = types.some((t) => t !== "sequence" && t !== "tree");
  const block = runtime(needsDagre);
  const bodyClose = html.search(/<\/body\s*>(?![\s\S]*<\/body\s*>)/i);
  html = bodyClose === -1 ? `${html.trimEnd()}\n${block}\n` : `${html.slice(0, bodyClose)}${block}\n${html.slice(bodyClose)}`;
  writeFileSync(file, html);
  console.log(`built ${file}: ${index} diagram(s) [${types.join(", ")}]${needsDagre ? ", dagre inlined" : ""}${warnings.length ? `, ${warnings.length} warning(s)` : ""}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
