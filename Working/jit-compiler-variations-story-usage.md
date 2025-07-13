---
title: "JIT Compiler Variations Story Usage"
date: 2025-07-07
tags: [storybook, jit-compiler, documentation]
related: ["./jit-compiler-demo-deep-dive.md", "./jit-compiler-fragment-combinations.md", "./jit-compiler-storybook-implementation.md"]
---

# JIT Compiler Variations Story Usage

This document outlines how to use the `JIT Compiler Variations` Storybook story to quickly test and visualize the output of the JIT Compiler with different `IScript` and `RuntimeStack` configurations.

## Overview

The `JIT Compiler Variations` story is designed for rapid prototyping and testing of the JIT compiler. It provides Storybook controls to modify the input `script` and `stack` at runtime, allowing developers and designers to see the compiled output immediately.

This approach is useful for:
- Testing various script structures.
- Simulating different runtime conditions by pre-populating the stack.
- Debugging compiler output for specific edge cases.
- Creating a library of common script variations for regression testing.

## How to Use the Story

Navigate to the **Runtime/JIT Compiler Variations** story in Storybook. In the "Controls" panel, you will find two properties that can be edited:

- **`script`**: An object representing the `IScript` to be compiled. You can modify the JSON directly in the control panel.
- **`stack`**: An object representing the initial `RuntimeStack`. You can add, remove, or change key-value pairs to simulate the runtime environment.

### Example: Modifying the Script

To test a new script, you can copy and paste a JSON structure into the `script` control. For example, to test a simple script with a single action:

```json
{
  "title": "My Test Script",
  "statements": [
    {
      "type": "action",
      "fragments": [
        { "type": "text", "value": "Run " },
        { "type": "distance", "value": "400m" }
      ]
    }
  ]
}
```

### Example: Modifying the Stack

To override a value from the script, you can set it in the `stack` control. For example, to change the distance from the script above to "800m", you would modify the `stack` JSON as follows:

```json
{
  "values": {
    "distance": "800m"
  }
}
```

## Creating New Variations in Code

To create a new, repeatable variation, you can add a new export to the `JitCompilerVariations.stories.tsx` file. This is the preferred method for creating a suite of standard test cases.

1.  **Open the story file**: `stories/runtime/JitCompilerVariations.stories.tsx`
2.  **Define your script and stack**: Create new `WodScript` and `RuntimeStack` instances.
3.  **Export a new story**: Add a new `export const` for your variation.

### Example Variation

```typescript
// In stories/runtime/JitCompilerVariations.stories.tsx

const myCustomScript: WodScript = {
  title: 'My Custom Script',
  statements: [
    // ... your statements here
  ],
};

const myCustomStack = new RuntimeStack();
myCustomStack.set('reps', 21);

export const MyNewVariation: Story = {
  args: {
    script: myCustomScript,
    stack: myCustomStack,
  },
};
```

## Links to Source Code

- **Story File**: [JitCompilerVariations.stories.tsx](../../stories/runtime/JitCompilerVariations.stories.tsx)
- **Component**: [JitCompilerDemo.tsx](../../stories/runtime/JitCompilerDemo.tsx)
