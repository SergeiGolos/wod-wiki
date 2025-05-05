# WOD.Wiki – Functional Fitness Markup & Toolkit

> "Write your workout like code, run it like an app."

WOD.Wiki is a TypeScript / React toolkit for **authoring, executing, and analysing Cross-Training & functional-fitness workouts**.  
It couples a specialised **markdown-like language** with a Monaco-powered editor, a just-in-time runtime engine, and a rich component library (timer, analytics, results, etc.).

---

## 1. The Workout Script Syntax  *(Quick Tour)*

| Token           | Examples                | Notes / Visual hint                  |
| --------------- | ----------------------- | ------------------------------------ |
| **Duration**    | `:20`, `1:30`           | Seconds or *M:SS* – shown with ⏱️    |
| **Repetitions** | `21`, `15`              | Plain numbers – shown with **×**     |
| **Weight**      | `95lb`, `50kg`          | Any `number + lb/kg` – shown with 💪 |
| **Distance**    | `400m`, `5km`           | `m`, `km`, `mi` – shown with 📏      |
| **Rounds**      | `(21-15-9)`, `(5)`      | Bracketed lists define round schemes |
| **Group Ops**   | `-`, `+`, *(blank)*     | Round-robin, compose, repeat         |
| **Exercise**    | `Thrusters`, `Pull-ups` | Free-text effort identifier          |

```wod
# Example – classic benchmark "Fran"
(21-15-9)
  Thrusters 95lb
  Pull-ups  
```

The parser tokenises → builds an AST → the runtime executes, emitting UI actions & metrics.

👉  **Full spec:** see [`docs/Syntax.md`](./docs/Syntax.md) *(placeholder)*

---

## 2. Component Library

| Area       | Key Components | Doc link |
|------------|----------------|----------|
| **Editor** | `WodWiki`, `EditorContainer`, `SuggestionEngine`, `WodWikiSyntaxInitializer` | [`docs/Components/Editor.md`](./docs/Components/Editor.md) |
| **Runtime**| `TimerRuntime`, compiler strategies, handlers | [`docs/Components/Runtime.md`](./docs/Components/Runtime.md) |
| **UI**     | `WodTimer`, `ButtonRibbon`, `ResultsDisplay`, analytics widgets | [`docs/Components/UI.md`](./docs/Components/UI.md) |

---

## 3. Quick Start (Users)

```bash
# 1. Install peer deps in your React project
npm i react react-dom monaco-editor

# 2. Add WOD.Wiki (local path while unpublished)
npm i ../wod-wiki
```

```tsx
import { WodWiki } from 'wod-wiki';
import 'wod-wiki/dist/style.css';

export default function Demo() {
  const initial = `(5)\n  Burpees\n  (:30) Rest`;
  return <WodWiki id="demo" code={initial} />;
}
```

---

## 4. Project Structure (src excerpt)

```text
src/
  components/          ← React UI & hooks
  core/                ← Parser • Runtime • Types
  contexts/            ← React context providers (sound, screen, …)
  stories/             ← Storybook demos
```

See [`docs/Architecture.md`](./docs/Architecture.md) for deeper details.

---

## 5. Developer Guide

### Tech Stack

* **React 18 + TypeScript** – UI and logic  
* **Vite** – build & dev server  
* **Tailwind CSS** – styling  
* **Monaco-editor** – code editing  
* **RxJS** – event streams in runtime  
* **Vitest** – unit tests  
* **Storybook** – component playground  

### Prerequisites

```bash
node >= 18
npm >= 9
```

### Common Scripts

| Command         | Purpose                               |
| --------------- | ------------------------------------- |
| `npm install`   | Install deps                          |
| `npm run dev`   | Run **Storybook** at `localhost:6006` |
| `npm run build` | Build library into `dist/`            |
| `npm run test`  | Execute **Vitest** suite              |
| `npm run lint`  | ESLint + Prettier (if configured)     |

### Running the Demo App

1. `npm run dev` – open Storybook and play with stories.  
2. `stories/EditorDemo.stories.tsx` contains a live script runner.

---

## 6. Contributing

Pull requests are welcome!  Please follow the conventional-commits style and ensure tests pass (`npm run test`).

---

© 2025 WOD.Wiki contributors – MIT licence
