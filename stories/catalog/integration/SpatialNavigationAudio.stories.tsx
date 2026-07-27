/**
 * Integration / Spatial Navigation + Audio Feedback
 *
 * Demonstrates the useSpatialNavigation hook integrated with AudioService
 * to provide audio feedback on D-Pad focus movement and element selection.
 *
 * Usage in Storybook:
 *   - Use arrow keys to move focus between grid items (hear `click` at 0.3 vol)
 *   - Press Enter to "select" the focused item (hear `select` at 0.5 vol)
 *   - Click "Enable Audio" first if the browser has suspended the AudioContext
 */

import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useSpatialNavigation } from '@/hooks/useSpatialNavigation';
import { audioService } from '@/services/AudioService';
import { Button } from '@/components/atoms/primitives/button'

const GRID_ITEMS = [
  'play', 'pause', 'stop', 'next',
  'prev', 'shuffle', 'repeat', 'volume-up',
  'volume-down', 'mute', 'fullscreen', 'settings',
];

const SpatialNavDemo: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(audioService.isEnabled());

  const handleFocusChanged = useCallback((_id: string | null, _el: HTMLElement | null) => {
    audioService.playSound('click', 0.3);
  }, []);

  const handleSelect = useCallback((id: string) => {
    audioService.playSound('select', 0.5);
    setSelectedId(id);
  }, []);

  const { getFocusProps, focusedId } = useSpatialNavigation({
    enabled: true,
    initialFocusId: GRID_ITEMS[0],
    onFocusChanged: handleFocusChanged,
    onSelect: useCallback((elementId: string) => {
      handleSelect(elementId);
    }, [handleSelect]),
  });

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioService.setEnabled(next);
    if (next) {
      audioService.playSound('beep');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-background text-foreground min-h-screen">
      <div className="flex items-center justify-between w-full max-w-lg">
        <div>
          <h2 className="text-lg font-semibold">Spatial Navigation + Audio</h2>
          <p className="text-sm text-muted-foreground">
            Use arrow keys to navigate, Enter to select.
          </p>
        </div>
        <Button
          variant={audioEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={toggleAudio}
        >
          {audioEnabled ? 'Audio On' : 'Enable Audio'}
        </Button>
      </div>

      {selectedId && (
        <div className="w-full max-w-lg rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
          Selected: <span className="font-mono font-semibold">{selectedId}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
        {GRID_ITEMS.map((id) => {
          const props = getFocusProps(id);
          return (
            <div
              key={id}
              {...props}
              className={[
                'flex items-center justify-center rounded-lg border-2 px-4 py-8 text-sm font-medium uppercase tracking-wide transition-colors cursor-default select-none',
                props['data-nav-focused']
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-card-foreground hover:bg-accent',
              ].join(' ')}
              onClick={() => handleSelect(id)}
            >
              {id}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground max-w-lg space-y-1">
        <p>Focused: <span className="font-mono">{focusedId ?? 'none'}</span></p>
        <p>AudioContext state: <span className="font-mono">{audioService['context']?.state ?? 'not initialized'}</span></p>
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'integration/SpatialNavigation/AudioFeedback',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Demonstrates D-Pad spatial navigation with synthesized audio feedback. ' +
          'Arrow keys play a `click` sound (0.3 volume). Enter/Select plays a `select` sound (0.5 volume). ' +
          'The AudioContext is lazily initialized and resumed if suspended.',
      },
    },
  },
};

export default meta;

export const Default: StoryObj = {
  name: 'D-Pad Navigation with Audio',
  render: () => <SpatialNavDemo />,
};
