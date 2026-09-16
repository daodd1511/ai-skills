/* visualize graph runtime: renders <script type="application/json" data-graph> specs as
   inline SVG, then checks the drawing for collisions. Inlined into pages by
   scripts/build.mjs; the spec format lives in references/diagrams.md. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const LINE = 17;
  const COLOR = { fg: "#1f2328", line: "#57606a", muted: "#8c959f", accent: "#0550ae", bg: "#ffffff", subtle: "#f6f8fa", border: "#d0d7de", issue: "#cf222e" };
  const DEFAULT_DIR = { flow: "LR", dag: "LR", state: "LR", architecture: "TB", tree: "TB" };
  const CHECK_MODE = /[?&]vg-check\b/.test(location.search);

  const CSS = `
.vg{margin:1.5rem 0}
.vg-scroll{overflow-x:auto}
.vg svg{display:block;max-width:none;height:auto;font-size:13px;color:${COLOR.fg};background:${COLOR.bg}}
.vg text{fill:currentColor;dominant-baseline:central}
.vg-shape{fill:${COLOR.bg};stroke:${COLOR.line};stroke-width:1.25}
.kind-external>.vg-shape{fill:${COLOR.subtle}}
.kind-outcome>.vg-shape{fill:#eaf1fb}
.kind-initial>.vg-shape,.kind-final>.vg-inner{fill:${COLOR.fg};stroke:none}
.vg-node.inferred>.vg-shape{stroke-dasharray:4 3}
.vg-node.emphasis>.vg-shape{stroke:${COLOR.accent};stroke-width:2}
.vg-edge{fill:none;stroke:${COLOR.line};stroke-width:1.25}
.vg-edge.style-async{stroke-dasharray:6 4}
.vg-edge.style-return{stroke-dasharray:3 3}
.vg-edge.style-optional{stroke-dasharray:1 4;stroke-linecap:round}
.vg-edge.inferred{stroke:${COLOR.muted}}
.vg-edge.emphasis{stroke:${COLOR.accent};stroke-width:2}
.vg-label-bg{fill:${COLOR.bg}}
.vg-edge-label{font-size:12px}
.vg-group>rect{fill:${COLOR.subtle};stroke:${COLOR.border}}
.vg-group-label,.vg-lane-label{font-size:12px;font-weight:600;fill:${COLOR.line}}
.vg-lane{fill:${COLOR.bg};stroke:${COLOR.border}}
.vg-lane.alt{fill:${COLOR.subtle}}
.vg-lifeline{stroke:${COLOR.muted};stroke-dasharray:4 4}
.vg-activation{fill:#eaeef2;stroke:${COLOR.line}}
.vg-frame{fill:none;stroke:${COLOR.muted}}
.vg-frame-tab{fill:${COLOR.subtle};stroke:${COLOR.muted}}
.vg-frame-kind{font-weight:600}
.vg-else{stroke:${COLOR.muted};stroke-dasharray:4 3}
.vg-issue{fill:none;stroke:${COLOR.issue};stroke-width:2}
`;

  // ---------- DOM helpers ----------

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  function textBlock(parent, lines, x, cy, cls, anchor) {
    const t = el("text", { class: cls, "text-anchor": anchor || "middle" }, parent);
    const top = cy - (lines.length * LINE) / 2;
    lines.forEach((line, i) => {
      el("tspan", { x, y: top + LINE * (i + 0.5) }, t).textContent = line;
    });
    return t;
  }

  function labelWithBg(parent, text, x, cy, cls) {
    const g = el("g", {}, parent);
    el("rect", { class: "vg-label-bg", x: x - text.width / 2 - 4, y: cy - text.height / 2 - 1, width: text.width + 8, height: text.height + 2, rx: 3 }, g);
    return textBlock(g, text.lines, x, cy, cls);
  }

  function makeMeasure(svg) {
    const probe = el("text", { x: -9999, y: -9999, "aria-hidden": "true" }, svg);
    const fn = (s, cls) => {
      probe.setAttribute("class", cls || "");
      probe.textContent = s;
      return probe.getComputedTextLength();
    };
    fn.dispose = () => probe.remove();
    return fn;
  }

  function wrap(label, max, measure, cls) {
    const lines = [];
    for (const para of String(label == null ? "" : label).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? line + " " + word : word;
        if (line && measure(next, cls) > max) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
    }
    const width = Math.max(0, ...lines.map((l) => measure(l, cls)));
    return { lines, width: Math.ceil(width), height: lines.length * LINE };
  }

  function addMarkers(svg, prefix) {
    const defs = el("defs", {}, svg);
    const make = (name, fill, open) => {
      const m = el("marker", { id: `${prefix}-${name}`, viewBox: "0 0 10 10", refX: 9.5, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: "userSpaceOnUse", orient: "auto-start-reverse" }, defs);
      el("path", open ? { d: "M1,1 L9.5,5 L1,9", fill: "none", stroke: fill, "stroke-width": 1.5 } : { d: "M0,0 L10,5 L0,10 z", fill }, m);
    };
    make("arrow", COLOR.line);
    make("accent", COLOR.accent);
    make("muted", COLOR.muted);
    make("open", COLOR.line, true);
    return (edge) => {
      const name = edge.emphasis ? "accent" : edge.inferred ? "muted" : edge.style === "return" ? "open" : "arrow";
      return `url(#${prefix}-${name})`;
    };
  }

  const edgeClass = (e) => `vg-edge style-${e.style || "sync"}${e.emphasis ? " emphasis" : ""}${e.inferred ? " inferred" : ""}`;
  const edgeText = (e, prefix) => `${prefix || ""}${e.label || ""}${e.inferred ? " (inferred)" : ""}`;
  const boxOf = (n) => ({ l: n.x - n.w / 2, t: n.y - n.h / 2, r: n.x + n.w / 2, b: n.y + n.h / 2 });

  function addTitle(g, item) {
    const parts = [item.source, item.inferred ? "inferred, not read from source" : null].filter(Boolean);
    if (parts.length) el("title", {}, g).textContent = parts.join(" | ");
  }

  // ---------- nodes ----------

  function sizeNode(node, kind, measure) {
    if (kind === "initial") return { w: 18, h: 18, text: null };
    if (kind === "final") return { w: 24, h: 24, text: null };
    const text = wrap(node.label, kind === "decision" ? 110 : 150, measure, "vg-node-label");
    let w = text.width + 24;
    let h = text.height + 16;
    if (kind === "decision") {
      w = text.width / 0.62 + 16;
      h = text.height / 0.38 + 8;
    }
    if (kind === "terminal") w += 12;
    if (kind === "store") h += 14;
    return { text, w: Math.ceil(Math.max(w, kind === "decision" ? 96 : 64)), h: Math.ceil(h) };
  }

  function drawNode(layer, n) {
    const g = el("g", { class: `vg-node kind-${n.kind}${n.emphasis ? " emphasis" : ""}${n.inferred ? " inferred" : ""}` }, layer);
    const { x, y, w, h } = n;
    const l = x - w / 2;
    const t = y - h / 2;
    if (n.kind === "decision") {
      el("polygon", { class: "vg-shape", points: `${x},${t} ${l + w},${y} ${x},${t + h} ${l},${y}` }, g);
    } else if (n.kind === "initial" || n.kind === "final") {
      el("circle", { class: "vg-shape", cx: x, cy: y, r: w / 2 }, g);
      if (n.kind === "final") el("circle", { class: "vg-inner", cx: x, cy: y, r: w / 2 - 5 }, g);
    } else if (n.kind === "store") {
      const ry = 6;
      const side = h - 2 * ry;
      el("path", { class: "vg-shape", d: `M${l},${t + ry} a${w / 2},${ry} 0 0 1 ${w},0 a${w / 2},${ry} 0 0 1 ${-w},0 v${side} a${w / 2},${ry} 0 0 0 ${w},0 v${-side}` }, g);
    } else {
      const rx = n.kind === "terminal" ? h / 2 : n.kind === "state" ? 12 : 6;
      el("rect", { class: "vg-shape", x: l, y: t, width: w, height: h, rx }, g);
    }
    addTitle(g, n);
    const label = n.text ? textBlock(g, n.text.lines, x, n.kind === "store" ? y + 4 : y, "vg-node-label") : null;
    return label;
  }

  // Where the ray from a node's center toward `p` leaves the node's shape.
  function clip(n, p) {
    const dx = p.x - n.x;
    const dy = p.y - n.y;
    if (!dx && !dy) return { x: n.x, y: n.y };
    let s;
    if (n.kind === "decision") s = 1 / (Math.abs(dx) / (n.w / 2) + Math.abs(dy) / (n.h / 2));
    else if (n.kind === "initial" || n.kind === "final") s = n.w / 2 / Math.hypot(dx, dy);
    else s = Math.min(dx ? n.w / 2 / Math.abs(dx) : Infinity, dy ? n.h / 2 / Math.abs(dy) : Infinity);
    return { x: n.x + dx * s, y: n.y + dy * s };
  }

  // Uniform cubic B-spline through dagre's control points (same as d3.curveBasis).
  function basisPath(pts) {
    if (pts.length < 3) return "M" + pts.map((p) => `${p.x},${p.y}`).join("L");
    let d = `M${pts[0].x},${pts[0].y}`;
    let [x0, y0, x1, y1] = [pts[0].x, pts[0].y, pts[1].x, pts[1].y];
    d += `L${(5 * x0 + x1) / 6},${(5 * y0 + y1) / 6}`;
    for (let i = 2; i < pts.length; i++) {
      const { x, y } = pts[i];
      d += `C${(2 * x0 + x1) / 3},${(2 * y0 + y1) / 3} ${(x0 + 2 * x1) / 3},${(y0 + 2 * y1) / 3} ${(x0 + 4 * x1 + x) / 6},${(y0 + 4 * y1 + y) / 6}`;
      [x0, y0, x1, y1] = [x1, y1, x, y];
    }
    d += `C${(2 * x0 + x1) / 3},${(2 * y0 + y1) / 3} ${(x0 + 2 * x1) / 3},${(y0 + 2 * y1) / 3} ${x1},${y1}`;
    return d;
  }

  // ---------- layered: flow, architecture, state, tree, dag ----------

  function prepareNodes(spec, measure) {
    const outgoing = new Set(spec.edges.map((e) => e.from));
    return spec.nodes.map((n) => {
      const fallback = spec.type === "state" ? "state" : spec.type === "tree" && !outgoing.has(n.id) ? "outcome" : "process";
      const kind = n.kind || fallback;
      return { ...n, kind, ...sizeNode(n, kind, measure) };
    });
  }

  function dagreLayout(spec, nodes, labels, dir) {
    const grouped = !!(spec.groups && spec.groups.length);
    const g = new dagre.graphlib.Graph({ multigraph: true, compound: grouped });
    g.setGraph({ rankdir: dir, nodesep: 40, edgesep: 20, ranksep: grouped ? 64 : 52, marginx: 24, marginy: grouped ? 40 : 24 });
    if (grouped) for (const grp of spec.groups) g.setNode("group:" + grp.id, {});
    for (const n of nodes) {
      g.setNode(n.id, { width: n.w, height: n.h });
      if (grouped && n.group) g.setParent(n.id, "group:" + n.group);
    }
    spec.edges.forEach((e, i) => {
      const lab = labels[i];
      const attrs = { minlen: e.minlen || 1 };
      if (lab) Object.assign(attrs, { width: lab.width + 12, height: lab.height + 6, labelpos: "c" });
      g.setEdge(e.from, e.to, attrs, "e" + i);
    });
    dagre.layout(g);
    const pos = {};
    for (const n of nodes) pos[n.id] = { x: g.node(n.id).x, y: g.node(n.id).y };
    const groups = grouped
      ? spec.groups.map((grp) => {
          const c = g.node("group:" + grp.id);
          return { ...grp, x: c.x, y: c.y, w: c.width, h: c.height };
        })
      : [];
    const edges = spec.edges.map((e, i) => {
      const ed = g.edge(e.from, e.to, "e" + i);
      return { points: ed.points.map((p) => ({ x: p.x, y: p.y })), label: labels[i] ? { x: ed.x, y: ed.y } : null };
    });
    return { dir, W: Math.ceil(g.graph().width), H: Math.ceil(g.graph().height), pos, groups, edges };
  }

  // Trees keep children in spec order (dagre may reorder them), so answers stay on
  // consistent sides. Each subtree gets a band as wide as its children need.
  function treeLayout(spec, nodes, labels, dir) {
    const TB = dir === "TB";
    const MARGIN = 24;
    const SIBLING_GAP = TB ? 28 : 18;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const kids = new Map(nodes.map((n) => [n.id, []]));
    const hasParent = new Set();
    for (const e of spec.edges) {
      kids.get(e.from).push(e.to);
      hasParent.add(e.to);
    }
    const root = nodes.find((n) => !hasParent.has(n.id)).id;
    const across = (n) => (TB ? n.w : n.h);
    const along = (n) => (TB ? n.h : n.w);
    const labelSize = Math.max(0, ...labels.filter(Boolean).map((l) => (TB ? l.height : l.width)));
    const RANK_GAP = labelSize + (TB ? 40 : 56);

    const depth = new Map();
    const rankLen = [];
    const span = new Map();
    const measureTree = (id, d) => {
      depth.set(id, d);
      rankLen[d] = Math.max(rankLen[d] || 0, along(byId.get(id)));
      const children = kids.get(id);
      const block = children.reduce((s, k) => s + measureTree(k, d + 1), 0) + SIBLING_GAP * Math.max(0, children.length - 1);
      span.set(id, Math.max(across(byId.get(id)), block));
      return span.get(id);
    };
    measureTree(root, 0);
    const rankStart = [];
    let cursor = MARGIN;
    rankLen.forEach((len, d) => {
      rankStart[d] = cursor;
      cursor += len + RANK_GAP;
    });

    const pos = {};
    const place = (id, start) => {
      const children = kids.get(id);
      const s = span.get(id);
      const block = children.reduce((sum, k) => sum + span.get(k), 0) + SIBLING_GAP * Math.max(0, children.length - 1);
      let c = start + (s - block) / 2;
      for (const k of children) {
        place(k, c);
        c += span.get(k) + SIBLING_GAP;
      }
      const n = byId.get(id);
      let a = start + s / 2;
      if (children.length) {
        const first = pos[children[0]];
        const last = pos[children[children.length - 1]];
        a = TB ? (first.x + last.x) / 2 : (first.y + last.y) / 2;
        a = Math.min(Math.max(a, start + across(n) / 2), start + s - across(n) / 2);
      }
      const d = depth.get(id);
      const b = rankStart[d] + rankLen[d] / 2;
      pos[id] = TB ? { x: a, y: b } : { x: b, y: a };
    };
    place(root, MARGIN);

    const edges = spec.edges.map((e, i) => {
      const p = pos[e.from];
      const c = pos[e.to];
      const pn = byId.get(e.from);
      const cn = byId.get(e.to);
      if (TB) {
        const mid = (p.y + pn.h / 2 + c.y - cn.h / 2) / 2;
        return { points: [p, { x: p.x, y: mid }, { x: c.x, y: mid }, c].map((q) => ({ ...q })), label: labels[i] ? { x: (p.x + c.x) / 2, y: mid } : null };
      }
      const mid = (p.x + pn.w / 2 + c.x - cn.w / 2) / 2;
      return { points: [p, { x: mid, y: p.y }, { x: mid, y: c.y }, c].map((q) => ({ ...q })), label: labels[i] ? { x: mid, y: (p.y + c.y) / 2 } : null };
    });
    const breadth = span.get(root) + 2 * MARGIN;
    const length = cursor - RANK_GAP + MARGIN;
    return { dir, W: Math.ceil(TB ? breadth : length), H: Math.ceil(TB ? length : breadth), pos, groups: [], edges };
  }

  function renderLayered(svg, spec, avail, markerFor) {
    const measure = makeMeasure(svg);
    const nodes = prepareNodes(spec, measure);
    const labels = spec.edges.map((e) => (e.label || e.inferred ? wrap(edgeText(e), 140, measure, "vg-edge-label") : null));
    const groupLabels = (spec.groups || []).map((grp) => wrap(grp.label, 220, measure, "vg-group-label"));
    measure.dispose();

    const layout = spec.type === "tree" ? treeLayout : dagreLayout;
    const preferred = spec.direction || DEFAULT_DIR[spec.type];
    let lay = layout(spec, nodes, labels, preferred);
    if (!spec.direction && lay.W > avail) {
      const alt = layout(spec, nodes, labels, preferred === "LR" ? "TB" : "LR");
      if (alt.W < lay.W * 0.8) lay = alt;
    }
    for (const n of nodes) Object.assign(n, lay.pos[n.id]);
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const model = { nodes, edges: [], texts: [] };
    const groupLayer = el("g", {}, svg);
    const edgeLayer = el("g", {}, svg);
    const nodeLayer = el("g", {}, svg);
    const labelLayer = el("g", {}, svg);

    lay.groups.forEach((grp, i) => {
      const g = el("g", { class: "vg-group" }, groupLayer);
      const top = grp.y - grp.h / 2 - 24;
      el("rect", { x: grp.x - grp.w / 2, y: top, width: grp.w, height: grp.h + 24, rx: 8 }, g);
      const t = textBlock(g, groupLabels[i].lines, grp.x - grp.w / 2 + 10, top + 4 + groupLabels[i].height / 2, "vg-group-label", "start");
      model.texts.push({ el: t, owner: { type: "group" } });
    });

    spec.edges.forEach((e, i) => {
      const pts = lay.edges[i].points;
      const s = byId.get(e.from);
      const t = byId.get(e.to);
      if (pts.length > 1) {
        pts[0] = clip(s, pts[1]);
        pts[pts.length - 1] = clip(t, pts[pts.length - 2]);
      }
      const path = el("path", { class: edgeClass(e), d: basisPath(pts), "marker-end": markerFor(e) }, edgeLayer);
      addTitle(path, e);
      model.edges.push({ el: path, from: e.from, to: e.to, index: i });
      if (labels[i]) {
        const lt = labelWithBg(labelLayer, labels[i], lay.edges[i].label.x, lay.edges[i].label.y, "vg-edge-label");
        model.texts.push({ el: lt, owner: { type: "edge", index: i } });
      }
    });

    for (const n of nodes) {
      const label = drawNode(nodeLayer, n);
      if (label) model.texts.push({ el: label, owner: { type: "node", id: n.id } });
    }
    return { W: lay.W, H: lay.H, model, direction: lay.dir };
  }

  // ---------- swimlane flow ----------

  function pathHits(path, nodes, skip) {
    const len = path.getTotalLength();
    for (let d = 0; d <= len; d += 4) {
      const p = path.getPointAtLength(d);
      for (const n of nodes) {
        if (skip.has(n.id)) continue;
        const b = boxOf(n);
        if (p.x > b.l - 4 && p.x < b.r + 4 && p.y > b.t - 4 && p.y < b.b + 4) return true;
      }
    }
    return false;
  }

  function renderLanes(svg, spec, markerFor) {
    const measure = makeMeasure(svg);
    const nodes = prepareNodes(spec, measure);
    const labels = spec.edges.map((e) => (e.label || e.inferred ? wrap(edgeText(e), 140, measure, "vg-edge-label") : null));
    const laneLabels = spec.lanes.map((lane) => wrap(lane.label, 120, measure, "vg-lane-label"));
    measure.dispose();

    const base = dagreLayout({ ...spec, groups: [] }, nodes, labels, "LR");
    const gutter = Math.max(...laneLabels.map((t) => t.width)) + 32;
    const PAD = 30;
    const GAP = 28;
    const lanes = [];
    let top = 0;
    spec.lanes.forEach((lane, li) => {
      const columns = new Map();
      for (const n of nodes.filter((m) => m.lane === lane.id)) {
        const cx = Math.round(base.pos[n.id].x);
        if (!columns.has(cx)) columns.set(cx, []);
        columns.get(cx).push(n);
      }
      const stackH = (list) => list.reduce((s, n) => s + n.h, 0) + GAP * (list.length - 1);
      let inner = 0;
      for (const list of columns.values()) {
        list.sort((a, b) => base.pos[a.id].y - base.pos[b.id].y);
        inner = Math.max(inner, stackH(list));
      }
      const h = Math.max(inner + 2 * PAD, laneLabels[li].height + 2 * PAD);
      for (const [cx, list] of columns) {
        let y = top + (h - stackH(list)) / 2;
        for (const n of list) {
          Object.assign(n, { x: cx + gutter, y: y + n.h / 2 });
          y += n.h + GAP;
        }
      }
      lanes.push({ y: top, h });
      top += h;
    });
    const W = base.W + gutter;
    const H = top;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const model = { nodes, edges: [], texts: [] };

    const laneLayer = el("g", {}, svg);
    const edgeLayer = el("g", {}, svg);
    const nodeLayer = el("g", {}, svg);
    const labelLayer = el("g", {}, svg);
    lanes.forEach((lane, li) => {
      el("rect", { class: `vg-lane${li % 2 ? " alt" : ""}`, x: 0.5, y: lane.y + 0.5, width: W - 1, height: lane.h - 1 }, laneLayer);
      const t = textBlock(laneLayer, laneLabels[li].lines, 14, lane.y + lane.h / 2, "vg-lane-label", "start");
      model.texts.push({ el: t, owner: { type: "lane" } });
    });
    el("line", { class: "vg-lane", x1: gutter - 8, y1: 0, x2: gutter - 8, y2: H }, laneLayer);

    spec.edges.forEach((e, i) => {
      const s = byId.get(e.from);
      const t = byId.get(e.to);
      const candidates = [];
      if (t.x - t.w / 2 > s.x + s.w / 2 + 4) {
        const x1 = s.x + s.w / 2;
        const x2 = t.x - t.w / 2;
        const mx = (x1 + x2) / 2;
        candidates.push(`M${x1},${s.y} C${mx},${s.y} ${mx},${t.y} ${x2},${t.y}`);
        const reach = Math.max(s.h, t.h) / 2 + GAP / 2 + 10;
        for (const g of [Math.min(s.y, t.y) - reach, Math.max(s.y, t.y) + reach]) {
          candidates.push(`M${x1},${s.y} C${x1 + 40},${s.y} ${x1 + 10},${g} ${mx},${g} S${x2 - 40},${t.y} ${x2},${t.y}`);
        }
      } else if (Math.abs(s.x - t.x) < 1) {
        const down = t.y > s.y;
        candidates.push(`M${s.x},${s.y + (down ? s.h / 2 : -s.h / 2)} L${t.x},${t.y + (down ? -t.h / 2 : t.h / 2)}`);
      } else {
        const y1 = s.y + s.h / 2;
        const y2 = t.y + t.h / 2;
        const low = Math.max(y1, y2) + 36;
        candidates.push(`M${s.x},${y1} C${s.x},${low} ${t.x},${low} ${t.x},${y2}`);
        const y3 = s.y - s.h / 2;
        const y4 = t.y - t.h / 2;
        const high = Math.min(y3, y4) - 36;
        candidates.push(`M${s.x},${y3} C${s.x},${high} ${t.x},${high} ${t.x},${y4}`);
      }
      const path = el("path", { class: edgeClass(e), "marker-end": markerFor(e) }, edgeLayer);
      const skip = new Set([s.id, t.id]);
      let chosen = candidates[0];
      for (const d of candidates) {
        path.setAttribute("d", d);
        if (!pathHits(path, nodes, skip)) {
          chosen = d;
          break;
        }
      }
      path.setAttribute("d", chosen);
      addTitle(path, e);
      model.edges.push({ el: path, from: e.from, to: e.to, index: i });
      if (labels[i]) {
        const mid = path.getPointAtLength(path.getTotalLength() / 2);
        const lt = labelWithBg(labelLayer, labels[i], mid.x, mid.y, "vg-edge-label");
        model.texts.push({ el: lt, owner: { type: "edge", index: i } });
      }
    });

    for (const n of nodes) {
      const label = drawNode(nodeLayer, n);
      if (label) model.texts.push({ el: label, owner: { type: "node", id: n.id } });
    }
    return { W, H, model, direction: "LR" };
  }

  // ---------- sequence ----------

  function renderSequence(svg, spec, markerFor) {
    const measure = makeMeasure(svg);
    const numbered = spec.numbered !== false;
    const P = spec.nodes.map((n) => {
      const text = wrap(n.label, 130, measure, "vg-node-label");
      return { ...n, text, w: Math.max(84, text.width + 24), h: text.height + 16 };
    });
    const idx = new Map(P.map((p, i) => [p.id, i]));
    const M = spec.edges.map((e, i) => ({
      ...e,
      a: idx.get(e.from),
      b: idx.get(e.to),
      text: wrap(edgeText(e, numbered ? `${i + 1}. ` : ""), 220, measure, "vg-edge-label"),
    }));
    const frames = (spec.frames || []).map((f) => ({ ...f, else: (f.else || []).map((x) => ({ ...x })) }));
    for (const f of frames) {
      f.tab = measure(f.kind, "vg-frame-kind") + (f.label ? measure(" " + f.label, "") : 0) + 16;
      for (const x of f.else) x.width = measure(x.label, "");
    }
    measure.dispose();

    const SELF = 34;
    const X = [];
    P.forEach((p, i) => {
      let x = i === 0 ? p.w / 2 : X[i - 1] + (P[i - 1].w + p.w) / 2 + 28;
      for (const m of M) {
        const lo = Math.min(m.a, m.b);
        const hi = Math.max(m.a, m.b);
        if (hi === i && lo !== hi) x = Math.max(x, X[lo] + m.text.width + 40);
        if (m.a === m.b && m.a === i - 1) x = Math.max(x, X[i - 1] + SELF + m.text.width + 28);
      }
      X.push(x);
    });

    // Vertical rhythm: frame tabs and else dividers reserve their own rows.
    const TOP = 16;
    const headH = Math.max(...P.map((p) => p.h));
    let y = TOP + headH + 24;
    const rowY = [];
    const span = (f) => f.to - f.from;
    M.forEach((m, i) => {
      const n = i + 1;
      for (const f of frames.filter((f) => f.from === n).sort((p, q) => span(q) - span(p))) {
        f.top = y;
        y += 28;
      }
      for (const f of frames) for (const x of f.else) if (x.at === n) {
        x.y = y;
        y += 26;
      }
      y += m.text.height + 4;
      rowY.push(y);
      y += (m.a === m.b ? 20 : 0) + 18;
      for (const f of frames.filter((f) => f.to === n).sort((p, q) => span(p) - span(q))) {
        y += 6;
        f.bottom = y;
        y += 8;
      }
    });
    const H = y + 16;

    // Frame extents: outer frames sit outside inner ones.
    const levels = (f) => 1 + Math.max(-1, ...frames.filter((g) => g !== f && g.from >= f.from && g.to <= f.to && span(g) < span(f)).map(levels));
    let minLeft = Infinity;
    let maxRight = 0;
    for (const f of frames) {
      const inside = M.slice(f.from - 1, f.to);
      const cols = inside.flatMap((m) => [m.a, m.b]);
      const lv = levels(f);
      f.left = Math.min(...cols.map((c) => X[c])) - 24 - 10 * lv;
      const selfRight = inside.filter((m) => m.a === m.b).map((m) => X[m.a] + SELF + m.text.width + 12);
      f.right = Math.max(...cols.map((c) => X[c]), ...selfRight) + 24 + 10 * lv;
      f.right = Math.max(f.right, f.left + f.tab + 12, ...f.else.map((x) => f.left + x.width + 24));
      minLeft = Math.min(minLeft, f.left);
      maxRight = Math.max(maxRight, f.right);
    }
    const shift = Math.max(16, 16 - minLeft, ...P.map((p, i) => 16 + p.w / 2 - X[i]));
    for (let i = 0; i < X.length; i++) X[i] += shift;
    for (const f of frames) {
      f.left += shift;
      f.right += shift;
    }
    let W = Math.max(...P.map((p, i) => X[i] + p.w / 2), maxRight + shift);
    for (const m of M) if (m.a === m.b) W = Math.max(W, X[m.a] + SELF + m.text.width + 12);
    W = Math.ceil(W + 16);

    // Activations: a sync call opens a bar on the callee; the matching return closes it.
    const stacks = P.map(() => []);
    const bars = [];
    M.forEach((m, i) => {
      if (m.a === m.b) return;
      if (m.style === "return") {
        const st = stacks[m.a];
        for (let k = st.length - 1; k >= 0; k--) {
          if (st[k].caller === m.b) {
            bars.push({ p: m.a, y1: st[k].y, y2: rowY[i], depth: k });
            st.splice(k, 1);
            break;
          }
        }
      } else if (!m.style || m.style === "sync") stacks[m.b].push({ caller: m.a, y: rowY[i] });
    });
    const inset = (p, yy) => Math.max(0, ...bars.filter((b) => b.p === p && yy >= b.y1 && yy <= b.y2).map((b) => 5 + 4 * b.depth));

    const model = { nodes: [], edges: [], texts: [] };
    const back = el("g", {}, svg);
    const mid = el("g", {}, svg);
    const front = el("g", {}, svg);

    for (const f of frames) {
      el("rect", { class: "vg-frame", x: f.left, y: f.top, width: f.right - f.left, height: f.bottom - f.top }, back);
      el("path", { class: "vg-frame-tab", d: `M${f.left},${f.top} h${f.tab} v12 l-6,8 H${f.left} z` }, back);
      const t = el("text", { x: f.left + 8, y: f.top + 10 }, front);
      el("tspan", { class: "vg-frame-kind" }, t).textContent = f.kind;
      if (f.label) el("tspan", {}, t).textContent = " " + f.label;
      model.texts.push({ el: t, owner: { type: "frame" } });
      for (const x of f.else) {
        el("line", { class: "vg-else", x1: f.left, y1: x.y + 2, x2: f.right, y2: x.y + 2 }, back);
        const et = el("text", { x: f.left + 8, y: x.y + 14 }, front);
        et.textContent = x.label;
        model.texts.push({ el: et, owner: { type: "frame" } });
      }
    }

    P.forEach((p, i) => {
      el("line", { class: "vg-lifeline", x1: X[i], y1: TOP + headH, x2: X[i], y2: H - 8 }, back);
      const g = el("g", { class: "vg-node kind-participant" }, front);
      el("rect", { class: "vg-shape", x: X[i] - p.w / 2, y: TOP + (headH - p.h) / 2, width: p.w, height: p.h, rx: 6 }, g);
      addTitle(g, p);
      const box = { id: p.id, kind: "process", x: X[i], y: TOP + headH / 2, w: p.w, h: p.h };
      model.nodes.push(box);
      model.texts.push({ el: textBlock(g, p.text.lines, X[i], box.y, "vg-node-label"), owner: { type: "node", id: p.id } });
    });

    for (const b of bars) el("rect", { class: "vg-activation", x: X[b.p] - 5 + 4 * b.depth, y: b.y1, width: 10, height: Math.max(8, b.y2 - b.y1) }, mid);

    M.forEach((m, i) => {
      const yy = rowY[i];
      let d;
      let lx;
      let anchor = "middle";
      if (m.a === m.b) {
        const x = X[m.a] + inset(m.a, yy);
        d = `M${x},${yy} h${SELF} v20 H${x}`;
        lx = X[m.a] + 8;
        anchor = "start";
      } else {
        const dir = m.b > m.a ? 1 : -1;
        const x1 = X[m.a] + dir * inset(m.a, yy);
        const x2 = X[m.b] - dir * inset(m.b, yy);
        d = `M${x1},${yy} H${x2}`;
        lx = (X[m.a] + X[m.b]) / 2;
      }
      const path = el("path", { class: edgeClass(m), d, "marker-end": markerFor(m) }, mid);
      addTitle(path, m);
      const cy = yy - 4 - m.text.height / 2;
      let t;
      if (anchor === "start") {
        const g = el("g", {}, front);
        el("rect", { class: "vg-label-bg", x: lx - 3, y: cy - m.text.height / 2 - 1, width: m.text.width + 6, height: m.text.height + 2 }, g);
        t = textBlock(g, m.text.lines, lx, cy, "vg-edge-label", "start");
      } else t = labelWithBg(front, m.text, lx, cy, "vg-edge-label");
      model.texts.push({ el: t, owner: { type: "edge", index: i } });
    });

    return { W, H, model, direction: "TB" };
  }

  // ---------- collision check ----------

  const overlaps = (a, b, pad) => a.l < b.r - pad && b.l < a.r - pad && a.t < b.b - pad && b.t < a.b - pad;
  const contains = (outer, inner, pad) => inner.l >= outer.l - pad && inner.r <= outer.r + pad && inner.t >= outer.t - pad && inner.b <= outer.b + pad;

  function checkDrawing(svg, model, W, H, isSequence) {
    const errors = [];
    const warnings = [];
    const flagged = [];
    const texts = model.texts.map((t) => {
      const b = t.el.getBBox();
      return { ...t, box: { l: b.x, t: b.y, r: b.x + b.width, b: b.y + b.height }, name: t.el.textContent.trim().slice(0, 48) };
    });
    const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
    const fail = (list, rule, detail, box) => {
      list.push({ rule, detail });
      if (box) flagged.push(box);
    };

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        if (overlaps(texts[i].box, texts[j].box, 1)) fail(errors, "text-overlap", `"${texts[i].name}" overlaps "${texts[j].name}"`, texts[i].box);
      }
    }

    for (const t of texts) {
      if (!contains({ l: 0, t: 0, r: W, b: H }, t.box, 1)) fail(errors, "text-off-canvas", `"${t.name}" is cut off at the drawing edge`, t.box);
      const own = t.owner.type === "node" ? nodeById.get(t.owner.id) : null;
      if (own) {
        const b = boxOf(own);
        const fits = own.kind === "decision"
          ? [[t.box.l, t.box.t], [t.box.r, t.box.t], [t.box.l, t.box.b], [t.box.r, t.box.b]].every(([x, y]) => Math.abs(x - own.x) / (own.w / 2) + Math.abs(y - own.y) / (own.h / 2) <= 1.02)
          : contains(b, t.box, 1);
        if (!fits) fail(errors, "label-outside-node", `label "${t.name}" spills out of node "${own.id}"`, t.box);
      }
      for (const n of model.nodes) {
        if (n === own) continue;
        if (overlaps(t.box, boxOf(n), 1)) fail(errors, "label-on-node", `"${t.name}" sits on node "${n.id}"`, t.box);
      }
    }

    if (!isSequence) {
      for (const e of model.edges) {
        const len = e.el.getTotalLength();
        const hitNodes = new Set();
        const hitLabels = new Set();
        for (let d = 0; d <= len; d += 3) {
          const p = e.el.getPointAtLength(d);
          for (const n of model.nodes) {
            if (n.id === e.from || n.id === e.to || hitNodes.has(n.id)) continue;
            const b = boxOf(n);
            if (p.x > b.l + 3 && p.x < b.r - 3 && p.y > b.t + 3 && p.y < b.b - 3) hitNodes.add(n.id);
          }
          for (const t of texts) {
            if (t.owner.type === "edge" && t.owner.index === e.index) continue;
            if (t.owner.type === "group" || t.owner.type === "lane" || hitLabels.has(t)) continue;
            if (t.owner.type === "node" && (t.owner.id === e.from || t.owner.id === e.to)) continue;
            if (p.x > t.box.l + 2 && p.x < t.box.r - 2 && p.y > t.box.t + 2 && p.y < t.box.b - 2) hitLabels.add(t);
          }
        }
        for (const id of hitNodes) fail(errors, "edge-through-node", `edge ${e.from} -> ${e.to} passes through node "${id}"`, boxOf(nodeById.get(id)));
        for (const t of hitLabels) fail(warnings, "edge-crosses-label", `edge ${e.from} -> ${e.to} crosses label "${t.name}"`, t.box);
      }
    }

    if (CHECK_MODE) {
      const layer = el("g", {}, svg);
      for (const b of flagged) el("rect", { class: "vg-issue", x: b.l - 2, y: b.t - 2, width: b.r - b.l + 4, height: b.b - b.t + 4 }, layer);
    }
    return { errors, warnings };
  }

  // ---------- page wiring ----------

  function renderFigure(script, index) {
    const fig = script.closest("figure") || script.parentElement;
    fig.classList.add("vg");
    let holder = fig.querySelector(":scope > .vg-scroll");
    if (!holder) {
      holder = document.createElement("div");
      holder.className = "vg-scroll";
      script.before(holder);
    }
    holder.textContent = "";
    const spec = JSON.parse(script.textContent);
    const caption = fig.querySelector("figcaption");
    const svg = el("svg", { role: "img", "aria-label": spec.title || (caption && caption.textContent.trim()) || `${spec.type} diagram` }, holder);
    const markerFor = addMarkers(svg, `vg${index}`);
    const avail = holder.clientWidth || fig.clientWidth || 800;

    const out = spec.type === "sequence"
      ? renderSequence(svg, spec, markerFor)
      : spec.lanes && spec.lanes.length
        ? renderLanes(svg, spec, markerFor)
        : renderLayered(svg, spec, avail, markerFor);

    svg.setAttribute("viewBox", `0 0 ${out.W} ${out.H}`);
    // Shrink to fit down to 80% scale; past that, keep text legible and scroll instead.
    const fits = out.W <= avail || avail >= out.W * 0.8;
    svg.style.width = fits ? `${Math.min(out.W, avail)}px` : `${out.W}px`;

    const result = checkDrawing(svg, out.model, out.W, out.H, spec.type === "sequence");
    return { index, type: spec.type, title: spec.title || null, direction: out.direction, width: out.W, height: out.H, scrolls: !fits, ...result };
  }

  function renderAll() {
    const scripts = [...document.querySelectorAll('script[type="application/json"][data-graph]')];
    const figures = scripts.map((script, i) => {
      try {
        return renderFigure(script, i);
      } catch (err) {
        return { index: i, errors: [{ rule: "render", detail: String((err && err.message) || err) }], warnings: [] };
      }
    });
    const root = document.documentElement;
    root.setAttribute("data-vg-check", JSON.stringify({
      viewportWidth: window.innerWidth,
      pageOverflowX: root.scrollWidth > root.clientWidth,
      pageHeight: root.scrollHeight,
      figures,
    }));
  }

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  renderAll();

  let lastWidth = window.innerWidth;
  let timer;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(renderAll, 150);
  });
})();
