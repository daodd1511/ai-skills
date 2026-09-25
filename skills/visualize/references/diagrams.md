# Node-and-edge diagrams

This file covers flow, swimlane flow, architecture, sequence, state, decision tree, and
dependency graph diagrams. You describe the graph as a JSON spec. The bundled renderer
lays it out and draws it. Do not hand-place SVG coordinates for these types.

Script paths below are relative to this skill's directory, the one that holds `SKILL.md`.

## Workflow

1. Write the page with one `<figure>` per diagram, holding the spec and a caption.
2. Run `node scripts/build.mjs <page.html>`. It validates every spec and inlines the
   renderer into the page, and it leaves the page untouched if any spec has errors.
   Fix every error. A warning that starts with `FINDING:` describes the system, not the
   drawing, so state it on the page (for example, "Disputed has no way in or out").
3. Run `node scripts/check.mjs <page.html>`. It renders the page at 1280px and 400px,
   prints collisions per diagram, and saves screenshots with each issue outlined in red.
   Look at the screenshots, not only the exit code: a clean check means nothing
   collides, not that the diagram reads well.
4. If the check reports errors, change the spec (see "Fixing check errors"), then rebuild
   and recheck. After two failed rounds, stop and tell the user which issues remain.

Both scripts need Node 22 or later, and `check.mjs` needs Chrome. If Chrome is missing,
say the check did not run; do not claim the diagram is clean.

## Page markup

```html
<figure>
  <script type="application/json" data-graph>
  { "type": "flow", "title": "Checkout request", "nodes": [], "edges": [] }
  </script>
  <figcaption>The claim the diagram supports, in one sentence.</figcaption>
</figure>
```

- The spec is strict JSON: no comments, no trailing commas.
- If a label contains the text `</script>`, write it as `<\/script>`.
- Rebuilding is safe. The build replaces the runtime block between the
  `visualize:runtime` markers, so never edit that block by hand.
- The figure's caption doubles as the diagram's accessible name when `title` is absent.

## Spec reference

### Top level

| Field | Applies to | Meaning |
|---|---|---|
| `type` | all | `flow`, `architecture`, `sequence`, `state`, `tree`, or `dag` |
| `title` | all | Short name; used in check output and as the accessible name |
| `direction` | all but sequence | `LR` or `TB`. Omit it to let the renderer flip a too-wide diagram at narrow widths |
| `nodes` | all | Nodes, or participants for sequence. Array order is a layout hint (see "Layout controls") |
| `edges` | all | Edges, or messages in time order for sequence |
| `groups` | flow, architecture, dag | `[{ "id", "label" }]`: layers, trust boundaries, deployment units |
| `lanes` | flow | `[{ "id", "label" }]`: swimlanes, top to bottom. Every node then needs a `lane` |
| `frames` | sequence | `[{ "kind", "label", "from", "to", "else" }]`, see "Sequence" |
| `numbered` | sequence | `false` turns off message numbers (default on) |

### Nodes

| Field | Meaning |
|---|---|
| `id` | Unique string, referenced by edges |
| `label` | Text shown. Keep it to a few words; `\n` forces a line break. Optional only for `initial` and `final` |
| `kind` | Shape, see below. Defaults: `state` in state diagrams, `outcome` for tree leaves, `process` otherwise |
| `group` / `lane` | Id from `groups` or `lanes` |
| `source` | `path:line` the node was read from; shown on hover |
| `inferred` | `true` when you deduced the node rather than read it; drawn dashed |
| `emphasis` | `true` for the node the caption is about; drawn in the accent color |

| Kind | Shape | Types |
|---|---|---|
| `process` | Rounded box | flow, architecture, dag, tree (questions) |
| `decision` | Diamond | flow, tree |
| `terminal` | Pill: start or end of a flow | flow |
| `store` | Cylinder: database, queue, bucket | flow, architecture, dag |
| `external` | Shaded box: outside the system or team | flow, architecture, dag |
| `state` | Rounded box | state |
| `initial` / `final` | Filled dot / ringed dot | state |
| `outcome` | Tinted box: a tree leaf | tree |

### Edges

| Field | Meaning |
|---|---|
| `from`, `to` | Node ids |
| `label` | What crosses the edge. Required for architecture edges, sequence messages, state transitions (except from `initial`), decision branches, and tree branches |
| `style` | `sync` (solid, default), `async` (dashed), `return` (short dash, open arrowhead), `optional` (dotted; not in sequence) |
| `minlen` | Integer of 1 or more; pushes the target that many ranks further along (layered types only) |
| `source`, `inferred`, `emphasis` | As for nodes. An inferred edge also gets "(inferred)" appended to its label |

### Layout controls

- **Direction.** Pipelines and state machines read best `LR`; layered stacks and trees
  read best `TB`. These are the defaults.
- **Order.** Tree branches and sequence participants keep spec order exactly. For other
  types, node and edge order is only a hint to the layout.
- **Distance.** Raise `minlen` on an edge to move a node down a rank, for example to line
  up alternative paths.
- **Grouping.** Put nodes that belong together in a group; the layout keeps them adjacent.

## Rules per type

### Flow

- Draw one direction. Put the success path first in `edges` so it stays straight, and
  branch errors and retries off it.
- Label every edge leaving a `decision` with its answer. Keep answers parallel
  (`yes`/`no`, or `valid`/`expired`), not a mix.
- Start and end with `terminal` nodes. Use `store` and `external` only where the flow
  touches them, not as an inventory.
- Add `lanes` when the question is who does each step. Order lanes so that lanes with
  the most handoffs between them are adjacent.

### Architecture

- Pick one level of detail and stay there: systems, or deployable containers, or
  components inside one container. Never mix levels in one diagram.
- Decide whether arrows mean "calls or depends on" or "data flows to", say which in the
  caption, and never mix the two.
- Label every edge with the protocol or verb: `gRPC`, `publishes OrderPlaced`,
  `polls every 30s`. Use `async` for queues, events, and polling.
- Use `groups` for the boundaries the argument depends on: network or trust
  boundaries, ownership, deployment units.
- To compare options, draw one figure per option with the same nodes in the same order,
  and set `emphasis` on the edges that differ.

### Sequence

- Order participants by first appearance, with the initiator leftmost.
- One message per edge, in time order. Use `return` for responses; a `sync` call
  followed later by its `return` draws an activation bar automatically.
- Use frames instead of repeating messages: `alt` with `else` for branches, `opt` for
  optional steps, `loop` for repetition, `par` for concurrency, `critical` for atomic
  sections. `from` and `to` are message numbers (1-based, inclusive); `else` is
  `[{ "at": <message number>, "label": "[condition]" }]`. Frames must nest, not
  partially overlap.
- Write frame and else labels as guards in brackets: `[cache miss]`.

### State

- Exactly one `initial` node per region; `final` nodes wherever the entity's life ends.
- Label transitions as `event [guard] / action`; drop the parts that do not apply.
- Include error and cancellation states; they are usually what the reader came for.
- The build reports unreachable states and non-final states with no way out as
  `FINDING:` warnings. Keep them in the diagram and call them out in the caption; do not
  delete them to make the warning go away.

### Decision tree

- Questions go in nodes, answers on edges, outcomes in leaves.
- List branches in the same answer order everywhere (for example, `yes` before `no`), so
  answers sit on consistent sides.
- Past four levels, or when subtrees repeat, use a decision table instead.

### Dependency graph

- Point arrows from the dependency to the dependent when showing build or deploy order,
  and from the dependent to the dependency when showing imports. State which in the
  caption.
- The build rejects cycles; a cycle is a finding, so draw it as a `flow` and call it out.

## Across all types

- **Size.** Past 15 nodes, or 8 participants and 25 messages, split into an overview
  diagram plus detail diagrams. The build warns at these limits.
- **One accent.** Use `emphasis` only on the path or edge the caption talks about.
- **Legends.** If a diagram mixes edge styles or has inferred parts, name them in the
  caption ("dashed: async"); skip a separate legend.
- **Grounding.** For diagrams derived from code, set `source` on the nodes and edges you
  read, and `inferred: true` on everything you deduced. Never present an inferred
  connection as read.
- **Styling.** The runtime owns shapes and sizes. Diagram colors follow the page's theme
  tokens on `:root` (see `page.md`), and diagram text uses the page font. To recolor
  only the diagrams, set a `--vg-*` token such as `--vg-accent` on `:root`. Do not add
  CSS for `.vg` classes.

## Fixing check errors

| Error | What to change |
|---|---|
| `text-overlap` | Shorten the labels involved, break them with `\n`, or set the other `direction` |
| `label-on-node` | Shorten the edge or group label, raise `minlen` on that edge, or reorder nodes |
| `edge-through-node` | Reorder `nodes` and `edges` so connected nodes sit next to each other, raise `minlen`, or group them. In swimlanes, reorder lanes so the edge's lanes are adjacent |
| `label-outside-node` | A single long word, such as a URL, cannot wrap. Shorten it or break it with `\n` |
| `text-off-canvas` | A renderer bug. Report it to the user with the spec |
| `render` | The runtime threw. Rebuild; if it persists, report it with the spec |
| `page-overflow-x` | Something outside the figures is wider than the phone viewport; fix the page CSS |
| `edge-crosses-label` (warning) | Fine if the screenshot reads clearly; otherwise treat it like `label-on-node` |

"Scrolls inside its frame" at 400px is expected for wide diagrams. The text stays
legible and the page itself does not scroll.
