# Handoff: CodeMirror `hasChild` Crash in ` ```wod ` Blocks

**Status:** Open — dedupe fix did not resolve  
**Severity:** High — editor crashes on every keystroke inside wod code blocks  
**Branch:** `dev`  
**Last investigated:** 2026-05-27

---

## 1. The Symptom

When typing inside a fenced code block with language tag `wod` (e.g. ` ```wod `), the CodeMirror 6 editor throws:

```
TypeError: Cannot read properties of undefined (reading 'some')
    at hasChild$4 (@codemirror_lang-markdown.js?v=7c7ab562:1168:23)
    at TreeNode$4.nextChild (@codemirror_lang-markdown.js?v=7c7ab562:674:80)
    at TreeNode$4.enter (@codemirror_lang-markdown.js?v=7c7ab562:709:15)
    at topNodeAt (@codemirror_language.js?v=ab9b23a8:134:43)
    ...
```

The crash happens on **every keystroke** inside the block. The editor becomes unusable.

---

## 2. The Stack Trace (annotated)

```
hasChild$4              ← @lezer/common: hasChild(tree) calls tree.children.some(...)
nextChild               ← @lezer/common: TreeNode.nextChild — iterates children[i]
enter                   ← @lezer/common: TreeNode.enter — enters a child node
topNodeAt               ← @codemirror/language: finds top node at cursor position
(anonymous)             ← @codemirror/language: languageDataAt wrapper
languageDataAt          ← @codemirror/state: gets language-specific data at position
config                  ← @codemirror/autocomplete: reads closeBrackets config
insertBracket           ← @codemirror/autocomplete: tries to auto-close a bracket
...
applyDOMChangeInner     ← @codemirror/view: applies DOM change to editor state
flush                   ← @codemirror/view: flushes pending DOM changes
```

**Trigger:** Typing any character that triggers `languageDataAt` (bracket insertion, autocomplete, etc.) inside a ` ```wod ` block.

---

## 3. The Architecture

### 3.1 How the nested parser is wired

```
NoteEditor.tsx (line 429)
  └── markdown({ codeLanguages: resolveWhiteboardCodeLanguage })
        └── @codemirror/lang-markdown
              └── parseCode({ codeParser: getCodeParser(...) })
                    └── parseMixed((node, input) => { ... })
                          └── For FencedCode with info="wod":
                                └── parser = whiteboardScriptLanguage.parser
                                      └── @lezer/lr LRParser
                                            └── Generated from whiteboardscript.grammar
```

### 3.2 The `hasChild` function (source of crash)

In `@lezer/common/dist/index.js` line 1281–1282:

```javascript
function hasChild(tree) {
    return tree.children.some(ch => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
```

This is called from `TreeNode.nextChild` at line 761:

```javascript
else if ((mode & IterMode.IncludeAnonymous) || (!next.type.isAnonymous || hasChild(next))) {
```

For `hasChild(next)` to be called:
1. `next` is NOT a `TreeBuffer` (line 754 check failed)
2. `next.type.isAnonymous` is `true`
3. So `hasChild(next)` is called to see if the anonymous node has non-anonymous descendants

**The crash:** `tree.children` is `undefined`, so `.some()` throws.

---

## 4. Investigation History

### 4.1 Attempt 1: Dedupe `@lezer/common` (FAILED)

**Hypothesis:** Multiple copies of `@lezer/common` in node_modules cause `instanceof TreeBuffer` to fail because the class objects are different.

**Evidence found:**
- 9 copies of `@lezer/common` existed in the tree
- `instanceof TreeBuffer` returned `false` for a `TreeBuffer`-like object in REPL
- The `TreeBuffer` had `constructor.name === "TreeBuffer"` but `instanceof` was `false`

**Fix applied:**
- Updated `scripts/fix-codemirror-deps.cjs` to symlink nested `@lezer` dirs to top-level
- Commit: `7167b44a` on `dev`

**Result:** ❌ User reports crash still occurs.

**Why it might have failed:**
1. The dev server was already running with the old bundle cached
2. Vite's dependency pre-bundling (`node_modules/.vite`) still has stale copies
3. The symlinks don't affect Vite's pre-bundle resolution
4. There may be additional copies not covered by the script
5. The REPL test used `require()` which may load differently than Vite's ESM bundling

### 4.2 What we know for certain

The crash is NOT in the bundled/minified code — it's in the source logic of `@lezer/common`. The `hasChild` function receives an object where `children` is `undefined`. This object:
- Passed the `!(next instanceof TreeBuffer)` check at line 754
- Has `.type.isAnonymous === true`
- Is expected to be a `Tree` but lacks `.children`

Possibilities:
1. **The object IS a `TreeBuffer`** but `instanceof` fails due to module duplication → `children` is undefined (TreeBuffers store data in `.buffer`, not `.children`)
2. **The object is a corrupted/malformed `Tree`** created during incremental parsing
3. **The object is a `Tree` subclass or proxy** that doesn't set `children`

---

## 5. Next Steps to Investigate

### 5.1 Verify the dedupe actually worked in the browser

Add this debug snippet to `NoteEditor.tsx` (or a script tag in the HTML) and check the browser console:

```javascript
// Check if TreeBuffer instances are recognized correctly
import { TreeBuffer } from '@lezer/common';

// After the editor is mounted, inspect a wod block's syntax tree
const tree = view.state.tree;
console.log('TreeBuffer class:', TreeBuffer);
console.log('TreeBuffer name:', TreeBuffer.name);

// Traverse to find a node inside a wod block and check instanceof
const cursor = tree.cursor();
while (cursor.next()) {
  if (cursor.name === 'CodeText') {
    const node = cursor.node;
    console.log('Node type:', node.type?.name);
    console.log('Node tree constructor:', node.tree?.constructor?.name);
    console.log('instanceof TreeBuffer:', node.tree instanceof TreeBuffer);
    console.log('Has children:', node.tree?.children !== undefined);
    console.log('Has buffer:', node.tree?.buffer !== undefined);
  }
}
```

If `instanceof TreeBuffer` is `false` but `buffer` exists, the dedupe failed.

### 5.2 Clear all caches and rebuild

```bash
# Stop the dev server
# Clear Vite's dependency cache
rm -rf node_modules/.vite
rm -rf playground/node_modules/.vite

# Re-run the fix script
node scripts/fix-codemirror-deps.cjs

# Verify no nested @lezer/common remains
find node_modules -path "*/node_modules/@lezer/common" -type d
# Should return ONLY: node_modules/@lezer/common

# Restart dev server
bun run dev:app
```

### 5.3 Alternative fix: Patch `@lezer/common` directly

If deduping doesn't work, patch `hasChild` to be defensive:

```javascript
// In @lezer/common/dist/index.js, replace:
function hasChild(tree) {
    return tree.children.some(ch => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}

// With:
function hasChild(tree) {
    if (!tree.children) return false;  // TreeBuffer or malformed tree
    return tree.children.some(ch => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
```

Use `patch-package` or a postinstall script to apply this patch automatically.

### 5.4 Alternative fix: Replace `instanceof` with duck-typing

Patch `TreeNode.nextChild` in `@lezer/common`:

```javascript
// Line 754: Replace:
if (next instanceof TreeBuffer) {

// With:
if (next instanceof TreeBuffer || (next.buffer && Array.isArray(next.buffer))) {
```

This handles the case where `instanceof` fails due to module duplication.

### 5.5 Alternative fix: Disable nested parsing for wod blocks

If the whiteboard script parser is not essential for editing inside ` ```wod ` blocks, disable it:

```typescript
// In NoteEditor.tsx, change:
const languages = useMemo(() => {
  return markdown({
    codeLanguages: resolveWhiteboardCodeLanguage,
  });
}, []);

// To:
const languages = useMemo(() => {
  return markdown();  // No nested parsers
}, []);
```

**Trade-off:** Syntax highlighting and autocomplete inside wod blocks will be disabled. The blocks will render as plain text.

### 5.6 Alternative fix: Wrap the whiteboard script parser

Instead of returning the raw `LRLanguage`, return a parser wrapper that ensures valid tree output:

```typescript
// In noteEditorServices.ts
import { Parser } from '@lezer/common';

export function resolveWhiteboardCodeLanguage(info: string | null | undefined) {
  if (info === 'wod' || info === 'log' || info === 'plan') {
    // Return the language support, not just the language
    // This ensures the parser is properly configured
    return whiteboardScriptLanguage;
  }
  return null;
}
```

Actually, this is already what's happening. The issue is deeper.

### 5.7 Check for Vite pre-bundling issues

Vite pre-bundles dependencies into `node_modules/.vite/deps/`. Check if `@lezer/common` is duplicated there:

```bash
ls node_modules/.vite/deps/ | grep lezer
# Look for multiple copies or different hashes

# Check the pre-bundled @codemirror_lang-markdown.js
# Does it inline its own copy of @lezer/common?
grep -n "class TreeBuffer" node_modules/.vite/deps/@codemirror_lang-markdown.js
```

If Vite is inlining `@lezer/common` into the markdown chunk, the `instanceof` checks will fail even if node_modules is deduped.

**Fix:** Add `@lezer/common` to Vite's `optimizeDeps.exclude`:

```typescript
// vite.config.ts
export default {
  optimizeDeps: {
    exclude: ['@lezer/common'],
  },
};
```

---

## 6. Files Involved

| File | Role |
|------|------|
| `src/components/Editor/NoteEditor.tsx` | Creates the markdown language with `codeLanguages` |
| `src/app/editor/noteEditorServices.ts` | `resolveWhiteboardCodeLanguage` — returns `whiteboardScriptLanguage` |
| `src/parser/whiteboard-script-language.ts` | Defines `whiteboardScriptLanguage` with `LRLanguage.define()` |
| `src/grammar/parser.ts` | Generated LRParser used by the whiteboard script language |
| `scripts/fix-codemirror-deps.cjs` | Postinstall script to dedupe CodeMirror/Lezer packages |
| `package.json` | Has `resolutions` for CodeMirror but not `@lezer/common` |

---

## 7. Key Questions to Answer

1. **Does the crash happen in a fresh browser session after clearing `.vite` cache and re-running the fix script?**
2. **Is `instanceof TreeBuffer` returning `false` for actual TreeBuffer instances in the browser console?**
3. **Does Vite's pre-bundled `@codemirror_lang-markdown.js` contain an inlined copy of `TreeBuffer`?**
4. **Does the crash happen with an empty ` ```wod ` block, or only after certain content is typed?**
5. **Does disabling `codeLanguages` (plain markdown) prevent the crash?**

---

## 8. Quick Diagnostic Script

Add this to `playground/index.html` (temporarily) to check module duplication at runtime:

```html
<script type="module">
  import { TreeBuffer as TB1 } from '@lezer/common';
  
  // After editor loads, check:
  setTimeout(() => {
    const editor = document.querySelector('.cm-editor');
    if (editor) {
      const view = editor.cmView?.view;
      if (view) {
        const tree = view.state.tree;
        const cursor = tree.cursor();
        while (cursor.next()) {
          if (cursor.name === 'CodeText') {
            const mounted = cursor.node.tree;
            console.log('=== DIAGNOSTIC ===');
            console.log('mounted constructor:', mounted?.constructor?.name);
            console.log('mounted instanceof TB1:', mounted instanceof TB1);
            console.log('mounted.buffer?:', mounted?.buffer !== undefined);
            console.log('mounted.children?:', mounted?.children !== undefined);
            console.log('TB1 name:', TB1.name);
            console.log('TB1 prototype:', TB1.prototype);
            console.log('mounted proto:', Object.getPrototypeOf(mounted)?.constructor?.name);
            break;
          }
        }
      }
    }
  }, 5000);
</script>
```

---

## 9. Recommended Fix Priority

| Priority | Fix | Effort | Confidence |
|----------|-----|--------|------------|
| 1 | Clear `.vite` cache + re-run fix script + verify | Low | Medium |
| 2 | Add `@lezer/common` to `optimizeDeps.exclude` | Low | High |
| 3 | Patch `hasChild` to check `tree.children` exists | Low | High |
| 4 | Add `@lezer/common` to `package.json` `resolutions` | Low | Medium |
| 5 | Disable `codeLanguages` as workaround | Low | High (but loses features) |

---

## 10. Related Links

- `@lezer/common` source: `node_modules/@lezer/common/dist/index.js` (lines 745–780, 1281–1282)
- `@codemirror/lang-markdown` source: `node_modules/@codemirror/lang-markdown/dist/index.js` (lines 75–92, 404–427)
- `@lezer/markdown` `parseCode`: `node_modules/@lezer/markdown/dist/index.js` (lines 1997–2018)
- Commit `7167b44a`: Updated `fix-codemirror-deps.cjs` to dedupe `@lezer`
