---
title: "Editor Best Practices"
date: 2025-06-19
tags: [editor, best-practices, monaco-editor]
---

# Editor Best Practices

This document outlines the best practices for using the `@monaco-editor/react` library within the WOD Wiki project. It covers syntax highlighting, typeahead suggestions, and other editor-related functionalities.

## 1. Syntax Highlighting and Annotation

To ensure that the `wod-syntax` is correctly highlighted and annotated, we should leverage Monaco\'s language services.

### Language Registration
The first step is to register `wod-syntax` as a custom language. This is done using `monaco.languages.register`.

**Example:**
```typescript
monaco.languages.register({ id: \'wod-syntax\' });
```

### Tokenization
For syntax highlighting, we need to provide a tokenizer. The `monaco.languages.setMonarchTokensProvider` function is the recommended way to define the tokens for our custom language. This should be done in `WodWikiSyntaxInitializer.tsx`.

**Example:**
```typescript
monaco.languages.setMonarchTokensProvider(\'wod-syntax\', {
  tokenizer: {
    root: [
      [/@\w+/, \'keyword\'],
      [/".*?"/, \'string\'],
      [/\d+/, \'number\'],
    ],
  },
});
```

### Validation and Annotations
To provide annotations (e.g., error squiggles), we can use the `onValidate` prop of the `Editor` component. This prop receives the markers for the current model, which can be used to display errors or warnings.

**Example:**
```tsx
<Editor
  // ...
  onValidate={handleEditorValidation}
/>
```

## 2. Typeahead Suggestions

To provide typeahead suggestions, we need to implement a `CompletionItemProvider`. This is the responsibility of the `SuggestionEngine.tsx` and `SuggestionService.ts`.

### Completion Item Provider
The `monaco.languages.registerCompletionItemProvider` function allows us to register a provider that returns a list of suggestions based on the current context.

**Example:**
```typescript
monaco.languages.registerCompletionItemProvider(\'wod-syntax\', {
  provideCompletionItems: (model, position) => {
    const suggestions = [
      // ... your suggestion logic here
    ];
    return { suggestions };
  },
});
```

## 3. Identifying Currently Running Code

To highlight the currently running code, we can use the editor\'s decoration feature. This allows us to apply custom CSS classes to specific ranges of text.

### Decorations
The `editor.deltaDecorations` method is used to add, change, or remove decorations. We can define a CSS class for the "running" state and apply it to the currently executing line or block of code.

**Example:**
```typescript
const decorations = editor.deltaDecorations(
  [],
  [
    {
      range: new monaco.Range(3, 1, 3, 10),
      options: { inlineClassName: \'running-code\' },
    },
  ]
);
```

And the corresponding CSS:
```css
.running-code {
  background-color: rgba(0, 255, 0, 0.1);
}
```

## 4. Other Identified Patterns

### Accessing Editor and Monaco Instances
The `onMount` prop of the `Editor` component provides access to the `editor` and `monaco` instances. These should be stored in a `useRef` for later use.

**Example:**
```tsx
const editorRef = useRef(null);

function handleEditorDidMount(editor, monaco) {
  editorRef.current = editor;
}

<Editor
  // ...
  onMount={handleEditorDidMount}
/>
```

### Multi-Model Support
The library supports multi-model editors using the `path` prop. While we are not currently using this feature, it could be useful in the future for managing multiple WODs in a tabbed interface.

### Unidentified Goals
The current implementation in the `editor/` directory seems to be aligned with the goals of syntax highlighting and suggestions. There are no major patterns that fall outside of the scope of the user request.
