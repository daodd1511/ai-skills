# Page design

This file covers what the page around the visuals looks like: how much text it carries,
which layout it uses, and which theme. `SKILL.md` covers which chart or diagram to draw;
`diagrams.md` covers node-and-edge specs.

## Pictures lead, words label

The reader should get the answer from the visuals and use the text only to confirm it.

- **Every section has a visual.** A section of prose alone is a sign that a picture is
  missing. The only text without a visual is the title, the summary line under it, and
  the source line.
- **Captions stay short:** one claim of up to about 30 words. If a caption grows into a
  paragraph, draw what the paragraph explains: a second diagram, an annotation on the
  chart, or a before/after pane.
- **A visual has to make sense with its caption covered.** Label marks, nodes, and
  regions directly on the graphic.
- **Use structured HTML for sets and comparisons**, not drawings: labeled cards, sorted
  bins, and comparison tables. HTML wraps, reflows, and lets the reader select text.
- **Show real examples.** Use the actual identifiers, values, commands, or records from
  the source, not placeholders. Sorting six examples into two labeled groups teaches the
  rule behind them; one example teaches nothing.
- **Headings state claims.** "p99 doubled after the cache change" beats "Latency".

When content has no numbers and no structure, it still gets a visual: a big-number tile,
an annotated example, labeled cards, or a before/after pane. Never invent a quantitative
chart to get one.

## Layouts

Choose the layout from the question, the same way you choose the chart form. A page uses
one layout. Build it with CSS grid and make it collapse to one column below 640px.

| The page answers | Layout | Structure |
|---|---|---|
| One question with one visual answer | **Hero figure** | Title and summary, one full-width figure, then 2–4 short notes in a row beneath it |
| How several metrics stand | **Dashboard** | A row of 3–5 key-number tiles, then a two-column grid of chart cards, each card titled with its claim |
| How a mechanism, system, or process works | **Scroll story** | One idea per section, each filling most of a screen, in reading order: claim heading, visual, caption. Close with a section giving the rule the reader can apply |
| Which option, or what changed | **Side by side** | Two or three aligned panes on the same scale and in the same order, with differences highlighted, then a verdict strip across the full width |
| What a piece of code, config, or document does | **Annotated walkthrough** | The artifact in a wide column with numbered markers, and matching notes in a narrow margin column. On phones, notes follow each block |

When a page needs two layouts, it is usually two questions. Build the one the user asked
about and name the second in the summary.

## Components

Use these components instead of paragraphs:

- **Key-number tile:** the value large, the unit beside it, and the comparison below it
  ("+18% vs. last week"). Use tabular figures.
- **Annotation:** a short label with a leader line, placed on the mark it explains.
  Annotate the one or two marks the caption talks about, not every mark.
- **Sorted bins:** labeled groups of example cards, such as "Matches" and "Does not
  match", or one group per category.
- **Step rail:** numbered steps on a line, each with a one-line label. Use it for
  sequences too short to need a flow diagram.
- **Comparison table:** criteria as rows, options as columns, and a verdict row last.
  Mark the winning cell in each row with the accent color and a text marker.
- **Callout:** a tinted box for the one exception or warning the reader must not miss.
  Use at most one per section.

## Themes

A theme is a set of tokens for colors, fonts, and spacing. Choose one from the content
and the audience, never at random, and name it along with the form before you build.

| Theme | Use for | Type | Character |
|---|---|---|---|
| **Report** | Data findings, benchmarks, incident numbers | System sans | Neutral and cool, blue accent. The default when nothing else fits |
| **Editorial** | Concepts, explainers, narratives, scroll stories | Serif headings and body | Warm paper background, rust accent, wide measure |
| **Technical** | Architecture, code, protocols, systems | Sans body, monospace headings and labels | Cool slate, teal accent, faint grid on the page background |
| **Dashboard** | Many metrics at once, status pages | System sans, compact | Cards on a gray canvas, violet accent, tighter spacing |

Every theme meets WCAG AA contrast (at least 4.5:1) for text, secondary text, and accent
on both the background and the surface, in light and dark mode. If you change a token,
recheck that contrast.

### Tokens

Put the tokens on `:root`. The diagram runtime reads `--fg`, `--muted`, `--accent`,
`--accent-soft`, `--bg`, `--surface`, and `--border` from `:root`, so diagrams follow
the theme without extra CSS. Tokens defined on any other element do not reach the
diagrams.

```css
/* Report */
:root {
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-head: var(--font-body);
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --bg: #ffffff; --surface: #f6f8fa; --border: #d0d7de;
  --fg: #1f2328; --muted: #57606a; --accent: #0550ae; --accent-soft: #eaf1fb;
  --measure: 72rem; --gap: 2rem;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117; --surface: #161b22; --border: #30363d;
    --fg: #e6edf3; --muted: #9198a1; --accent: #58a6ff; --accent-soft: #132339;
  }
}

/* Editorial */
:root {
  --font-body: Charter, "Bitstream Charter", "Iowan Old Style", Georgia, serif;
  --font-head: var(--font-body);
  --bg: #fbfaf7; --surface: #f3efe7; --border: #ddd6c9;
  --fg: #26231f; --muted: #665f55; --accent: #9a3412; --accent-soft: #f7e6dc;
  --measure: 46rem; --gap: 3rem;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1b1a17; --surface: #24221e; --border: #3a3731;
    --fg: #ece8e1; --muted: #a39d93; --accent: #f0915f; --accent-soft: #3a2418;
  }
}

/* Technical */
:root {
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-head: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --bg: #f7f9fb; --surface: #eef2f6; --border: #cbd5e1;
  --fg: #0f172a; --muted: #475569; --accent: #0f766e; --accent-soft: #dff3f0;
  --measure: 72rem; --gap: 2rem;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1020; --surface: #131a2e; --border: #26314d;
    --fg: #e2e8f0; --muted: #94a3b8; --accent: #2dd4bf; --accent-soft: #0f2e2c;
  }
}
/* Technical grid background: */
body {
  background-image: linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 32px 32px;
  background-color: var(--bg);
}
/* Put figures and cards on var(--bg) so the grid never runs behind text or marks. */

/* Dashboard */
:root {
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-head: var(--font-body);
  --bg: #f4f5f7; --surface: #ffffff; --border: #dfe2e7;
  --fg: #16181d; --muted: #5b6270; --accent: #6d28d9; --accent-soft: #efe9fc;
  --measure: 88rem; --gap: 1.25rem;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e1116; --surface: #171b22; --border: #2a303a;
    --fg: #e8eaed; --muted: #9aa1ad; --accent: #a78bfa; --accent-soft: #261c3d;
  }
}
```

Each theme block includes the `--font-mono` line from Report; the other blocks omit it
for brevity.

### Rules for every theme

- Set `color-scheme: light dark` on `:root`, and set an explicit `background` on `body`.
  The diagram runtime switches to dark colors only when `color-scheme` includes `dark`.
- Use the accent for one thing per visual: the mark, series, or path the caption talks
  about. Draw everything else in `--muted` or `--fg`.
- For categorical series colors, follow the `dataviz` skill if it is available. The
  theme owns the page and the single highlight, not the categorical palette.
- Scale text with the layout: body text at 17–18px, and at 20px or more in scroll
  stories. Headings are much larger than body text.
- Use only system fonts. The page must render offline, and an embedded font adds 20–100
  KB per file.
- Keep the rules from the `Never` list in `SKILL.md`. A theme changes the page's
  character, never its honesty: no gradients on data, no shadows on marks, no
  decorative 3D.
