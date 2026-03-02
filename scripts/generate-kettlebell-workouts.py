#!/usr/bin/env python3
"""
Script to parse kettlebell source workout files and generate individual
workout markdown files and Storybook stories.
"""
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WOD_KB_DIR = os.path.join(BASE_DIR, 'wod', 'kettlebell')
STORIES_KB_DIR = os.path.join(BASE_DIR, 'stories', 'runtime', 'Kettlebell')

SOURCES = [
    {
        'file': 'dan-john-workouts.md',
        'slug': 'dan-john',
        'display': 'Dan John',
        'story_path': 'DanJohn',
    },
    {
        'file': 'geoff-neupert-workouts.md',
        'slug': 'geoff-neupert',
        'display': 'Geoff Neupert',
        'story_path': 'GeoffNeupert',
    },
    {
        'file': 'girevoy-sport-workouts.md',
        'slug': 'girevoy-sport',
        'display': 'Girevoy Sport',
        'story_path': 'GirevoySport',
    },
    {
        'file': 'joe-daniels-workouts.md',
        'slug': 'joe-daniels',
        'display': 'Joe Daniels',
        'story_path': 'JoeDaniels',
    },
    {
        'file': 'keith-weber-workouts.md',
        'slug': 'keith-weber',
        'display': 'Keith Weber',
        'story_path': 'KeithWeber',
    },
    {
        'file': 'mark-wildman-workouts.md',
        'slug': 'mark-wildman',
        'display': 'Mark Wildman',
        'story_path': 'MarkWildman',
    },
    {
        'file': 'steve-cotter-workouts.md',
        'slug': 'steve-cotter',
        'display': 'Steve Cotter',
        'story_path': 'SteveCotter',
    },
    {
        'file': 'strongfirst-workouts.md',
        'slug': 'strongfirst',
        'display': 'StrongFirst',
        'story_path': 'StrongFirst',
    },
]


def to_kebab(title: str) -> str:
    """Convert a workout title to a kebab-case filename."""
    # Remove parenthetical content
    title = re.sub(r'\([^)]+\)', '', title)
    # Replace non-alphanumeric chars with hyphens
    title = re.sub(r'[^a-zA-Z0-9]+', '-', title.strip())
    # Lowercase and strip trailing hyphens
    return title.lower().strip('-')


def to_pascal(title: str) -> str:
    """Convert a workout title to a PascalCase identifier."""
    title = re.sub(r'\([^)]+\)', '', title)
    words = re.split(r'[^a-zA-Z0-9]+', title.strip())
    return ''.join(w.capitalize() for w in words if w)


def parse_workouts(content: str):
    """
    Parse source markdown content into individual workout sections.
    Returns list of (title, body) tuples.
    """
    # Split on ## Workout N: headers
    pattern = re.compile(r'^## Workout \d+: (.+)$', re.MULTILINE)
    matches = list(pattern.finditer(content))

    workouts = []
    for i, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        # Get body (everything from the ## header to next workout or end)
        body = content[start:end].strip()
        # Remove --- separators at end
        body = re.sub(r'\n---\s*$', '', body).strip()
        workouts.append((title, body))

    return workouts


def generate_story_file(source: dict, workouts: list) -> str:
    """Generate the Storybook stories.tsx content for a source."""
    slug = source['slug']
    display = source['display']
    story_path = source['story_path']

    # Build relative path from stories/runtime/Kettlebell/<path>/ to wod/kettlebell/<slug>/
    # That's ../../../../wod/kettlebell/<slug>/
    wod_rel = f'../../../../wod/kettlebell/{slug}'

    imports = []
    exports = []

    for title, _ in workouts:
        kebab = to_kebab(title)
        pascal = to_pascal(title)
        var_name = f'markdown_{pascal}'
        imports.append(
            f"import {var_name} from '{wod_rel}/{kebab}.md?raw';"
        )
        exports.append(
            f"export const W{pascal}: Story = {{\n"
            f"  ...createWorkoutStory({var_name}, 'wod/kettlebell/{slug}/{kebab}.md'),\n"
            f"  name: '{title}'\n"
            f"}};"
        )

    imports_str = '\n'.join(imports)
    exports_str = '\n\n'.join(exports)

    return f"""import type {{ Meta, StoryObj }} from '@storybook/react';
import {{ StorybookWorkbench as Workbench }} from '../../../StorybookWorkbench';

{imports_str}

const meta: Meta<typeof Workbench> = {{
  title: 'Examples/Kettlebell/{display}',
  component: Workbench,
  args: {{
    showToolbar: false,
    showContextOverlay: false,
    readonly: true,
    theme: 'wod-light',
    hidePlanUnlessDebug: true,
    initialShowPlan: false,
    initialShowTrack: true,
    initialShowReview: true
  }},
  parameters: {{
    layout: 'fullscreen',
    docs: {{
      description: {{
        component: '{display} kettlebell workouts.'
      }}
    }}
  }}
}};

export default meta;
type Story = StoryObj<typeof meta>;

const createWorkoutStory = (content: string, source: string): Story => ({{
  args: {{ initialContent: content }},
  parameters: {{
    docs: {{
      description: {{
        story: `Markdown source: ${{source}}`
      }}
    }}
  }}
}});

{exports_str}
"""


def main():
    created_files = []
    created_stories = []

    for source in SOURCES:
        slug = source['slug']
        src_path = os.path.join(WOD_KB_DIR, source['file'])

        if not os.path.exists(src_path):
            print(f"SKIP: {src_path} not found")
            continue

        with open(src_path, 'r') as f:
            content = f.read()

        workouts = parse_workouts(content)
        print(f"\n{source['display']}: {len(workouts)} workouts found")

        # Create output directory
        out_dir = os.path.join(WOD_KB_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)

        # Create individual workout markdown files
        for title, body in workouts:
            kebab = to_kebab(title)
            out_path = os.path.join(out_dir, f'{kebab}.md')
            with open(out_path, 'w') as f:
                f.write(body + '\n')
            created_files.append(out_path)
            print(f"  -> {slug}/{kebab}.md")

        # Create Storybook story file
        story_dir = os.path.join(STORIES_KB_DIR, source['story_path'])
        os.makedirs(story_dir, exist_ok=True)
        story_path = os.path.join(story_dir, 'stories.stories.tsx')
        story_content = generate_story_file(source, workouts)
        with open(story_path, 'w') as f:
            f.write(story_content)
        created_stories.append(story_path)
        print(f"  -> stories/runtime/Kettlebell/{source['story_path']}/stories.stories.tsx")

    print(f"\nDone: {len(created_files)} workout files, {len(created_stories)} story files")


if __name__ == '__main__':
    main()
