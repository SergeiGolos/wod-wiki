import type { Command, CommandPaletteResult } from '@/components/command-palette/types';
import type { WodCommand } from '@/components/Editor/overlays/WodCommand';
import type { IListItem } from '../types';

export function commandToListItem(cmd: Command): IListItem<Command> {
  return {
    id: cmd.id,
    label: cmd.label,
    group: cmd.group,
    shortcut: cmd.shortcut,
    keywords: cmd.keywords,
    payload: cmd,
  };
}

export function paletteResultToListItem(
  result: CommandPaletteResult,
): IListItem<CommandPaletteResult> {
  return {
    id: result.id,
    label: result.name,
    subtitle: result.subtitle ?? result.category,
    group: result.category,
    keywords: [result.name, result.category],
    payload: result,
  };
}

export function wodCommandToListItem(cmd: WodCommand): IListItem<WodCommand> {
  return {
    id: cmd.id,
    label: cmd.label,
    icon: cmd.icon,
    isDisabled: false,
    payload: cmd,
  };
}
