# Deployment View

> **Status**: Draft
> **Last Updated**: 2026-02-14
> **Category**: Architecture Documentation
> **arc42 Section**: 5

## Overview

This document describes how the WOD Wiki system is deployed and operated in different environments.

## Deployment Strategy

### Current: Development with Storybook

**Primary Deployment**: Development environment using Storybook

**Architecture**:
```
┌─────────────────────────────────────────┐
│         Developer Machine               │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Storybook Dev Server           │  │
│  │   (http://localhost:6006)        │  │
│  │                                  │  │
│  │  ├─ Component Stories            │  │
│  │  ├─ Interactive Controls         │  │
│  │  ├─ Runtime Test Bench          │  │
│  │  └─ Hot Module Replacement       │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Source Code (src/)             │  │
│  │   ├─ Parser                      │  │
│  │   ├─ Compiler                    │  │
│  │   ├─ Runtime                     │  │
│  │   └─ Editor                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Bun Runtime                    │  │
│  │   ├─ Package Manager             │  │
│  │   ├─ Test Runner                 │  │
│  │   └─ Build Tool                  │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Commands**:
```bash
# Start development server
bun run storybook
# → http://localhost:6006

# Build static Storybook
bun run build-storybook
# → Creates storybook-static/ directory
```

**Characteristics**:
- Hot reload for fast iteration
- Component isolation
- Interactive controls for props
- Visual debugging

### Static Hosting (Storybook Build)

**Deployment**: Static site hosting (GitHub Pages, Netlify, Vercel)

**Architecture**:
```
┌─────────────────────────────────────────┐
│         CDN / Static Host               │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Static Files                   │  │
│  │   (storybook-static/)            │  │
│  │                                  │  │
│  │  ├─ index.html                   │  │
│  │  ├─ bundle.js (React + App)      │  │
│  │  ├─ styles.css                   │  │
│  │  └─ assets/                      │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
                    ▲
                    │ HTTPS
                    │
         ┌──────────┴──────────┐
         │   User Browser      │
         │   (Chrome, Firefox) │
         └─────────────────────┘
```

**Build Process**:
```bash
# 1. Build static Storybook
bun run build-storybook

# 2. Deploy to hosting
# GitHub Pages
cp -r storybook-static/* docs/

# Netlify
netlify deploy --dir=storybook-static

# Vercel
vercel storybook-static/
```

**Characteristics**:
- Fast CDN delivery
- No server required
- Automatic HTTPS
- Global distribution

## Integration Scenarios

### Scenario 1: Embedded in React Application

**Use Case**: Integrate WOD Wiki editor and runtime into existing React app.

**Architecture**:
```
┌─────────────────────────────────────────┐
│     React Application                   │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   App Component                  │  │
│  │                                  │  │
│  │  ┌────────────────────────────┐ │  │
│  │  │   WodWiki Editor           │ │  │
│  │  │   (Monaco Integration)     │ │  │
│  │  └────────────────────────────┘ │  │
│  │                                  │  │
│  │  ┌────────────────────────────┐ │  │
│  │  │   RuntimeTestBench         │ │  │
│  │  │   (Execution UI)           │ │  │
│  │  └────────────────────────────┘ │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Integration Code**:
```typescript
import { WodWiki } from 'wod-wiki/editor';
import { RuntimeTestBench } from 'wod-wiki/runtime-test-bench';

function WorkoutApp() {
  const [script, setScript] = useState('');

  return (
    <div>
      <WodWiki
        initialContent={script}
        onChange={setScript}
      />
      <RuntimeTestBench script={script} />
    </div>
  );
}
```

**Requirements**:
- React 18+
- Bundler with ES module support (Vite, Webpack 5)
- Monaco Editor assets loaded

**Limitations**:
- ⚠️ No npm package build currently available
- ⚠️ Must clone repo and import directly
- ⚠️ Large bundle size (~2MB with Monaco)

### Scenario 2: Standalone Web Application

**Use Case**: Deploy as complete standalone workout app.

**Architecture**:
```
┌──────────────────────────────────────────┐
│         Web Server / CDN                 │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   Static Assets                    │ │
│  │   ├─ index.html                    │ │
│  │   ├─ app.js (built bundle)         │ │
│  │   ├─ editor-worker.js (Monaco)     │ │
│  │   └─ styles.css                    │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
                    ▲
                    │ HTTPS
                    │
         ┌──────────┴──────────┐
         │   User Browser      │
         │                     │
         │  ┌───────────────┐ │
         │  │ LocalStorage  │ │
         │  │ - Workouts    │ │
         │  │ - History     │ │
         │  │ - Preferences │ │
         │  └───────────────┘ │
         └─────────────────────┘
```

**Data Storage**:
- **LocalStorage**: Workout definitions, history, settings
- **No Backend**: Fully client-side application
- **Export/Import**: JSON files for backup

**Deployment Options**:
1. **GitHub Pages** (Free, public repos)
2. **Netlify** (Free tier, continuous deployment)
3. **Vercel** (Free tier, optimized for React)
4. **Cloudflare Pages** (Free, fast CDN)

### Scenario 3: Chrome Extension

**Use Case**: Browser extension for quick workout creation.

**Architecture**:
```
┌─────────────────────────────────────┐
│      Chrome Browser                 │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Extension Popup             │ │
│  │   ├─ Mini Editor              │ │
│  │   ├─ Quick Start              │ │
│  │   └─ Saved Workouts           │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Background Service Worker   │ │
│  │   ├─ Parser                   │ │
│  │   ├─ Compiler                 │ │
│  │   └─ Storage API              │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Chrome Storage API          │ │
│  │   (chrome.storage.sync)       │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Manifest**:
```json
{
  "manifest_version": 3,
  "name": "WOD Wiki",
  "version": "0.5.0",
  "permissions": ["storage"],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

**Benefits**:
- Quick access from browser toolbar
- Sync across devices (chrome.storage.sync)
- Offline access
- No hosting required

### Scenario 4: Android TV Application

**Use Case**: TV-optimized workout experience (see TV docs).

**Architecture**:
```
┌──────────────────────────────────────┐
│      Android TV Device               │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   WebView Container            │ │
│  │   (Chrome WebView)             │ │
│  │                                │ │
│  │  ┌──────────────────────────┐ │ │
│  │  │   WOD Wiki Web App       │ │ │
│  │  │   (React Bundle)         │ │ │
│  │  └──────────────────────────┘ │ │
│  │                                │ │
│  │  ┌──────────────────────────┐ │ │
│  │  │   Android Bridge         │ │ │
│  │  │   ├─ Remote Control      │ │ │
│  │  │   ├─ Voice Commands      │ │ │
│  │  │   └─ Cast Integration    │ │ │
│  │  └──────────────────────────┘ │ │
│  └────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
```

**Communication**:
- WebView loads hosted web app
- JavaScript bridge for native features
- Remote control mapped to keyboard events

**See**: [TV Application Spec](../tv/01-android-tv-application-spec.md)

## Infrastructure

### Development Environment

**Requirements**:
- **Node.js**: Not required (Bun runtime)
- **Bun**: v1.0+ (runtime and package manager)
- **OS**: Linux, macOS, Windows (WSL recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 500MB for dependencies

**Setup**:
```bash
# 1. Clone repository
git clone https://github.com/SergeiGolos/wod-wiki.git
cd wod-wiki

# 2. Install dependencies
bun install

# 3. Start development server
bun run storybook
```

### CI/CD Pipeline

**Platform**: GitHub Actions

**Workflows**:
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      - run: bun x tsc --noEmit
```

```yaml
# .github/workflows/deploy-storybook.yml
name: Deploy Storybook
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build-storybook
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./storybook-static
```

**Pipeline Stages**:
1. **Lint**: TypeScript type checking
2. **Test**: Unit and integration tests
3. **Build**: Storybook static build
4. **Deploy**: Publish to GitHub Pages

### Browser Requirements

**Supported Browsers**:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 15+
- ❌ Internet Explorer (not supported)

**Required Features**:
- ES2020+ (Promise.allSettled, optional chaining)
- ES Modules
- LocalStorage API
- Web Workers (for Monaco Editor)
- requestAnimationFrame

**Bundle Size**:
- Core App: ~500KB (gzipped)
- Monaco Editor: ~1.5MB (lazy loaded)
- Total: ~2MB initial load

### Performance Targets

**Load Time**:
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Bundle Parse: < 500ms

**Runtime**:
- 60fps rendering (16.67ms frame budget)
- Stack operations: < 1ms
- Memory updates: < 5ms

## Monitoring and Operations

### Logging

**Client-Side Logging**:
```typescript
// Console-based logging
console.error('[Runtime] Behavior error:', error);
console.warn('[Compiler] No strategy for:', statement);
console.log('[Parser] Parsed', statements.length, 'statements');
console.debug('[Memory] Update:', tag, fragments);
```

**Error Tracking** (Future):
- Sentry integration for production
- Error boundaries in React components
- Crash reports with stack traces

### Debugging

**Development Tools**:
```bash
# Storybook with dev tools
bun run storybook

# Test specific components
bun test --watch

# Type checking
bun x tsc --noEmit

# Performance profiling
bun run test:perf
```

**Browser DevTools**:
- React DevTools extension
- Performance profiler
- Network tab for bundle analysis
- Application tab for LocalStorage

### Maintenance

**Regular Tasks**:
- Dependency updates (monthly)
- Security patches (as needed)
- Browser compatibility testing
- Performance benchmarking

**Backup Strategy**:
- LocalStorage export/import
- Git repository backup
- User-initiated JSON export

## Scalability

### Current Limitations

**Client-Side Only**:
- No server-side processing
- No database
- No user accounts
- No real-time sync

**Browser Constraints**:
- LocalStorage: 5-10MB limit
- Memory: Limited by device RAM
- Network: No offline-first capabilities

### Future Scaling Options

**Phase 1: Backend API**
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Browser   │◀─────▶│  REST API   │◀─────▶│  Database   │
│  (React)    │ HTTPS │  (Node.js)  │       │  (Postgres) │
└─────────────┘       └─────────────┘       └─────────────┘
```

**Phase 2: Real-Time Collaboration**
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Browser 1  │◀─────▶│  WebSocket  │◀─────▶│  Browser 2  │
│             │       │   Server    │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
```

**Phase 3: Mobile Native**
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  React      │       │  Backend    │       │  React      │
│  Native iOS │◀─────▶│    API      │◀─────▶│  Native     │
│             │       │             │       │  Android    │
└─────────────┘       └─────────────┘       └─────────────┘
```

## Security

### Client-Side Security

**Input Validation**:
- Parser validates all input
- TypeScript prevents type confusion
- No eval() or dynamic code execution

**Data Storage**:
- LocalStorage accessible to same origin only
- No sensitive data (passwords, tokens) stored
- User data exportable for portability

**Dependencies**:
- Regular security audits (`bun audit`)
- Minimal dependency tree
- Well-maintained libraries (React, Monaco, Chevrotain)

### Deployment Security

**HTTPS Required**:
- All production deployments use HTTPS
- Service worker requires secure context
- No mixed content warnings

**Content Security Policy**:
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

**Subresource Integrity**:
```html
<script src="app.js" integrity="sha384-..." crossorigin="anonymous"></script>
```

## Related Documentation

- [Context and Scope](./01-context-and-scope.md) - System boundaries
- [Building Blocks](./03-building-blocks.md) - Component details
- [TV Application Spec](../tv/01-android-tv-application-spec.md) - TV deployment
- [Contributing Guide](../../CONTRIBUTING.md) - Development setup

---

**Previous**: [← Runtime View](./04-runtime-view.md) | **Up**: [Architecture Index](./00-introduction.md)
