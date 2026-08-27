---
name: eli5
description: Build a self-contained visual page that takes the reader from knowing nothing about a topic to being able to use and defend it. Use when the user says "eli5", "explain like I'm five", "explain it simply", or asks for a beginner-level explanation of a concept, system, or piece of code.
argument-hint: "What should I explain?"
---

Take a reader who is sharp and competent in their own field but has zero context on this
topic, and leave them able to use it and hold their own when questioned about it.
Recognising the shape of the thing is not enough. The output is a visual page: pictures
and structure carry the explanation, words label them.

## Procedure

1. **Get the facts first.** Read the code, the docs, the specification — whatever the
   topic actually is. Simplifying something you have not verified produces confident
   nonsense.
2. **Write the one sentence.** What should the reader be able to say once they finish?
   Every section on the page serves that sentence.
3. **Set the tier** — after step 1, never before. The shape of a topic only becomes clear
   once you know the facts.
4. **Say the tier and the section list to the user** in a line or two before you build. A
   tier called too low is this skill's main failure; announcing it makes the call visible
   while it can still be corrected.
5. **Anchor each idea in something the reader already knows** — a queue at a counter, a
   locked mailbox, a recipe. One comparison per idea, and say where it breaks down if the
   gap matters.
6. **Build the page** as one self-contained HTML file in the OS temp directory. Write it
   with a redirect that overwrites even under `noclobber` (`>|`), confirm the file
   actually changed, then `open` it (macOS) and tell the user the path. Do not publish it
   as an Artifact.

## How long the page runs

Match the number of sections to the shape of the topic. These are floors, not targets:

- **One distinction or one idea** — 3 to 5 sections.
- **A mechanism, a protocol, a workflow** — 6 to 9 sections.
- **A system, a codebase, a whole field** — 10 or more.

Depth arrives as more sections, never as longer ones. Ten short sections beat four dense
ones. The moment a caption becomes a paragraph, the picture has stopped leading.

## What every page must have

- **Real examples, several, sorted.** The actual addresses, identifiers, commands, code,
  or configuration. One example teaches nothing; six sorted into two labelled groups
  teaches the rule behind them.
- **Boundary cases**, whenever the topic is a definition or a distinction: one case that
  looks like the thing but is not, and one that is the thing but does not look like it.
  This is where understanding gets tested.
- **The real names.** Give each term of art once in bold with a plain-words definition,
  then use it consistently. The reader will meet these words in a document or a
  conversation and has to be able to use them.
- **A rule they can apply**, as the closing section: a decision procedure that works on a
  case the page never showed them.

If the user says why they want the topic — an interview, a review, a conversation they
have to hold — add one closing section giving the answer in the words they would say out
loud. Never ask for that purpose. Build for command of the topic either way.

## What the page looks like

- **One idea per section**, stacked vertically, each filling most of a screen. The reader
  scrolls through the explanation in order.
- **Drawn diagrams for mechanisms, relationships, and flows.** Inline SVG you draw:
  labeled boxes and arrows, before/after panes, a container holding smaller containers, a
  timeline, a decision split. It should make sense with the caption covered.
- **Structured layout for sets and comparisons.** Sorted bins, comparison tables, labelled
  cards — real HTML, which wraps, reflows, and can be selected as text. Never force a
  twelve-item example set into a drawing.
- **Few words, large.** A short heading and at most ~30 words of caption per section. The
  reason line under an individual example does not count against that budget. Body text at
  20px or more; headings much larger. Whitespace over density.
- **A plain-language title and one-sentence summary** at the top. At the bottom, the rule
  the reader can apply, then one short note naming what you left out.
- Self-contained, responsive, readable in light and dark. No external assets.

## Language rules

- Short sentences, active voice, present tense. Address the reader as "you".
- Plain words carry the explanation; the term of art rides alongside so the reader can use
  it elsewhere. Never leave a term undefined, and never leave the real one out.
- Concrete over abstract: "the server keeps a copy for five minutes", not "results are
  cached with a TTL".
- Never say "simply", "just", or "obviously".

## Never

- Emoji as illustration, ASCII art, or stock icons standing in for a diagram.
- A wall of prose with a decorative image beside it — that is an article, not this.
- Lying to simplify. Leave detail out, and say what you left out; do not state something
  false because it is easier. If a simplification is wrong in an important case, put that
  case on the page.
- The topic's history, or the alternatives it beat. Explain the thing itself.
- Shrinking a complex topic to fit a small page. If it takes twelve sections, it takes
  twelve sections.
