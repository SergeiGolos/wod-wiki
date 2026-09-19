import { describe, expect, it } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { CanvasProse } from './CanvasProse';

describe('CanvasProse query block embedding', () => {
  it('renders a query block inside a query-block-view container instead of a raw pre/code', () => {
    const markdown = [
      '# Collection Overview',
      '',
      'Here are matching workouts:',
      '',
      '```query',
      'find:note{tags:benchmark}',
      '```',
    ].join('\n');
    render(<CanvasProse prose={markdown} />);

    expect(screen.getByTestId('query-block-view')).toBeDefined();
  });
});
