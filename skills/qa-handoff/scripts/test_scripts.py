#!/usr/bin/env python3
"""Unit tests for md2adf.py and packet.py. Run: python3 -m unittest test_scripts.py"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import md2adf  # noqa: E402
import packet  # noqa: E402

DRAFT = """Changes are available on dev as of `abc1234` (merged 2026-01-05)

## Before you start

- Accounts: a **Store Manager** and a **Clerk** in the same store.

## What to test (log in as a Store Manager, then as a Clerk, open Shifts)

### A. Shift list

[Design](https://example.com/design/1)

- A1 Open Shifts → the list shows "No shifts yet." when the store has none [AC]
- A2 Store Manager: type "kim" in search → only matching clerks remain [AC]
  - A2a Clear the search → the full list returns [impl]
1. first
2. second

> [!NOTE]
> Design difference: the design shows one Name input.
> The API needs first and last name.

## Not in this ticket

- Shift export (SHOP-12).
"""


class Md2AdfTest(unittest.TestCase):
    def test_structure(self):
        doc = md2adf.convert(DRAFT)
        types = [b["type"] for b in doc["content"]]
        self.assertEqual(types, ["paragraph", "heading", "bulletList", "heading", "heading",
                                 "paragraph", "bulletList", "orderedList", "panel", "heading", "bulletList"])
        self.assertEqual(doc["content"][1]["attrs"]["level"], 2)
        self.assertEqual(doc["content"][4]["attrs"]["level"], 3)

    def test_inline_marks(self):
        doc = md2adf.convert(DRAFT)
        first = doc["content"][0]["content"]
        self.assertEqual(first[1], {"type": "text", "text": "abc1234", "marks": [{"type": "code"}]})
        link = doc["content"][5]["content"][0]
        self.assertEqual(link["marks"], [{"type": "link", "attrs": {"href": "https://example.com/design/1"}}])
        bold = doc["content"][2]["content"][0]["content"][0]["content"][1]
        self.assertEqual(bold["marks"], [{"type": "strong"}])

    def test_nested_list(self):
        item = md2adf.convert(DRAFT)["content"][6]["content"][1]
        self.assertEqual([c["type"] for c in item["content"]], ["paragraph", "bulletList"])

    def test_panel_joins_lines(self):
        panel = md2adf.convert(DRAFT)["content"][8]
        self.assertEqual(panel["attrs"], {"panelType": "note"})
        self.assertEqual(md2adf.plain(panel),
                         "Design difference: the design shows one Name input. The API needs first and last name.")

    def test_outline_round_trip(self):
        doc = md2adf.convert(DRAFT)
        self.assertEqual(md2adf.outline(doc), md2adf.outline(json.loads(json.dumps(doc))))
        self.assertIn("h3 A. Shift list", md2adf.outline(doc))
        self.assertIn("  - A2a Clear the search → the full list returns [impl]", md2adf.outline(doc))

    def test_rejects_unsupported(self):
        for md in ("# Title", "| a | b |", "```\ncode\n```", "> plain quote", "  - indented start"):
            with self.subTest(md=md), self.assertRaises(md2adf.UnsupportedMarkdown):
                md2adf.convert(md)


def adf(*blocks):
    return {"type": "doc", "version": 1, "content": list(blocks)}


def para(text, href=None):
    node = {"type": "text", "text": text}
    if href:
        node["marks"] = [{"type": "link", "attrs": {"href": href}}]
    return {"type": "paragraph", "content": [node]}


TICKET = {
    "key": "SHOP-7",
    "fields": {
        "summary": "Shift list",
        "issuetype": {"name": "Story"},
        "description": adf(
            {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Acceptance criteria"}]},
            {"type": "bulletList", "content": [
                {"type": "listItem", "content": [para("Managers can search clerks")]}]},
            para("Design", href="https://example.com/design/1"),
        ),
        "comment": {"comments": [
            {"author": {"displayName": "Dev", "emailAddress": "dev@example.com"},
             "created": "2026-01-04T10:00:00.000+0000", "body": adf(para("Implemented in PR #3, see diff"))},
            {"author": {"displayName": "PM", "emailAddress": "pm@example.com"},
             "created": "2026-01-03T10:00:00.000+0000", "body": adf(para("Search is by name only"))},
        ]},
    },
}


class PacketTest(unittest.TestCase):
    def test_contents(self):
        out = packet.build(TICKET, "DEV@example.com")
        self.assertIn("# SHOP-7 Shift list", out)
        self.assertIn("Issue type: Story", out)
        self.assertIn("- Managers can search clerks", out)
        self.assertIn("- https://example.com/design/1", out)
        self.assertIn("### PM, 2026-01-03", out)
        self.assertIn("Search is by name only", out)

    def test_excludes_author_comments(self):
        self.assertNotIn("Implemented in PR #3", packet.build(TICKET, "dev@example.com"))

    def test_empty_description(self):
        ticket = {"key": "SHOP-8", "fields": {"summary": "x", "description": None}}
        self.assertIn("(empty)", packet.build(ticket, ""))


if __name__ == "__main__":
    unittest.main()
