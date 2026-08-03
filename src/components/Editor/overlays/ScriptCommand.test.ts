/**
 * commandsForAffordance — per-block run-affordance gating (#891, decided #894).
 *
 * Log sections must get NO run entry point: play/add-to-today/schedule are
 * withheld, the log command renders in place of play, and neutral commands
 * (share / open-in-playground) pass through.
 */

import { describe, expect, it } from 'bun:test';
import { commandsForAffordance, type ScriptCommand } from './ScriptCommand';

const cmd = (id: string): ScriptCommand => ({
  id,
  label: id,
  icon: null,
  onClick: () => {},
});

const ALL: ScriptCommand[] = [
  cmd('play'),
  cmd('log'),
  cmd('open-in-playground'),
  cmd('share'),
  cmd('add-to-today'),
  cmd('schedule'),
];

const ids = (cmds: ScriptCommand[]) => cmds.map(c => c.id);

describe('commandsForAffordance', () => {
  it('run affordance keeps play + planning and hides the log command', () => {
    expect(ids(commandsForAffordance(ALL, 'run'))).toEqual([
      'play',
      'open-in-playground',
      'share',
      'add-to-today',
      'schedule',
    ]);
  });

  it('log affordance swaps log in place of play and withholds planning commands', () => {
    expect(ids(commandsForAffordance(ALL, 'log'))).toEqual([
      'log',
      'open-in-playground',
      'share',
    ]);
  });

  it('log affordance keeps only neutral commands when no log command was emitted', () => {
    const withoutLog = ALL.filter(c => c.id !== 'log');
    expect(ids(commandsForAffordance(withoutLog, 'log'))).toEqual([
      'open-in-playground',
      'share',
    ]);
  });

  it('null affordance withholds every run/log entry point', () => {
    expect(ids(commandsForAffordance(ALL, null))).toEqual([
      'open-in-playground',
      'share',
    ]);
  });
});
