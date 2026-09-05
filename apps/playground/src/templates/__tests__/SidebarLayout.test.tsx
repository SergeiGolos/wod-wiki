import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NuqsAdapter } from 'nuqs/adapters/react-router';
import { SidebarLayout } from '../SidebarLayout';
import { PAGE_SHELL_CONTAINER_CLASS, PAGE_SHELL_CONTENT_SURFACE_CLASS } from '../../panels/page-shells/contentSurface';
import { NavProvider } from '../../../app/nav/NavContext';

describe('SidebarLayout mobile folding zones', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders content column with xl max-width cap and 2xl release', () => {
    render(
      <MemoryRouter>
        <NuqsAdapter>
          <NavProvider tree={[]}>
            <SidebarLayout navbar={<div>Navbar</div>} sidebar={<div>Sidebar</div>}>
              <div>Content</div>
            </SidebarLayout>
          </NavProvider>
        </NuqsAdapter>
      </MemoryRouter>,
    );
    const contentEl = screen.getByText('Content');
    const contentColumn = contentEl.closest('[class*="xl:max-w-"]');
    expect(contentColumn).not.toBeNull();
    expect(contentColumn?.className).toContain('xl:max-w-[984px]');
    expect(contentColumn?.className).toContain('2xl:max-w-none');
  });

  it('renders zone-4 secondary nav aside gated on 2xl breakpoint (not xl)', () => {
    const { container } = render(
      <MemoryRouter>
        <NuqsAdapter>
          <NavProvider tree={[]}>
            <SidebarLayout
              navbar={<div>Navbar</div>}
              sidebar={<div>Sidebar</div>}
              secondary={[{ id: 'item-1', label: 'Item 1', to: '/test' }]}
            >
              <div>Content</div>
            </SidebarLayout>
          </NavProvider>
        </NuqsAdapter>
      </MemoryRouter>,
    );
    const aside = container.querySelector('aside');
    const classes = aside?.className.split(/\s+/) ?? [];
    expect(classes).toContain('hidden');
    expect(classes).toContain('2xl:flex');
    expect(classes).not.toContain('xl:flex');
  });

  it('exports centralized PAGE_SHELL_CONTAINER_CLASS with xl cap and 2xl/3xl rules', () => {
    expect(PAGE_SHELL_CONTAINER_CLASS).toContain('xl:max-w-[984px]');
    expect(PAGE_SHELL_CONTAINER_CLASS).toContain('2xl:max-w-none');
    expect(PAGE_SHELL_CONTAINER_CLASS).toContain('3xl:max-w-7xl');
    expect(PAGE_SHELL_CONTENT_SURFACE_CLASS).toContain('bg-background');
  });
});
