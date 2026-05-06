---
search: hidden
template: canvas
route: /
hidden: true
---

# WOD Wiki {sticky dark full-bleed}

```view
name:    home-demo
state:   note
source:  markdown/canvas/home/sample-script.md
runtime: in-memory
launch:  host
align:   right
width:   45%
```

## Home Gym Friendly {full-bleed dark}

### 📺 Chromecast & Big Clock Integration
Cast the timer to any TV or monitor in your home gym with one click. Get a full-screen display readable from across the room, ensuring you stay on pace without squinting at your phone.

## Future Features {full-bleed}

We're constantly evolving. Here's a glimpse of what's coming next:
- **Social Sharing & Leaderboards**: Connect with friends and share results.
- **Advanced Coaching Tools**: Better team management and programming distribution.
- **Deeper Health Integrations**: Sync with more devices and fitness ecosystems.
- **Custom Dialect Builder**: Create your own parsing rules for specialized sports.

## What's Next? {sticky dark full-bleed}

Choose your path to get started with WOD Wiki.

### 🗂️ Browse the Library
Need inspiration or too lazy to type? Browse hundreds of ready-to-run workouts across every discipline. Click any card to load it in the editor and run immediately.

```view
name:    browse-demo
state:   browse
source:  markdown/collections/
runtime: in-memory
launch:  host
align:   full
```

### 🎓 Zero to Hero
The syntax takes about 10 minutes to learn. The deep-dive guide walks you from your first statement to complex interval protocols.

```button
label:  Start Zero to Hero →
pipeline:
  - navigate: /getting-started
```

### 📓 Start your Training Journal
Every workout you run is automatically logged. Plan your sessions, write your intentions, and execute them with the smart timer. Plan, track, and analyze in one place. Your data stays on your device.

```button
label:  Open Today's Journal →
pipeline:
  - navigate: query:today-journal
```
