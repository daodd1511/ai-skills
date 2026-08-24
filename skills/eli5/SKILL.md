---
name: eli5
description: Explain a topic to someone who knows nothing about it, as a self-contained HTML page made of big pictures and few words. Use when the user says "eli5", "explain like I'm five", "explain it simply", or asks for a beginner-level explanation of a concept, system, or piece of code.
argument-hint: "What should I explain?"
---

Explain the topic to someone who knows nothing about it — not a junior engineer, not a
new hire, someone from outside the field entirely. The output is a visual page: pictures
carry the explanation, words label the pictures.

## Procedure

1. **Get the facts first.** Read the code, the docs, the thread — whatever the topic
   actually is. Simplifying something you have not verified produces confident nonsense.
2. **Write the one sentence.** What should the reader understand after two minutes? Every
   picture on the page serves that sentence. If you cannot write it, you do not understand
   the topic well enough to simplify it yet.
3. **Cut to three to six ideas.** Each becomes one section with one picture. More than six
   means you are teaching the topic, not explaining it — use the `teach` skill for that.
4. **Anchor each idea in something the reader already knows** — a queue at a counter, a
   locked mailbox, a recipe. One comparison per idea, and say where it breaks down if the
   gap matters.
5. **Build the page** as one self-contained HTML file in the OS temp directory, `open` it
   (macOS), and tell the user the path. Do not publish it as an Artifact.

## What the page looks like

- **One idea per section**, stacked vertically, each filling most of a screen. The reader
  scrolls through the explanation in order.
- **The picture is the explanation.** Inline SVG you draw: labeled boxes and arrows,
  before/after panes, a container holding smaller containers, a timeline. It should make
  sense with the caption covered.
- **Few words, large.** A short heading and at most ~30 words of caption per section. Body
  text at 20px or more; headings much larger. Whitespace over density.
- **A plain-language title and one-sentence summary** at the top, and a short "so what"
  at the bottom: what the reader can now do or decide.
- Self-contained, responsive, readable in light and dark. No external assets.

## Language rules

- No jargon. If a term is unavoidable (the reader will meet it elsewhere), give it once in
  bold with a plain-words definition, then use it consistently.
- Short sentences, active voice, present tense. Address the reader as "you".
- No acronyms unspelled, no code, no configuration, no version numbers, no API names.
- Concrete over abstract: "the server keeps a copy for 5 minutes", not "results are cached
  with a TTL".
- Never say "simply", "just", or "obviously".

## Never

- Emoji as illustration, ASCII art, or stock icons standing in for a diagram.
- A wall of prose with a decorative image beside it — that is an article, not this.
- Lying to simplify. Leave detail out, and say what you left out; do not state something
  false because it is easier. If a simplification is wrong in an important case, put that
  case on the page in one line.
- Explaining the topic's history, alternatives, or edge cases. One thing, explained.
