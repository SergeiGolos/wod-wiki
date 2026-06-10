import os

css_base = """
    :root {
      --stripe-purple: #533afd;
      --stripe-purple-hover: #4434d4;
      --stripe-navy: #061b31;
      --stripe-label: #273951;
      --stripe-body: #64748b;
      --stripe-border: #e5edf5;
      --stripe-surface: #ffffff;
      --stripe-brand-dark: #1c1e54;
      --stripe-success: #15be53;
      --stripe-shadow-blue: rgba(50,50,93,0.25);
      --stripe-shadow-black: rgba(0,0,0,0.1);

      --font-primary: 'Source Sans 3', system-ui, -apple-system, sans-serif;
      --font-mono: 'Source Code Pro', ui-monospace, monospace;

      --bg-muted: #f8fafc;
      --bg-muted-hover: #f1f5f9;
      --bg-primary-light: rgba(83, 58, 253, 0.1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-primary);
      color: var(--stripe-body);
      background-color: var(--stripe-surface);
      font-size: 16px;
      font-weight: 300;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Typography scale */
    .text-display-hero { font-size: 56px; font-weight: 300; letter-spacing: -1.4px; color: var(--stripe-navy); }
    .text-display-large { font-size: 48px; font-weight: 300; letter-spacing: -0.96px; color: var(--stripe-navy); }
    .text-section-heading { font-size: 32px; font-weight: 300; letter-spacing: -0.64px; color: var(--stripe-navy); }
    .text-sub-heading-large { font-size: 26px; font-weight: 300; letter-spacing: -0.26px; color: var(--stripe-navy); }
    .text-sub-heading { font-size: 22px; font-weight: 300; letter-spacing: -0.22px; color: var(--stripe-navy); }
    .text-body-large { font-size: 18px; font-weight: 300; color: var(--stripe-body); }
    .text-body { font-size: 16px; font-weight: 300; color: var(--stripe-body); }
    .text-caption { font-size: 13px; font-weight: 400; color: var(--stripe-body); }
    .text-caption-small { font-size: 12px; font-weight: 400; color: var(--stripe-body); }
    .text-code { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--stripe-navy); }
    .font-bold { font-weight: 600; }
    .font-black { font-weight: 900; }

    /* Utilities */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .flex-1 { flex: 1; }
    .gap-1 { gap: 4px; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .gap-4 { gap: 16px; }
    .w-full { width: 100%; }
    .h-full { height: 100%; }
    .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    a { text-decoration: none; color: var(--stripe-purple); }
    a:hover { color: var(--stripe-purple-hover); }
    button { font-family: inherit; cursor: pointer; border: none; background: none; }

    /* SVGs */
    svg { display: block; }
    .icon-sm { width: 12px; height: 12px; }
    .icon-md { width: 16px; height: 16px; }
    .icon-lg { width: 24px; height: 24px; }
"""

def create_html(filename, title, custom_css, body_html):
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700;900&family=Source+Code+Pro:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
{css_base}
{custom_css}
    </style>
</head>
<body>
{body_html}
</body>
</html>
"""
    with open(filename, 'w') as f:
        f.write(html)

print("Base setup script written.")

home_css = """
    .layout-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    .left-col {
      flex: 1;
      padding: 64px;
      overflow-y: auto;
      /* Using radial gradient as requested */
      background: radial-gradient(ellipse 70% 50% at 20% 50%, rgba(24,226,153,0.10) 0%, var(--stripe-surface) 100%);
    }

    .right-col {
      width: 40%;
      min-width: 400px;
      border-left: 1px solid var(--stripe-border);
      background-color: var(--bg-muted);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    @media (max-width: 1024px) {
      .layout-container {
        flex-direction: column;
      }
      .right-col {
        width: 100%;
        min-width: 0;
        height: 600px;
        position: relative;
        border-left: none;
        border-top: 1px solid var(--stripe-border);
      }
      .left-col {
        padding: 32px;
      }
    }

    /* Editor styling */
    .editor-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--stripe-border);
      display: flex;
      align-items: center;
      background-color: var(--stripe-surface);
    }
    .traffic-lights {
      display: flex;
      gap: 8px;
    }
    .traffic-light {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .tl-red { background-color: #ff5f56; }
    .tl-yellow { background-color: #ffbd2e; }
    .tl-green { background-color: #27c93f; }

    .segmented-control {
      display: flex;
      margin: 16px;
      border: 1px solid var(--stripe-border);
      border-radius: 999px; /* Pill */
      overflow: hidden;
      background-color: var(--stripe-surface);
    }
    .segment {
      flex: 1;
      padding: 8px 16px;
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      color: var(--stripe-body);
      border-right: 1px solid var(--stripe-border);
      transition: background-color 0.2s, color 0.2s;
      cursor: pointer;
    }
    .segment:last-child {
      border-right: none;
    }
    .segment:hover {
      background-color: var(--bg-muted);
    }
    .segment.active {
      background-color: var(--stripe-purple);
      color: white;
    }

    .editor-actions {
      display: flex;
      padding: 0 16px 16px;
      gap: 12px;
      align-items: center;
    }
    .icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--stripe-body);
      transition: background-color 0.2s;
    }
    .icon-btn:hover {
      background-color: var(--stripe-border);
      color: var(--stripe-navy);
    }
    .btn-run {
      background-color: var(--stripe-purple);
      color: white;
      border-radius: 4px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .btn-run:hover {
      background-color: var(--stripe-purple-hover);
    }

    .editor-textarea {
      flex: 1;
      margin: 0 16px 16px;
      border: 1px solid var(--stripe-border);
      border-radius: 4px;
      background-color: var(--stripe-surface);
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--stripe-navy);
      resize: none;
      outline: none;
      line-height: 1.6;
    }
    .editor-textarea:focus {
      border-color: var(--stripe-purple);
    }

    /* Left column content */
    .hero-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .doc-ref-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
      margin-bottom: 48px;
    }
    .doc-ref-row {
      display: flex;
      align-items: baseline;
    }
    .doc-ref-label {
      width: 120px;
      font-size: 13px;
      font-weight: 600;
      color: var(--stripe-navy);
    }
    .doc-ref-desc {
      flex: 1;
      font-size: 13px;
      color: var(--stripe-body);
    }

    .primary-btn {
      background-color: var(--stripe-purple);
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      transition: background-color 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .primary-btn:hover {
      background-color: var(--stripe-purple-hover);
    }

    .ghost-btn {
      background-color: transparent;
      color: var(--stripe-navy);
      padding: 12px 24px;
      border-radius: 4px;
      border: 1px solid var(--stripe-border);
      font-size: 16px;
      font-weight: 500;
      transition: background-color 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .ghost-btn:hover {
      background-color: var(--bg-muted);
    }

    .btn-group {
      display: flex;
      gap: 16px;
      margin-top: 24px;
    }

    .step-title {
      font-size: 22px;
      font-weight: 300;
      color: var(--stripe-navy);
      letter-spacing: -0.22px;
      margin-bottom: 8px;
      margin-top: 48px;
    }
    .step-desc {
      font-size: 16px;
      color: var(--stripe-body);
      margin-bottom: 24px;
    }
"""

home_html = """
<div class="layout-container">
  <div class="left-col">
    <div class="hero-container">
      <h1 class="text-display-large" style="margin-bottom: 16px; margin-top: 32px;">Welcome to WOD Wiki</h1>
      <p class="text-body-large" style="max-width: 600px;">A markdown-based language for defining, planning, and tracking your workouts. Write your WODs as code.</p>

      <h2 class="step-title">Step 01 &mdash; Write</h2>
      <p class="step-desc">Use the markdown editor to describe your workout. The engine understands movements, rounds, weights, and timers.</p>

      <div class="doc-ref-grid">
        <div class="doc-ref-row">
          <div class="doc-ref-label">Movement</div>
          <div class="doc-ref-desc">Defines the exercise being performed (e.g. Pull-ups, Deadlift).</div>
        </div>
        <div class="doc-ref-row">
          <div class="doc-ref-label">Reps</div>
          <div class="doc-ref-desc">Number of repetitions or distance (e.g. 10 reps, 400m).</div>
        </div>
        <div class="doc-ref-row">
          <div class="doc-ref-label">Load</div>
          <div class="doc-ref-desc">Weight to be used (e.g. 135#, 24kg).</div>
        </div>
        <div class="doc-ref-row">
          <div class="doc-ref-label">Rounds</div>
          <div class="doc-ref-desc">Looping structure for a series of movements (e.g. 5 rounds).</div>
        </div>
        <div class="doc-ref-row">
          <div class="doc-ref-label">Timers</div>
          <div class="doc-ref-desc">Time domains like AMRAP or EMOM (e.g. 10:00 AMRAP).</div>
        </div>
      </div>

      <h2 class="step-title">Step 02 &mdash; Run</h2>
      <p class="step-desc">Execute the workout directly in the playground. The compiler builds a runtime state machine from your markdown.</p>

      <div class="btn-group">
        <button class="primary-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Run Workout
        </button>
        <button class="ghost-btn">
          View Results
        </button>
      </div>
    </div>
  </div>

  <div class="right-col">
    <div class="editor-header">
      <div class="traffic-lights">
        <div class="traffic-light tl-red"></div>
        <div class="traffic-light tl-yellow"></div>
        <div class="traffic-light tl-green"></div>
      </div>
    </div>

    <div class="segmented-control">
      <div class="segment active">Edit</div>
      <div class="segment">Track</div>
      <div class="segment">Results</div>
    </div>

    <div style="height: 1px; background-color: var(--stripe-border); margin: 0 16px 16px;"></div>

    <div class="editor-actions">
      <button class="icon-btn" title="Reset">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
      </button>
      <button class="btn-run">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        Run
      </button>
      <div style="flex: 1;"></div>
      <button class="icon-btn" title="Share">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
      </button>
      <button class="icon-btn" title="Fullscreen">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
      </button>
    </div>

    <textarea class="editor-textarea" spellcheck="false">10:00 AMRAP
5 Pull-ups
10 Push-ups
15 Air Squats
</textarea>
  </div>
</div>
"""

create_html('/app/stripe-workbook/home.html', 'Home / Editor', home_css, home_html)
print("Created home.html")

journal_css = """
    .feed-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: var(--stripe-surface);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .date-header {
      position: sticky;
      top: 0;
      z-index: 5;
      background-color: rgba(248, 250, 252, 0.8); /* bg-muted/80 */
      backdrop-filter: blur(4px);
      border-top: 1px solid var(--stripe-border);
      border-bottom: 1px solid var(--stripe-border);
      padding: 8px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .date-header.selected {
      background-color: var(--bg-primary-light); /* stripe-purple/10 */
      border-color: rgba(83, 58, 253, 0.3);
    }

    .date-text {
      color: var(--stripe-navy);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .date-text.today-accent {
      color: var(--stripe-purple);
    }

    .feed-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s;
      cursor: pointer;
    }
    .feed-card:hover {
      background-color: var(--bg-muted);
    }

    .card-icon-container {
      width: 36px;
      height: 36px;
      border-radius: 12px; /* rounded-xl */
      background-color: var(--bg-primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon {
      width: 16px;
      height: 16px;
      color: var(--stripe-purple);
    }

    .card-content {
      flex: 1;
      min-width: 0;
    }
    .card-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--stripe-navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-subtitle {
      font-size: 11px;
      color: var(--stripe-body);
      margin-top: 2px;
    }

    .card-chevron {
      width: 16px;
      height: 16px;
      color: var(--stripe-body);
      opacity: 0.4;
      transition: color 0.2s, opacity 0.2s;
      flex-shrink: 0;
    }
    .feed-card:hover .card-chevron {
      color: var(--stripe-purple);
      opacity: 1;
    }

    .section-divider {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 24px 4px;
    }
    .divider-line {
      flex: 1;
      height: 1px;
      background-color: rgba(229, 237, 245, 0.4); /* border/40 */
    }
    .divider-label {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--stripe-body);
      opacity: 0.5;
    }

    .empty-date {
      padding: 16px 24px;
    }
    .empty-link {
      font-size: 13px;
      color: var(--stripe-body);
      opacity: 0.5;
      text-decoration: none;
      transition: color 0.2s, opacity 0.2s;
    }
    .empty-link:hover {
      color: var(--stripe-purple);
      opacity: 1;
    }
"""

journal_html = """
<div class="feed-container">

  <!-- Today (Selected state) -->
  <div class="date-group">
    <div class="date-header selected">
      <svg class="icon-sm" style="color: var(--stripe-purple);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span class="date-text today-accent">Mon, Oct 23 &mdash; Today</span>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <svg class="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </div>
      <div class="card-content">
        <div class="card-title">Start today's journal entry</div>
        <div class="card-subtitle">Blank &middot; Collection &middot; History &middot; Feed</div>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

  <!-- Yesterday -->
  <div class="date-group">
    <div class="date-header">
      <svg class="icon-sm" style="color: var(--stripe-body);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <span class="date-text">Sun, Oct 22</span>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <svg class="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      </div>
      <div class="card-content">
        <div class="card-title">Sunday active recovery notes</div>
        <div class="card-subtitle">Note</div>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>

    <div class="section-divider">
      <div class="divider-line"></div>
      <span class="divider-label">Workouts</span>
      <div class="divider-line"></div>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <svg class="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line></svg>
      </div>
      <div class="card-content">
        <div class="card-title">Rowing Intervals</div>
        <div class="card-subtitle">Result &middot; 25:00</div>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

  <!-- Empty Past Date -->
  <div class="date-group">
    <div class="date-header">
      <svg class="icon-sm" style="color: var(--stripe-body);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <span class="date-text">Sat, Oct 21</span>
    </div>

    <div class="empty-date">
      <a href="#" class="empty-link">+ Plan a workout</a>
    </div>
  </div>

</div>
"""

create_html('/app/stripe-workbook/journal-feed.html', 'Journal Feed', journal_css, journal_html)
print("Created journal-feed.html")

feed_feed_css = """
    .feed-feed-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: var(--stripe-surface);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .date-header {
      position: sticky;
      top: 0;
      z-index: 5;
      background-color: rgba(248, 250, 252, 0.8); /* bg-muted/80 */
      backdrop-filter: blur(4px);
      border-top: 1px solid var(--stripe-border);
      border-bottom: 1px solid var(--stripe-border);
      padding: 8px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .date-text {
      color: var(--stripe-navy);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: flex;
      flex-direction: column;
    }
    .date-text-main {
      color: var(--stripe-body);
    }
    .date-text-sub {
      color: var(--stripe-navy);
    }

    .feed-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s;
      cursor: pointer;
      position: relative;
    }
    .feed-card:hover {
      background-color: var(--bg-muted);
    }

    .card-icon-container {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background-color: var(--bg-primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .icon-text-badge {
      font-size: 10px;
      font-weight: 900;
      color: var(--stripe-purple);
    }

    .card-content {
      flex: 1;
      min-width: 0;
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--stripe-navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-subtitle {
      font-size: 11px;
      font-weight: 500;
      color: var(--stripe-body);
      margin-top: 2px;
    }

    .card-chevron {
      width: 16px;
      height: 16px;
      color: var(--stripe-body);
      opacity: 0.4;
      transition: color 0.2s, opacity 0.2s;
      flex-shrink: 0;
    }
    .feed-card:hover .card-chevron {
      color: var(--stripe-purple);
      opacity: 1;
    }

    .add-pill {
      opacity: 0;
      transition: opacity 0.2s, border-color 0.2s, color 0.2s;
      border: 1px solid var(--stripe-border);
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 11px;
      color: var(--stripe-body);
      display: flex;
      align-items: center;
      gap: 4px;
      background-color: var(--stripe-surface);
    }
    .feed-card:hover .add-pill {
      opacity: 1;
    }
    .add-pill:hover {
      border-color: var(--stripe-purple);
      color: var(--stripe-purple);
    }
"""

feed_feed_html = """
<div class="feed-feed-container">

  <div class="date-group">
    <div class="date-header">
      <svg class="icon-sm" style="color: var(--stripe-body);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <div class="date-text">
        <span class="date-text-main">Mon, Oct 23</span>
      </div>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <span class="icon-text-badge">WOD</span>
      </div>
      <div class="card-content">
        <div class="card-title">Heavy Day: Back Squat</div>
        <div class="card-subtitle">CrossFit Main Site</div>
      </div>
      <button class="add-pill">
        <svg class="icon-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add to Today
      </button>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <span class="icon-text-badge">WOD</span>
      </div>
      <div class="card-content">
        <div class="card-title">Gymnastics Conditioning</div>
        <div class="card-subtitle">CompTrain</div>
      </div>
      <button class="add-pill">
        <svg class="icon-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add to Today
      </button>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

  <div class="date-group">
    <div class="date-header">
      <svg class="icon-sm" style="color: var(--stripe-body);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <div class="date-text">
        <span class="date-text-main">Sun, Oct 22</span>
      </div>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <span class="icon-text-badge">WOD</span>
      </div>
      <div class="card-content">
        <div class="card-title">Rest Day</div>
        <div class="card-subtitle">CrossFit Main Site</div>
      </div>
      <button class="add-pill">
        <svg class="icon-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add to Today
      </button>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

</div>
"""

create_html('/app/stripe-workbook/feed-feed.html', 'Feed Items Feed', feed_feed_css, feed_feed_html)
print("Created feed-feed.html")

collections_css = """
    .collections-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: var(--stripe-surface);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .search-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--stripe-border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-icon {
      width: 20px;
      height: 20px;
      color: var(--stripe-body);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 16px;
      color: var(--stripe-navy);
      font-weight: 500;
      font-family: inherit;
    }
    .search-input::placeholder {
      color: var(--stripe-body);
    }

    .collection-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      width: 100%;
      text-align: left;
      transition: background-color 0.2s;
      cursor: pointer;
    }
    .collection-row:hover {
      background-color: var(--bg-muted);
    }

    .folder-icon-container {
      width: 40px;
      height: 40px;
      border-radius: 12px; /* rounded-xl */
      background-color: var(--bg-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.2s;
    }
    .collection-row:hover .folder-icon-container {
      background-color: var(--stripe-surface);
    }
    .folder-icon {
      width: 16px;
      height: 16px;
      color: #f59e0b; /* amber */
    }

    .collection-content {
      flex: 1;
      min-width: 0;
    }
    .collection-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--stripe-navy);
      text-transform: uppercase;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .collection-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 4px;
    }
    .collection-count {
      font-size: 12px;
      font-weight: 500;
      color: var(--stripe-body);
    }
    .category-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      background-color: var(--bg-primary-light);
      color: var(--stripe-purple);
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }
    .category-badge-other {
      background-color: var(--bg-muted);
      color: var(--stripe-body);
      opacity: 0.5;
    }

    .collection-chevron {
      width: 16px;
      height: 16px;
      color: var(--stripe-body);
      opacity: 0;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }
    .collection-row:hover .collection-chevron {
      opacity: 1;
    }
"""

collections_html = """
<div class="collections-container">

  <div class="search-header">
    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
    <input type="text" class="search-input" placeholder="Search collections...">
  </div>

  <div class="collection-row">
    <div class="folder-icon-container">
      <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <div class="collection-content">
      <div class="collection-name">The Girls</div>
      <div class="collection-meta">
        <span class="collection-count">21 workouts</span>
        <span class="category-badge">Benchmark</span>
      </div>
    </div>
    <svg class="collection-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </div>

  <div class="collection-row">
    <div class="folder-icon-container">
      <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <div class="collection-content">
      <div class="collection-name">Hero WODs</div>
      <div class="collection-meta">
        <span class="collection-count">108 workouts</span>
        <span class="category-badge">Hero</span>
        <span class="category-badge">Endurance</span>
      </div>
    </div>
    <svg class="collection-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </div>

  <div class="collection-row">
    <div class="folder-icon-container">
      <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <div class="collection-content">
      <div class="collection-name">Travel WODs</div>
      <div class="collection-meta">
        <span class="collection-count">45 workouts</span>
        <span class="category-badge category-badge-other">Other</span>
      </div>
    </div>
    <svg class="collection-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  </div>

</div>
"""

create_html('/app/stripe-workbook/collections.html', 'Collections Browser', collections_css, collections_html)
print("Created collections.html")

collection_workouts_css = """
    .workouts-page {
      background-color: var(--bg-muted);
      min-height: 100vh;
      padding: 48px 24px;
      display: flex;
      justify-content: center;
    }

    .card-container {
      width: 100%;
      max-width: 600px;
      background-color: var(--stripe-surface);
      border-radius: 12px; /* 3xl roughly maps to 12px or more depending on system, using 12px per standard */
      border: 1px solid var(--stripe-border);
      box-shadow: var(--stripe-shadow-blue) 0px 30px 45px -30px, var(--stripe-shadow-black) 0px 18px 36px -18px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .search-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(229, 237, 245, 0.6); /* border/60 */
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-icon {
      width: 20px;
      height: 20px;
      color: var(--stripe-body);
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 16px;
      color: var(--stripe-navy);
      font-weight: 500;
      font-family: inherit;
    }
    .search-input::placeholder {
      color: var(--stripe-body);
    }

    .list-container {
      display: flex;
      flex-direction: column;
    }

    .workout-row-wrapper {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(229, 237, 245, 0.6); /* divide-y divide-border/60 */
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .workout-row-wrapper:last-child {
      border-bottom: none;
    }

    .workout-action-main {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 12px;
      border-radius: 16px; /* 2xl */
      transition: background-color 0.2s, box-shadow 0.2s;
      cursor: pointer;
      text-align: left;
    }
    .workout-action-main:hover {
      background-color: rgba(255, 255, 255, 0.8); /* bg-background/80 relative to muted context, but inside white card just a subtle grey */
      background-color: var(--bg-muted);
    }
    .workout-action-main.selected {
      background-color: var(--stripe-surface);
      box-shadow: 0 0 0 2px rgba(83, 58, 253, 0.4); /* ring in stripe-purple */
    }

    .dumbbell-icon-container {
      width: 40px;
      height: 40px;
      border-radius: 12px; /* rounded-xl */
      background-color: var(--bg-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.2s;
    }
    .dumbbell-icon {
      width: 16px;
      height: 16px;
      color: var(--stripe-purple);
    }

    .workout-content {
      flex: 1;
      min-width: 0;
    }
    .workout-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--stripe-navy);
      text-transform: uppercase;
      letter-spacing: -0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .workout-preview {
      font-size: 12px;
      font-weight: 500;
      color: var(--stripe-body);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 4px;
    }

    .workout-chevron {
      width: 16px;
      height: 16px;
      color: var(--stripe-body);
      opacity: 0.4;
      flex-shrink: 0;
    }

    .action-pill {
      border-radius: 9999px;
      border: 1px solid var(--stripe-border);
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--stripe-body);
      background-color: transparent;
      transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
      flex-shrink: 0;
    }
    .action-pill:hover {
      background-color: rgba(255, 255, 255, 0.8);
      background-color: var(--bg-muted);
      color: var(--stripe-navy);
    }
    .action-pill.selected {
      background-color: var(--stripe-surface);
      color: var(--stripe-navy);
      box-shadow: 0 0 0 2px rgba(83, 58, 253, 0.4);
    }
"""

collection_workouts_html = """
<div class="workouts-page">
  <div class="card-container">

    <div class="search-header">
      <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input type="text" class="search-input" placeholder="Filter The Girls...">
    </div>

    <div class="list-container">

      <div class="workout-row-wrapper">
        <button class="workout-action-main selected">
          <div class="dumbbell-icon-container">
            <svg class="dumbbell-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line></svg>
          </div>
          <div class="workout-content">
            <div class="workout-name">Fran</div>
            <div class="workout-preview">21-15-9 Thrusters (95/65 lbs), Pull-ups</div>
          </div>
          <svg class="workout-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="action-pill selected">Open</button>
      </div>

      <div class="workout-row-wrapper">
        <button class="workout-action-main">
          <div class="dumbbell-icon-container">
            <svg class="dumbbell-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line></svg>
          </div>
          <div class="workout-content">
            <div class="workout-name">Cindy</div>
            <div class="workout-preview">20:00 AMRAP: 5 Pull-ups, 10 Push-ups, 15 Squats</div>
          </div>
          <svg class="workout-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="action-pill">Open</button>
      </div>

      <div class="workout-row-wrapper">
        <button class="workout-action-main">
          <div class="dumbbell-icon-container">
            <svg class="dumbbell-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11"></path><path d="M6.5 17.5h11"></path><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line></svg>
          </div>
          <div class="workout-content">
            <div class="workout-name">Grace</div>
            <div class="workout-preview">30 Clean and Jerks for time (135/95 lbs)</div>
          </div>
          <svg class="workout-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="action-pill">Open</button>
      </div>

    </div>
  </div>
</div>
"""

create_html('/app/stripe-workbook/collection-workouts.html', 'Collection Workout List', collection_workouts_css, collection_workouts_html)
print("Created collection-workouts.html")

plan_css = journal_css + """
    /* Specific overrides for plan view multi-select */
    .date-header {
      cursor: pointer;
      position: relative;
    }
    .date-header:hover {
      background-color: var(--bg-muted-hover);
    }

    .multi-select-hint {
      position: absolute;
      right: 24px;
      font-size: 10px;
      color: var(--stripe-body);
      opacity: 0;
      transition: opacity 0.2s;
    }
    .date-header:hover .multi-select-hint {
      opacity: 0.5;
    }
"""

plan_html = """
<div class="feed-container">

  <!-- Today (Selected state) -->
  <div class="date-group">
    <div class="date-header selected" title="Ctrl/⌘+click to select multiple">
      <svg class="icon-sm" style="color: var(--stripe-purple);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span class="date-text today-accent">Mon, Oct 23 &mdash; Today</span>
      <span class="multi-select-hint">⌘+click to select</span>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <svg class="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </div>
      <div class="card-content">
        <div class="card-title">Start today's journal entry</div>
        <div class="card-subtitle">Blank &middot; Collection &middot; History &middot; Feed</div>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

  <!-- Tomorrow -->
  <div class="date-group">
    <div class="date-header" title="Ctrl/⌘+click to select multiple">
      <svg class="icon-sm" style="color: var(--stripe-body);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
      <span class="date-text">Tue, Oct 24</span>
      <span class="multi-select-hint">⌘+click to select</span>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <svg class="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </div>
      <div class="card-content">
        <div class="card-title">Create journal entry</div>
        <div class="card-subtitle">Blank &middot; Collection &middot; History &middot; Feed</div>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

  <!-- Next Day (Multi-selected) -->
  <div class="date-group">
    <div class="date-header selected" title="Ctrl/⌘+click to select multiple">
      <svg class="icon-sm" style="color: var(--stripe-purple);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span class="date-text">Wed, Oct 25</span>
      <span class="multi-select-hint">⌘+click to deselect</span>
    </div>

    <div class="feed-card">
      <div class="card-icon-container">
        <svg class="card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </div>
      <div class="card-content">
        <div class="card-title">Create journal entry</div>
        <div class="card-subtitle">Blank &middot; Collection &middot; History &middot; Feed</div>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
  </div>

</div>
"""

create_html('/app/stripe-workbook/plan.html', 'Forward Planner', plan_css, plan_html)
print("Created plan.html")

detail_css = """
    .detail-container {
      max-width: 720px;
      margin: 0 auto;
      background-color: var(--stripe-surface);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--stripe-border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--stripe-body);
      transition: background-color 0.2s, color 0.2s;
      flex-shrink: 0;
    }
    .back-btn:hover {
      background-color: var(--bg-muted);
      color: var(--stripe-navy);
    }

    .page-title {
      flex: 1;
      font-size: 18px;
      font-weight: 600;
      color: var(--stripe-navy);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--stripe-body);
      transition: background-color 0.2s, color 0.2s;
    }
    .action-btn:hover {
      background-color: var(--bg-muted);
      color: var(--stripe-navy);
    }

    .origin-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      background-color: var(--bg-primary-light);
      color: var(--stripe-purple);
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.16em;
    }

    .content-area {
      padding: 32px 24px 64px;
      flex: 1;
    }

    .prose {
      font-size: 16px;
      line-height: 1.5;
      color: var(--stripe-body);
      margin-bottom: 24px;
    }
    .prose h2 {
      font-size: 22px;
      font-weight: 300;
      color: var(--stripe-navy);
      letter-spacing: -0.22px;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .prose p {
      margin-bottom: 16px;
    }

    .code-block {
      background-color: var(--stripe-surface);
      border: 1px solid var(--stripe-border);
      border-radius: 8px;
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 2.0;
      color: var(--stripe-navy);
      overflow-x: auto;
      margin-top: 24px;
      margin-bottom: 24px;
    }

    @media (max-width: 768px) {
      .page-header {
        position: static;
      }
    }
"""

detail_html = """
<div class="detail-container">

  <div class="page-header">
    <button class="back-btn" aria-label="Go back">
      <svg class="icon-lg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>

    <h1 class="page-title">Murph</h1>

    <div class="header-actions">
      <span class="origin-badge">Hero</span>
      <button class="action-btn" title="Clone">
        <svg class="icon-md" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
      <button class="action-btn" title="Edit">
        <svg class="icon-md" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
    </div>
  </div>

  <div class="content-area">
    <div class="prose">
      <p>In memory of Navy Lieutenant Michael Murphy, 29, of Patchogue, N.Y., who was killed in Afghanistan June 28th, 2005.</p>
      <p>This workout was one of Mike's favorites and he'd named it "Body Armor". From here on it will be referred to as "Murph" in honor of the focused warrior and great American who wanted nothing more in life than to serve this great country and the beautiful people who make it what it is.</p>

      <h2>Workout Definition</h2>
      <p>Partition the pull-ups, push-ups, and squats as needed. Start and finish with a mile run. If you've got a twenty pound vest or body armor, wear it.</p>
    </div>

    <div class="code-block">For Time
1 mile Run
100 Pull-ups
200 Push-ups
300 Air Squats
1 mile Run</div>

  </div>

</div>
"""

create_html('/app/stripe-workbook/detail-page-generic.html', 'Effort Detail', detail_css, detail_html)
print("Created detail-page-generic.html")
