import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PRBadge } from './PRBadge';

afterEach(cleanup);

describe('PRBadge', () => {
  it('renders nothing when isPR is false', () => {
    const { container } = render(<PRBadge isPR={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders PR badge when isPR is true', () => {
    render(<PRBadge isPR={true} label="Total Volume" />);
    expect(screen.getByText(/PR/i)).toBeTruthy();
    expect(screen.getByText(/Total Volume/i)).toBeTruthy();
  });

  it('renders improvement delta when supplied', () => {
    render(<PRBadge isPR={true} improvement={400} unit="kg" />);
    expect(screen.getByText(/\+400\s*kg/i)).toBeTruthy();
  });
});
