import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EditorPanel } from '../../src/runtime-test-bench';

// Mock WodWiki component for testing
vi.mock('@/editor/WodWiki', () => ({
  WodWiki: ({ code, onValueChange, readonly, highlightedLine }: any) => (
    <div className="wodwiki-container" data-highlighted-line={highlightedLine}>
      <textarea
        value={code}
        onChange={(e) => onValueChange(e.target.value)}
        readOnly={readonly}
        data-testid="wodwiki-editor"
        role="textbox"
      />
    </div>
  )
}));

describe('EditorPanel Contract Tests', () => {
  test('renders with empty value', () => {
    render(
      <EditorPanel
        value=""
        onChange={() => {}}
        status="idle"
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  test('calls onChange when text edited', () => {
    const handleChange = vi.fn();
    render(
      <EditorPanel
        value=""
        onChange={handleChange}
        status="idle"
      />
    );

    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'workout' } });

    expect(handleChange).toHaveBeenCalledWith('workout');
  });

  test('highlights specific line number', () => {
    const script = `workout "Test" {
  warmup {
    run 1mi
  }
  main {
    pullups 10
  }
}`;

    const { container } = render(
      <EditorPanel
        value={script}
        onChange={() => {}}
        status="idle"
        highlightedLine={5}
      />
    );

    // Check that the WodWiki container has the highlighted line data attribute
    const wodwikiContainer = container.querySelector('.wodwiki-container');
    expect(wodwikiContainer).toHaveAttribute('data-highlighted-line', '5');
  });

  test('displays parse errors', () => {
    const errors = [
      { line: 3, column: 5, message: 'Unexpected token', severity: 'error' as const },
      { line: 7, column: 10, message: 'Missing closing brace', severity: 'error' as const }
    ];

    render(
      <EditorPanel
        value="invalid script"
        onChange={() => {}}
        status="error"
        errors={errors}
      />
    );

    expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
  });

  test('shows suggestions popup', () => {
    const suggestions = ['pullups', 'pushups_diamond', 'pushups_wide'];

    render(
      <EditorPanel
        value="pu"
        onChange={() => {}}
        status="idle"
        suggestions={suggestions}
      />
    );

    expect(screen.getByText('pullups')).toBeInTheDocument();
    expect(screen.getByText('pushups_diamond')).toBeInTheDocument();
    expect(screen.getByText('pushups_wide')).toBeInTheDocument();
  });

  test('calls onSuggestionSelect', () => {
    const handleSelect = vi.fn();
    const suggestions = ['pullups', 'pushups'];

    render(
      <EditorPanel
        value="pu"
        onChange={() => {}}
        status="idle"
        suggestions={suggestions}
        onSuggestionSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('pullups'));

    expect(handleSelect).toHaveBeenCalledWith('pullups');
  });

  test('read-only mode disables editing', () => {
    const handleChange = vi.fn();

    render(
      <EditorPanel
        value="workout {}"
        onChange={handleChange}
        status="idle"
        readonly={true}
      />
    );

    const editor = screen.getByRole('textbox');
    expect(editor).toHaveAttribute('readonly');
  });

  test('applies custom className', () => {
    const { container } = render(
      <EditorPanel
        value=""
        onChange={() => {}}
        status="idle"
        className="custom-class"
      />
    );

    const root = container.firstChild;
    expect(root).toHaveClass('custom-class');
  });
});