#!/usr/bin/env python3
"""Build the pass-1 requirements packet from a Jira work item.

Usage:
  acli jira workitem view <KEY> --fields summary,issuetype,description,comment --json > ticket.json
  packet.py <ticket.json> [--exclude-email <author email>]

Prints Markdown on stdout: the summary, the issue type, the description, every
link in it, and the comments from authors other than --exclude-email. The
input is the work item only, so no PR or diff text can reach the packet.
"""

import argparse
import json
import sys


def inline(node):
    t = node.get("type")
    if t == "text":
        text = node["text"]
        for mark in node.get("marks", []):
            if mark["type"] == "strong":
                text = f"**{text}**"
            elif mark["type"] == "code":
                text = f"`{text}`"
            elif mark["type"] == "link":
                text = f"[{text}]({mark['attrs']['href']})"
        return text
    if t == "hardBreak":
        return "\n"
    if t == "mention":
        return "@" + node["attrs"].get("text", "").lstrip("@")
    if t in ("inlineCard", "blockCard"):
        return f"<{node['attrs'].get('url', '')}>"
    if t in ("emoji", "status"):
        return node["attrs"].get("text", "")
    return "".join(inline(c) for c in node.get("content", []))


def block(node, depth=0):
    t = node.get("type")
    content = node.get("content", [])
    pad = "  " * depth
    if t == "paragraph":
        return pad + inline(node)
    if t == "heading":
        return "#" * node["attrs"]["level"] + " " + inline(node)
    if t in ("bulletList", "orderedList", "taskList"):
        lines = []
        for n, item in enumerate(content, 1):
            marker = "-" if t != "orderedList" else f"{n}."
            parts = [block(c, depth + 1) if c.get("type") in ("bulletList", "orderedList", "taskList")
                     else inline(c) for c in item.get("content", [])]
            first, *rest = parts or [""]
            lines.append(f"{pad}{marker} {first.strip()}")
            lines.extend(rest)
        return "\n".join(lines)
    if t == "table":
        rows = ["| " + " | ".join(" ".join(block(p) for p in cell.get("content", [])).replace("\n", " ")
                                  for cell in row.get("content", [])) + " |" for row in content]
        if rows:
            rows.insert(1, "|" + "---|" * len(content[0].get("content", [])))
        return "\n".join(rows)
    if t == "codeBlock":
        return "```\n" + inline(node) + "\n```"
    if t == "panel":
        return "> " + "\n> ".join(block(c) for c in content)
    if t in ("mediaSingle", "mediaGroup", "media"):
        return "[image]"
    if t == "rule":
        return "---"
    return "\n".join(block(c, depth) for c in content)


def to_md(doc):
    if not doc:
        return ""
    return "\n\n".join(block(b) for b in doc.get("content", []))


def links(doc):
    found = []

    def walk(node):
        for mark in node.get("marks", []):
            if mark["type"] == "link":
                found.append(mark["attrs"]["href"])
        if node.get("type") in ("inlineCard", "blockCard"):
            found.append(node["attrs"].get("url", ""))
        for c in node.get("content", []):
            walk(c)

    if doc:
        walk(doc)
    return list(dict.fromkeys(u for u in found if u))


def build(ticket, exclude_email):
    fields = ticket["fields"]
    description = fields.get("description")
    out = [
        f"# {ticket.get('key', '')} {fields.get('summary', '')}".strip(),
        f"Issue type: {(fields.get('issuetype') or {}).get('name', 'unknown')}",
        "## Description",
        to_md(description) or "(empty)",
    ]
    urls = links(description)
    if urls:
        out += ["## Links in the description", "\n".join(f"- {u}" for u in urls)]
    comments = [c for c in (fields.get("comment") or {}).get("comments", [])
                if not exclude_email or (c.get("author") or {}).get("emailAddress", "").lower() != exclude_email.lower()]
    if comments:
        out.append("## Comments from other people")
        for c in comments:
            out.append(f"### {(c.get('author') or {}).get('displayName', 'unknown')}, {c.get('created', '')[:10]}")
            out.append(to_md(c.get("body")))
    return "\n\n".join(out) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("ticket")
    parser.add_argument("--exclude-email", default="")
    args = parser.parse_args()
    with open(args.ticket, encoding="utf-8") as f:
        ticket = json.load(f)
    sys.stdout.write(build(ticket, args.exclude_email))


if __name__ == "__main__":
    main()
