import { EditorView, KeyBinding, keymap } from "@codemirror/view";
import { Extension, Transaction } from "@codemirror/state";

/**
 * Parse a time string and return its components
 * Returns [days, hours, minutes, seconds] or null if invalid
 */
function parseTimeString(timeStr: string): [number, number, number, number] | null {
  const parts = timeStr.split(':');
  if (parts.length < 1 || parts.length > 4) return null;
  const numbers = parts.map(p => parseInt(p, 10));
  if (numbers.some(n => isNaN(n))) return null;
  while (numbers.length < 4) {
    numbers.unshift(0);
  }
  return numbers as [number, number, number, number];
}

/**
 * Format time components back to string, removing leading zero segments
 */
function formatTimeString(days: number, hours: number, minutes: number, seconds: number): string {
  const parts: number[] = [];
  if (days > 0) {
    parts.push(days, hours, minutes, seconds);
  } else if (hours > 0) {
    parts.push(hours, minutes, seconds);
  } else if (minutes > 0) {
    parts.push(minutes, seconds);
  } else {
    parts.push(seconds);
  }
  return parts.map((p, i) => i === 0 ? String(p) : String(p).padStart(2, '0')).join(':');
}

/**
 * Increment time with overflow handling
 */
function incrementTime(
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  digitIndex: number,
  delta: number
): [number, number, number, number] {
  let newSeconds = seconds;
  let newMinutes = minutes;
  let newHours = hours;
  let newDays = days;
  
  switch (digitIndex) {
    case 3: // Seconds
      newSeconds += delta;
      if (newSeconds >= 60) {
        newMinutes += Math.floor(newSeconds / 60);
        newSeconds = newSeconds % 60;
      } else if (newSeconds < 0) {
        const deficit = Math.abs(newSeconds);
        newMinutes -= Math.ceil(deficit / 60);
        newSeconds = 60 - (deficit % 60);
        if (newSeconds === 60) {
          newSeconds = 0;
          newMinutes += 1;
        }
      }
      break;
    case 2: // Minutes
      newMinutes += delta;
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
      } else if (newMinutes < 0) {
        const deficit = Math.abs(newMinutes);
        newHours -= Math.ceil(deficit / 60);
        newMinutes = 60 - (deficit % 60);
        if (newMinutes === 60) {
          newMinutes = 0;
          newHours += 1;
        }
      }
      break;
    case 1: // Hours
      newHours += delta;
      if (newHours >= 24) {
        newDays += Math.floor(newHours / 24);
        newHours = newHours % 24;
      } else if (newHours < 0) {
        const deficit = Math.abs(newHours);
        newDays -= Math.ceil(deficit / 24);
        newHours = 24 - (deficit % 24);
        if (newHours === 24) {
          newHours = 0;
          newDays += 1;
        }
      }
      break;
    case 0: // Days
      newDays += delta;
      if (newDays < 0) newDays = 0;
      break;
  }
  
  if (newDays < 0) {
    newDays = 0; newHours = 0; newMinutes = 0; newSeconds = 0;
  }
  
  return [newDays, newHours, newMinutes, newSeconds];
}

function findTimeAtCursor(
  line: string,
  column: number
): { timeStr: string; startCol: number; endCol: number; digitIndex: number } | null {
  const timeRegex = /\b(\d+:)?((\d+):)?(\d+):(\d+)\b|\b(\d+)\b/g;
  let match: RegExpExecArray | null;
  
  while ((match = timeRegex.exec(line)) !== null) {
    const startCol = match.index;
    const endCol = match.index + match[0].length;
    
    if (column >= startCol && column <= endCol) {
      const timeStr = match[0];
      const parts = timeStr.split(':');
      let currentPos = startCol;
      let digitIndex = 4 - parts.length;
      
      for (let i = 0; i < parts.length; i++) {
        const partLen = parts[i].length;
        if (column >= currentPos && column <= currentPos + partLen) {
          digitIndex += i;
          break;
        }
        currentPos += partLen + 1;
      }
      return { timeStr, startCol, endCol, digitIndex };
    }
  }
  return null;
}

function handleSmartIncrement(view: EditorView, delta: number): boolean {
  const { state } = view;
  const { head } = state.selection.main;
  const line = state.doc.lineAt(head);
  const column = head - line.from;
  
  const timeInfo = findTimeAtCursor(line.text, column);
  if (!timeInfo) return false;
  
  const parsed = parseTimeString(timeInfo.timeStr);
  if (!parsed) return false;
  
  const [days, hours, minutes, seconds] = parsed;
  const [newDays, newHours, newMinutes, newSeconds] = incrementTime(
    days,
    hours,
    minutes,
    seconds,
    timeInfo.digitIndex,
    delta
  );
  
  const newTimeStr = formatTimeString(newDays, newHours, newMinutes, newSeconds);
  const from = line.from + timeInfo.startCol;
  const to = line.from + timeInfo.endCol;
  
  view.dispatch({
    changes: { from, to, insert: newTimeStr },
    selection: { anchor: from + Math.min(column - timeInfo.startCol, newTimeStr.length) },
    userEvent: "input.smart-increment"
  });
  
  return true;
}

export const smartIncrement: Extension = keymap.of([
  {
    key: "Ctrl-ArrowUp",
    run: (view) => handleSmartIncrement(view, 1)
  },
  {
    key: "Ctrl-ArrowDown",
    run: (view) => handleSmartIncrement(view, -1)
  },
  {
    key: "Mod-ArrowUp", // Cmd on Mac, Ctrl on others
    run: (view) => handleSmartIncrement(view, 1)
  },
  {
    key: "Mod-ArrowDown",
    run: (view) => handleSmartIncrement(view, -1)
  }
]);
