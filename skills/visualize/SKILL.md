---
name: visualize
description: Turn data, findings, or an explanation into a self-contained HTML page with the right visual form. Use when the user asks to visualize, illustrate, chart, diagram, or "show" something, or hands over data/analysis and asks to make it readable. You choose the visual form — never ask the user which chart or diagram they want.
argument-hint: "What do you want to see?"
---

The user wants something made visible. They will describe **what they have** ("these
benchmark numbers", "how the auth flow works", "these four options") — not **what form
it should take**. Choosing the form is your job, not theirs. Never reply with "would you
like a bar chart or a line chart?"

## Procedure

1. **Get the data.** Read the files, run the query, search the code — whatever the source
   is. Never invent numbers to fill a gap; if a value is missing, mark it as missing in
   the output.
2. **Name the question.** Write one sentence: what should a reader know after ten seconds
   of looking? Everything below follows from this. If the question is genuinely unclear
   and two readings would produce different pages, ask — one question, then proceed.
3. **Pick the form** from the tables below, driven by the question and the shape of the data.
4. **Pick the layout and theme** from `references/page.md`. Read it before every build;
   it also sets how much text the page may carry.
5. **Say what you picked, and why, in one line** before you build. Use the proper names:
   "Slope chart in a side-by-side layout, Report theme — it shows each service's
   before/after and which ones regressed." This is deliberate: it gives the user the
   vocabulary to ask for it directly next time.
6. **Build one self-contained HTML file.** See Output below. For node-and-edge diagrams,
   read `references/diagrams.md` first: you write a JSON spec, and `scripts/build.mjs`
   validates it and inlines the renderer.
7. **Check it.** For node-and-edge diagrams, run `scripts/check.mjs` and look at the
   screenshots it saves, including the dark-mode one. Fix what it reports before you
   open the page.
8. **Open it** with `open <file>` (macOS) and tell the user the path.

## Choosing the form — quantitative

Match the *relationship* you need to show, not the data type.

| The question is about | Form | Notes |
|---|---|---|
| Ranking / comparing magnitudes across categories | Horizontal bar, sorted by value | Sort by value, not alphabetically, unless the category order is meaningful |
| Change over time, many points | Line chart | One line per series; label lines directly, drop the legend |
| Change between exactly two points in time | Slope chart | Far better than paired bars for "who improved, who regressed" |
| Part of a whole | Stacked bar (single bar, or one per period) | Use a pie only for 2–3 slices; never for more |
| Distribution of one variable | Histogram, or strip plot if n < 50 | An average alone hides the shape — show the spread |
| Latency / percentile data | Bar of p50/p95/p99, or a CDF | Never a mean; tail latency is the point |
| Relationship between two variables | Scatter plot | Add a trend line only if you state the correlation |
| One value against a target or budget | Bullet bar, or a single big number with a delta | Not a gauge |
| Two dimensions across many categories | Heatmap table | Cells carry both the number and the color |
| A single headline figure | Big number with unit and comparison | A number with no comparison means nothing |

Composite pages: a KPI row (3–5 big numbers) on top, then the charts that explain them.

## Choosing the form — explanatory

Most of what needs illustrating is not numeric. These are inline SVG or styled HTML —
never ASCII art.

| The question is about | Form | Spec `type` |
|---|---|---|
| How a request or job moves through stages | Flow diagram | `flow` |
| Which person or team does each step of a process | Swimlane flow | `flow` with `lanes` |
| How components relate | Architecture diagram, grouped by boundary | `architecture` |
| Who calls whom, in what order | Sequence diagram | `sequence` |
| What states one entity moves through, and on which events | State machine | `state` |
| Branching logic or a decision | Decision tree | `tree` |
| What must build, deploy, or run before what | Dependency graph | `dag` |
| Order of events over time | Horizontal timeline, or a Gantt bar per phase | |
| Comparing 3+ options against shared criteria | Comparison table, criteria as rows, options as columns, verdict row last | |
| Trade-offs between two axes | 2×2 quadrant with the options plotted | |
| Nesting or containment | Nested boxes, not an indented list | |
| Code with commentary | Code block with numbered margin annotations | |
| Before / after a change | Side-by-side panes, differences highlighted | |

Forms with a spec `type` are node-and-edge diagrams; build them from a spec, as
`references/diagrams.md` describes. When two of them seem to fit, choose this way:

- **Sequence or flow:** use a sequence diagram when two or more actors exchange messages
  and their order matters. Use a flow when the stages matter more than who performs them.
- **State machine or flow:** use a state machine when one entity returns to states it
  was in before, such as retries or reopened tickets.
- **Flow or swimlane flow:** add lanes only when handoffs between owners are the point.
- **Decision tree or decision table:** use a table when conditions combine rather than
  nest, when subtrees repeat, or when the tree would go past four levels.
- **Architecture or dependency graph:** use a dependency graph when the question is
  ordering (what must exist first), not how components talk at runtime.

Default to a picture. When the content has no numbers and no structure, use a
key-number tile, an annotated example, labeled cards, or a before/after pane rather than
a paragraph. A diagram that only restates a sentence adds nothing; draw what the sentence
leaves implicit, or use one of those components.

## Output

One HTML file, self-contained: no CDN links, no external fonts, no network calls. It must
render offline, from a file path, forever. Charts are inline SVG that you generate — do
not pull in a charting library. The one exception is node-and-edge diagrams: the build
script inlines this skill's renderer (and its vendored layout library) into the page, so
the page stays offline. Save to the current workspace if it has an obvious home for it,
otherwise the OS temp directory.

Build the page from the layout and theme you picked in `references/page.md`. Pictures
lead and words label: every section has a visual, and captions stay under about 30
words. Legible beats fancy, and the theme sets the page's character, not the data's. If
the `dataviz` skill is available, follow its palette and mark rules for anything with
axes — it owns chart styling; this skill owns which chart.

Every page carries:
- A title, and a one-line summary of the finding directly under it — the takeaway in
  words, not just in pixels.
- Units, scale, and time range on every axis and every big number.
- A source line: where the data came from, and when it was pulled.
- Explicit gaps: if data is missing or estimated, label it on the page.

Responsive down to phone width, readable in light and dark mode, and legible when
printed. Add interactivity only when it
answers a question the static page cannot — a filter over many series, a slider over a
parameter. Never for decoration.

## Never

- ASCII or Unicode box-drawing diagrams. You are writing HTML; use SVG.
- Hand-placed SVG coordinates for a node-and-edge diagram. Write the spec.
- Opening a node-and-edge diagram the check has not passed without saying what failed.
- 3D, drop shadows on data marks, gradients on bars, rainbow palettes.
- A truncated y-axis on a bar chart. Bars start at zero.
- Dual y-axes — split into two stacked charts sharing an x-axis.
- Pie charts with more than three slices.
- A legend when direct labels on the marks would do.
- Color as the only carrier of meaning; pair it with position, label, or shape.
- Charting a single data point, or a chart of three numbers. Use key-number tiles.
- A section of prose with no visual, or a caption that has grown into a paragraph.
