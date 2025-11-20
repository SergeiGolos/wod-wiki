/**
 * Hook for smart time increment/decrement with Ctrl+Up/Down
 * Supports formats: DD:HH:MM:SS, HH:MM:SS, MM:SS, SS
 */

import { useCallback, useEffect } from 'react';
import { editor as monacoEditor, Range, KeyMod, KeyCode } from 'monaco-editor';

export interface UseSmartIncrementOptions {
  /** Monaco editor instance */
  editor: monacoEditor.IStandaloneCodeEditor | null;
  
  /** Whether the feature is enabled */
  enabled?: boolean;
}

/**
 * Parse a time string and return its components
 * Returns [days, hours, minutes, seconds] or null if invalid
 */
function parseTimeString(timeStr: string): [number, number, number, number] | null {
  const parts = timeStr.split(':');
  
  if (parts.length < 1 || parts.length > 4) return null;
  
  // Validate all parts are numbers
  const numbers = parts.map(p => parseInt(p, 10));
  if (numbers.some(n => isNaN(n))) return null;
  
  // Pad with zeros on the left to make 4 parts [DD, HH, MM, SS]
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
  
  // Pad each part to 2 digits except the first one
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
  
  // Determine which component to increment based on digitIndex
  // digitIndex: 0=days, 1=hours, 2=minutes, 3=seconds
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
  
  // Ensure no negative values
  if (newDays < 0) {
    newDays = 0;
    newHours = 0;
    newMinutes = 0;
    newSeconds = 0;
  }
  
  return [newDays, newHours, newMinutes, newSeconds];
}

/**
 * Find the time string and digit position at cursor
 */
function findTimeAtCursor(
  line: string,
  column: number
): { timeStr: string; startCol: number; endCol: number; digitIndex: number } | null {
  // Look for time pattern around cursor
  const timeRegex = /\b(\d+:)?((\d+):)?(\d+):(\d+)\b|\b(\d+)\b/g;
  let match: RegExpExecArray | null;
  
  while ((match = timeRegex.exec(line)) !== null) {
    const startCol = match.index;
    const endCol = match.index + match[0].length;
    
    // Check if cursor is within or adjacent to this time string
    if (column >= startCol && column <= endCol) {
      const timeStr = match[0];
      const parts = timeStr.split(':');
      
      // Find which part the cursor is in
      let currentPos = startCol;
      let digitIndex = 4 - parts.length; // Map to [DD, HH, MM, SS] indices
      
      for (let i = 0; i < parts.length; i++) {
        const partLen = parts[i].length;
        if (column >= currentPos && column <= currentPos + partLen) {
          digitIndex += i;
          break;
        }
        currentPos += partLen + 1; // +1 for colon
      }
      
      return { timeStr, startCol, endCol, digitIndex };
    }
  }
  
  return null;
}

/**
 * Hook to enable smart increment/decrement on Ctrl+Up/Down
 */
export function useSmartIncrement({
  editor,
  enabled = true
}: UseSmartIncrementOptions): void {
  
  const handleIncrement = useCallback((delta: number) => {
    if (!editor || !enabled) return;
    
    const position = editor.getPosition();
    const model = editor.getModel();
    if (!position || !model) return;
    
    const line = model.getLineContent(position.lineNumber);
    const column = position.column;
    
    // Find time string at cursor
    const timeInfo = findTimeAtCursor(line, column - 1); // Monaco columns are 1-indexed
    if (!timeInfo) return;
    
    const parsed = parseTimeString(timeInfo.timeStr);
    if (!parsed) return;
    
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
    
    // Replace the time string
    const range = new Range(
      position.lineNumber,
      timeInfo.startCol + 1, // Monaco columns are 1-indexed
      position.lineNumber,
      timeInfo.endCol + 1
    );
    
    editor.executeEdits('smart-increment', [{
      range,
      text: newTimeStr
    }]);
    
    // Maintain cursor position relative to the new string
    const cursorOffset = column - 1 - timeInfo.startCol;
    const newColumn = timeInfo.startCol + 1 + Math.min(cursorOffset, newTimeStr.length);
    editor.setPosition({
      lineNumber: position.lineNumber,
      column: newColumn
    });
    
  }, [editor, enabled]);
  
  useEffect(() => {
    if (!editor || !enabled) return;
    
    // Register Ctrl+Up for increment
    editor.addCommand(
      KeyMod.CtrlCmd | KeyCode.UpArrow,
      () => handleIncrement(1)
    );
    
    // Register Ctrl+Down for decrement
    editor.addCommand(
      KeyMod.CtrlCmd | KeyCode.DownArrow,
      () => handleIncrement(-1)
    );
    
    // Note: addCommand returns a string ID, not a disposable
    // Commands are automatically cleaned up when editor is disposed
  }, [editor, enabled, handleIncrement]);
}
