import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RuntimeTestBench } from '../../../src/runtime-test-bench/RuntimeTestBench';

// Mock dependencies
vi.mock('../../../src/runtime/ScriptRuntime');
vi.mock('../../../src/editor/WodWiki');

describe('KeyboardShortcuts Integration Tests', () => {
  describe('User Story 4: All 9 keyboard shortcuts work', () => {
    const shortcuts = [
      { key: ' ', description: 'Play/Pause', button: 'play-pause' },
      { key: 'Enter', ctrl: true, description: 'Compile', button: 'compile' },
      { key: 'r', ctrl: true, description: 'Reset', button: 'reset' },
      { key: 'F5', description: 'Run', button: 'execute' },
      { key: 'F10', description: 'Step Over', button: 'step' },
      { key: 'F11', description: 'Step Into', button: 'step' },
      { key: 'F5', shift: true, description: 'Stop', button: 'stop' },
      { key: 'f', ctrl: true, description: 'Find', action: 'focus-search' },
      { key: '/', ctrl: true, description: 'Toggle Terminal', action: 'toggle-terminal' }
    ];

    shortcuts.forEach(({ key, ctrl, shift, description, button, action }) => {
      test(`should handle ${ctrl ? 'Ctrl+' : ''}${shift ? 'Shift+' : ''}${key} (${description})`, () => {
        render(<RuntimeTestBench />);

        // Focus the main container
        const container = screen.getByTestId('runtime-test-bench-container');
        container.focus();

        // Fire keyboard event
        const keyEvent = new KeyboardEvent('keydown', {
          key,
          ctrlKey: ctrl || false,
          shiftKey: shift || false,
          bubbles: true
        });
        fireEvent(container, keyEvent);

        if (button) {
          // Check that the corresponding button was "clicked"
          const mockButton = screen.getByTestId(`mock-${button}-button`);
          expect(mockButton).toHaveAttribute('data-triggered', 'true');
        }

        if (action) {
          // Check that the action was performed
          const actionIndicator = screen.getByTestId(`${action}-indicator`);
          expect(actionIndicator).toHaveTextContent('triggered');
        }
      });
    });

    test('should prevent default behavior for handled shortcuts', () => {
      render(<RuntimeTestBench />);

      const container = screen.getByTestId('runtime-test-bench-container');
      container.focus();

      const keyEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true
      });

      const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');
      fireEvent(container, keyEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('should not interfere with editor input', () => {
      render(<RuntimeTestBench />);

      // Focus editor
      const editor = screen.getByTestId('wodwiki-editor');
      editor.focus();

      // Type regular text
      fireEvent.keyDown(editor, { key: 'a' });

      // Should not trigger shortcuts
      const shortcutIndicator = screen.queryByTestId('shortcut-triggered');
      expect(shortcutIndicator).not.toBeInTheDocument();
    });

    test('should show keyboard hints in status footer', () => {
      render(<RuntimeTestBench />);

      const footer = screen.getByTestId('status-footer');
      expect(footer).toHaveTextContent('Space: Play/Pause');
      expect(footer).toHaveTextContent('F5: Run');
      expect(footer).toHaveTextContent('Ctrl+R: Reset');
    });
  });
});