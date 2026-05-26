import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

import { PageNavDropdown } from './PageNavDropdown';

describe('PageNavDropdown', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the controlled active section label', () => {
    render(
      <PageNavDropdown
        links={[
          { id: 'overview', label: 'Overview' },
          { id: 'details', label: 'Details' },
        ]}
        activeSectionId="details"
        scrollToSection={mock()}
      />,
    );

    expect(screen.getByLabelText('Page sections').textContent).toContain('Details');
  });
});
