#!/usr/bin/env python3
"""Convert the qa-handoff Markdown subset to Atlassian Document Format (ADF).

Usage:
  md2adf.py convert <draft.md>            ADF JSON on stdout
  md2adf.py outline <draft.md|adf.json>   block outline on stdout, one line per block

The outline of a draft and the outline of the posted comment must match; a
mismatch means Jira dropped or flattened structure.

Supported Markdown: `##`-`######` headings, paragraphs, `-` and `1.` lists
nested by two spaces, `> [!NOTE]` panels, `**bold**`, `` `code` ``, and
`[text](url)` links. Anything else is rejected, not guessed.
"""

import json
import re
import sys

INLINE = re.compile(r"\*\*(?P<bold>.+?)\*\*|`(?P<code>[^`]+)`|\[(?P<text>[^\]]+)\]\((?P<href>[^)\s]+)\)")
LIST_ITEM = re.compile(r"^(?P<indent> *)(?P<marker>-|\d+\.) (?P<body>.*)$")
HEADING = re.compile(r"^(?P<hashes>#{2,6}) (?P<body>.+)$")
PANEL_START = re.compile(r"^> \[!NOTE\]\s*$")


class UnsupportedMarkdown(ValueError):
    pass


def inline(text):
    nodes = []
    pos = 0
    for m in INLINE.finditer(text):
        if m.start() > pos:
            nodes.append({"type": "text", "text": text[pos:m.start()]})
        if m.group("bold") is not None:
            nodes.extend(_with_mark(inline(m.group("bold")), {"type": "strong"}))
        elif m.group("code") is not None:
            nodes.append({"type": "text", "text": m.group("code"), "marks": [{"type": "code"}]})
        else:
            mark = {"type": "link", "attrs": {"href": m.group("href")}}
            nodes.extend(_with_mark(inline(m.group("text")), mark))
        pos = m.end()
    if pos < len(text):
        nodes.append({"type": "text", "text": text[pos:]})
    return nodes


def _with_mark(nodes, mark):
    for n in nodes:
        n.setdefault("marks", []).append(mark)
    return nodes


def paragraph(text):
    return {"type": "paragraph", "content": inline(text)}


def parse_list(lines, i, indent):
    m = LIST_ITEM.match(lines[i])
    ordered = m.group("marker") != "-"
    node = {"type": "orderedList" if ordered else "bulletList", "content": []}
    while i < len(lines):
        m = LIST_ITEM.match(lines[i])
        if not m or len(m.group("indent")) < indent:
            break
        if len(m.group("indent")) > indent:
            if not node["content"]:
                raise UnsupportedMarkdown(f"line {i + 1}: list starts indented")
            child, i = parse_list(lines, i, len(m.group("indent")))
            node["content"][-1]["content"].append(child)
            continue
        if (m.group("marker") != "-") != ordered:
            break
        node["content"].append({"type": "listItem", "content": [paragraph(m.group("body"))]})
        i += 1
    return node, i


def convert(md):
    lines = md.splitlines()
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith("# "):
            raise UnsupportedMarkdown(f"line {i + 1}: H1 is not allowed in a comment")
        if (m := HEADING.match(line)) is not None:
            blocks.append({"type": "heading", "attrs": {"level": len(m.group("hashes"))},
                           "content": inline(m.group("body"))})
            i += 1
        elif PANEL_START.match(line):
            i += 1
            body = []
            while i < len(lines) and lines[i].startswith(">"):
                body.append(lines[i][1:].strip())
                i += 1
            text = " ".join(t for t in body if t)
            if not text:
                raise UnsupportedMarkdown(f"line {i}: empty note panel")
            blocks.append({"type": "panel", "attrs": {"panelType": "note"}, "content": [paragraph(text)]})
        elif line.startswith(">"):
            raise UnsupportedMarkdown(f"line {i + 1}: only `> [!NOTE]` panels are supported")
        elif LIST_ITEM.match(line):
            if LIST_ITEM.match(line).group("indent"):
                raise UnsupportedMarkdown(f"line {i + 1}: list starts indented")
            node, i = parse_list(lines, i, 0)
            blocks.append(node)
        elif line.startswith(("```", "|", "    ")):
            raise UnsupportedMarkdown(f"line {i + 1}: code blocks, tables and indented text are not supported")
        else:
            para = [line.strip()]
            i += 1
            while i < len(lines) and lines[i].strip() and not _starts_block(lines[i]):
                para.append(lines[i].strip())
                i += 1
            blocks.append(paragraph(" ".join(para)))
    return {"type": "doc", "version": 1, "content": blocks}


def _starts_block(line):
    return bool(HEADING.match(line) or LIST_ITEM.match(line) or line.startswith((">", "# ")))


def plain(node):
    if node.get("type") == "text":
        return node["text"]
    return "".join(plain(c) for c in node.get("content", []))


def outline(doc):
    out = []

    def walk(node, depth):
        t = node["type"]
        if t == "heading":
            out.append(f"{'  ' * depth}h{node['attrs']['level']} {plain(node)}")
        elif t == "panel":
            out.append(f"{'  ' * depth}panel:{node['attrs'].get('panelType')} {plain(node)}")
        elif t in ("bulletList", "orderedList"):
            for item in node["content"]:
                first, *rest = item["content"]
                out.append(f"{'  ' * depth}{'-' if t == 'bulletList' else '1.'} {plain(first)}")
                for sub in rest:
                    walk(sub, depth + 1)
        elif t == "paragraph":
            out.append(f"{'  ' * depth}p {plain(node)}")
        else:
            out.append(f"{'  ' * depth}{t}")

    for block in doc.get("content", []):
        walk(block, 0)
    return "\n".join(out)


def load_doc(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if not path.endswith(".json"):
        return convert(text)
    data = json.loads(text)
    # Accept a bare ADF doc, a comment object, or `acli ... --json` comment output.
    if "body" in data:
        data = data["body"]
    return data


def main(argv):
    if len(argv) != 3 or argv[1] not in ("convert", "outline"):
        print(__doc__.strip(), file=sys.stderr)
        return 2
    try:
        if argv[1] == "convert":
            with open(argv[2], encoding="utf-8") as f:
                print(json.dumps(convert(f.read()), ensure_ascii=False, indent=2))
        else:
            print(outline(load_doc(argv[2])))
    except UnsupportedMarkdown as e:
        print(f"md2adf: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
