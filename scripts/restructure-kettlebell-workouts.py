#!/usr/bin/env python3
"""
Restructure kettlebell workout markdown files so that multi-section wod blocks
(broken out by Day, Week, Phase, etc.) become individual named wod blocks with
### headings.
"""

import os
import re
from collections import Counter

KB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      'wod', 'kettlebell')

LABEL_PAT = re.compile(r'^([A-Za-z][A-Za-z0-9 \-/&().]+):\s*$')


def find_label_lines(lines):
    """Return list of (line_index, label_text) for all section-label lines."""
    result = []
    for i, line in enumerate(lines):
        m = LABEL_PAT.match(line)
        if m:
            result.append((i, m.group(1).rstrip(':')))
    return result


def has_workout_content(lines_slice):
    """Return True if any line in slice looks like actual workout content."""
    for line in lines_slice:
        s = line.strip()
        if s and not LABEL_PAT.match(line):
            return True
    return False


def split_sections(block_content):
    """
    Parse a wod block into named sections.

    Returns a list of (section_name, content_str) pairs.
    - If no multi-section structure is found, returns [(None, block_content)].
    - Container labels (immediately followed by another label, no content of
      their own) become prefixes for their child sections when those child
      labels are ambiguous (repeat).
    """
    lines = block_content.rstrip('\n').split('\n')
    label_lines = find_label_lines(lines)

    if not label_lines:
        return [(None, block_content)]

    # Determine which labels are "substantive" (have workout content before the
    # next label or end-of-block) vs "container" (only followed by another label).
    def content_between(start_line, end_line):
        return has_workout_content(lines[start_line:end_line])

    substantive_indices = []
    for pos, (line_idx, label_text) in enumerate(label_lines):
        next_label_line = label_lines[pos + 1][0] if pos + 1 < len(label_lines) else len(lines)
        if content_between(line_idx + 1, next_label_line):
            substantive_indices.append(pos)

    if len(substantive_indices) < 2:
        # Zero or one substantive section → no restructuring needed.
        return [(None, block_content)]

    # Build a mapping: substantive label index → nearest preceding container label
    container_indices = [i for i in range(len(label_lines)) if i not in substantive_indices]

    # For each substantive label, find the closest container label that precedes it
    def nearest_container_before(sub_pos):
        candidate = None
        for ci in container_indices:
            if ci < sub_pos:
                candidate = ci
        return candidate

    # Detect repeating sub-labels (like "Day 1" appearing multiple times)
    sub_label_texts = [label_lines[i][1] for i in substantive_indices]
    label_counts = Counter(sub_label_texts)
    repeating = {t for t, c in label_counts.items() if c > 1}

    sections = []
    for pos_in_sub, sub_pos in enumerate(substantive_indices):
        line_idx, label_text = label_lines[sub_pos]

        # Build full section name
        cont = nearest_container_before(sub_pos)
        if cont is not None and label_text in repeating:
            full_name = f"{label_lines[cont][1]} - {label_text}"
        else:
            full_name = label_text

        # Collect content lines: from after this label to the next substantive label
        content_start = line_idx + 1
        if pos_in_sub + 1 < len(substantive_indices):
            next_sub_pos = substantive_indices[pos_in_sub + 1]
            content_end = label_lines[next_sub_pos][0]
        else:
            content_end = len(lines)

        # Collect content lines, skipping any container-label lines that appear
        # inline within the slice (e.g. "Week 2:" between Day 3 and Day 1 blocks).
        container_line_indices = {label_lines[ci][0] for ci in container_indices}
        content_lines = [
            l for i, l in enumerate(lines[content_start:content_end], start=content_start)
            if i not in container_line_indices
        ]
        content = '\n'.join(content_lines).strip()
        sections.append((full_name, content))

    return sections


def extract_wod_block(text):
    """
    Extract the single ```wod ... ``` block from markdown text.
    Returns (before, block_content, after) or None if not found.
    """
    m = re.search(r'^```wod\n(.*?)^```', text, re.DOTALL | re.MULTILINE)
    if not m:
        return None
    before = text[:m.start()]
    after = text[m.end():]
    return before, m.group(1), after


def build_multi_section_markdown(sections, original_before, original_after):
    """
    Given sections list of (name, content), build the new markdown replacing
    the single wod block with one ### heading + wod block per section.
    """
    parts = []
    for name, content in sections:
        parts.append(f"### {name}\n\n```wod\n{content}\n```")

    return original_before + '\n'.join(parts) + '\n' + original_after


def process_file(filepath):
    with open(filepath, 'r') as f:
        text = f.read()

    result = extract_wod_block(text)
    if result is None:
        return False  # No wod block

    before, block_content, after = result
    sections = split_sections(block_content)

    if sections[0][0] is None:
        return False  # No multi-section structure

    new_text = build_multi_section_markdown(sections, before, after)

    with open(filepath, 'w') as f:
        f.write(new_text)

    return True


def main():
    changed = []
    skipped = []

    for root, dirs, files in os.walk(KB_DIR):
        # Only process subdirectories (individual workouts), not the source files
        depth = root.replace(KB_DIR, '').count(os.sep)
        if depth < 1:
            continue
        for fname in sorted(files):
            if not fname.endswith('.md'):
                continue
            filepath = os.path.join(root, fname)
            rel = os.path.relpath(filepath, KB_DIR)
            if process_file(filepath):
                changed.append(rel)
                print(f"  RESTRUCTURED: {rel}")
            else:
                skipped.append(rel)

    print(f"\nRestructured: {len(changed)} files")
    print(f"Unchanged:    {len(skipped)} files")


if __name__ == '__main__':
    main()
