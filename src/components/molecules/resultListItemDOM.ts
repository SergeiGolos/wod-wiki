/**
 * resultListItemDOM
 *
 * Imperative DOM builder that produces elements visually matching
 * the <ResultListItem> React component. Used inside CodeMirror WidgetType
 * where React cannot be rendered directly.
 *
 * All text content is set via textContent (never innerHTML) to prevent XSS.
 * Icons are inline SVGs matching the lucide-react Clock and CircleCheckBig shapes.
 */

export interface ResultListItemViewModel {
  timeLabel: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

// Lucide "clock": circle(cx12,cy12,r10) + path M12 6v6l4 2
const CLOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;

// Lucide "circle-check-big": path M21.801 10A10 + path m9 11 3 3L22 4
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>`;

/** Build a DOM element matching <ResultListItem>. Safe — no innerHTML for user data. */
export function buildResultListItemDOM(vm: ResultListItemViewModel): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors text-left group w-full";

  if (vm.onClick) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      vm.onClick!();
    });
  }

  // ── Time column ──────────────────────────────────────────────────
  const timeCol = document.createElement("div");
  timeCol.className = "flex-shrink-0 w-14 text-right";

  const timeInner = document.createElement("div");
  timeInner.className = "flex items-center justify-end gap-1";

  const clockWrap = document.createElement("span");
  clockWrap.className = "text-muted-foreground/40";
  // Safe: CLOCK_SVG is a static constant, not user data
  clockWrap.innerHTML = CLOCK_SVG;

  const timeSpan = document.createElement("span");
  timeSpan.className =
    "text-[10px] font-black text-muted-foreground/60 tabular-nums";
  timeSpan.textContent = vm.timeLabel;

  timeInner.appendChild(clockWrap);
  timeInner.appendChild(timeSpan);
  timeCol.appendChild(timeInner);

  // ── Status icon ──────────────────────────────────────────────────
  const iconWrap = document.createElement("div");
  iconWrap.className =
    "flex-shrink-0 size-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-background transition-colors";

  const checkWrap = document.createElement("span");
  checkWrap.className = "text-emerald-500";
  // Safe: CHECK_SVG is a static constant, not user data
  checkWrap.innerHTML = CHECK_SVG;

  iconWrap.appendChild(checkWrap);

  // ── Text column ──────────────────────────────────────────────────
  const textCol = document.createElement("div");
  textCol.className = "flex-1 min-w-0";

  const titleEl = document.createElement("h3");
  titleEl.className = "text-sm font-semibold text-foreground truncate";
  titleEl.textContent = vm.title;
  textCol.appendChild(titleEl);

  if (vm.subtitle) {
    const subtitleEl = document.createElement("p");
    subtitleEl.className = "text-[11px] text-muted-foreground truncate";
    subtitleEl.textContent = vm.subtitle;
    textCol.appendChild(subtitleEl);
  }

  btn.appendChild(timeCol);
  btn.appendChild(iconWrap);
  btn.appendChild(textCol);
  return btn;
}
