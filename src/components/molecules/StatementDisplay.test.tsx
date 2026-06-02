import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { StatementDisplay, BlockDisplay, MetricList } from './StatementDisplay';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { IMetric } from '@/core/models/IMetric';
import { MetricContainer } from '@/core/models/MetricContainer';

describe('StatementDisplay', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const mockStatement: ICodeStatement = {
    id: 1,
    raw: '10:00 Run',
    type: 'timer',
    metrics: new MetricContainer([
      { type: 'timer', origin: 'parser', value: { duration: 600000 }, image: '10:00' },
      { type: 'action', origin: 'parser', value: 'Run', image: 'Run' },
    ]),
    meta: { line: 1 },
    metricMeta: new Map(),
    children: [],
  } as ICodeStatement;

  describe('Basic rendering', () => {
    it('renders statement with metrics', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} />);

      expect(container.querySelector('.flex.items-center')).toBeTruthy();
    });

    it('applies compact styling when compact prop is true', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} compact={true} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).toContain('p-1.5');
    });

    it('applies regular padding when compact prop is false', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} compact={false} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).toContain('p-2');
    });

    it('renders actions when provided', () => {
      const actions = <button data-testid="test-action">Action</button>;

      const { container } = render(
        <StatementDisplay statement={mockStatement} actions={actions} />
      );

      expect(screen.getByTestId('test-action')).toBeDefined();
    });
  });

  describe('Active state', () => {
    it('applies active styling when isActive is true', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} isActive={true} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).toContain('bg-primary/10');
      expect(statementDiv?.className).toContain('border-primary');
    });

    it('does not apply active styling when isActive is false', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} isActive={false} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).not.toContain('bg-primary/10');
    });
  });

  describe('Grouped state', () => {
    it('applies grouped styling when isGrouped is true', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} isGrouped={true} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).toContain('hover:bg-accent/5');
    });

    it('removes border when isGrouped is true', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} isGrouped={true} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).not.toContain('border');
    });
  });

  describe('Click handling', () => {
    it('calls onClick when clicked', () => {
      let clicked = false;
      const handleClick = () => {
        clicked = true;
      };

      const { container } = render(
        <StatementDisplay statement={mockStatement} onClick={handleClick} />
      );

      const statementDiv = container.querySelector('.flex.items-center');
      fireEvent.click(statementDiv!);

      expect(clicked).toBe(true);
    });

    it('applies cursor pointer when onClick is provided', () => {
      const { container } = render(
        <StatementDisplay statement={mockStatement} onClick={() => {}} />
      );

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).toContain('cursor-pointer');
    });

    it('does not apply cursor pointer when onClick is not provided', () => {
      const { container } = render(<StatementDisplay statement={mockStatement} />);

      const statementDiv = container.querySelector('.flex.items-center');
      expect(statementDiv?.className).not.toContain('cursor-pointer');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <StatementDisplay statement={mockStatement} className="custom-class" />
      );

      const statementDiv = container.querySelector('.custom-class');
      expect(statementDiv).toBeTruthy();
    });
  });
});

describe('BlockDisplay', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const mockMetrics: IMetric[] = [
    { type: 'rep', origin: 'parser', value: 10, image: '10' },
    { type: 'action', origin: 'parser', value: 'Push-ups', image: 'Push-ups' },
  ];

  describe('Basic rendering', () => {
    it('renders block label', () => {
      render(<BlockDisplay label="Round 1" blockType="round" />);

      expect(screen.getByText('Round 1')).toBeDefined();
    });

    it('renders block type badge when no actions provided', () => {
      render(<BlockDisplay label="Round 1" blockType="round" />);

      expect(screen.getByText('round')).toBeDefined();
    });

    it('renders metrics when provided', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" metrics={mockMetrics} />
      );

      expect(container.querySelector('.flex-1.min-w-0')).toBeTruthy();
    });

    it('renders actions when provided', () => {
      const actions = <button data-testid="block-action">Action</button>;

      render(
        <BlockDisplay label="Round 1" blockType="round" actions={actions} />
      );

      expect(screen.getByTestId('block-action')).toBeDefined();
    });
  });

  describe('Status indicator', () => {
    it('renders green status for complete', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" status="complete" />
      );

      const statusIndicator = container.querySelector('.bg-green-500');
      expect(statusIndicator).toBeTruthy();
    });

    it('renders primary status for active', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" status="active" />
      );

      const statusIndicator = container.querySelector('.bg-primary');
      expect(statusIndicator).toBeTruthy();
    });

    it('renders animated primary status for running', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" status="running" />
      );

      const statusIndicator = container.querySelector('.animate-pulse');
      expect(statusIndicator).toBeTruthy();
    });

    it('renders gray status for pending', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" status="pending" />
      );

      const statusIndicator = container.querySelector('.bg-gray-400');
      expect(statusIndicator).toBeTruthy();
    });
  });

  describe('Depth indentation', () => {
    it('applies indentation for depth 1', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" depth={1} />
      );

      const indentation = container.querySelector('.border-l');
      expect(indentation).toBeTruthy();
    });

    it('does not apply indentation for depth 0', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" depth={0} />
      );

      const indentation = container.querySelector('.border-l');
      expect(indentation).toBeNull();
    });
  });

  describe('Highlighting states', () => {
    it('applies highlighted styling when isHighlighted is true', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" isHighlighted={true} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      expect(blockDiv?.className).toContain('bg-primary/10');
    });

    it('applies active styling when isActive is true', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" isActive={true} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      expect(blockDiv?.className).toContain('bg-muted/50');
    });

    it('applies line-through to label when status is complete', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" status="complete" />
      );

      const label = screen.getByText('Round 1');
      expect(label.className).toContain('line-through');
      expect(label.className).toContain('opacity-60');
    });
  });

  describe('Event handlers', () => {
    it('calls onClick when clicked', () => {
      let clicked = false;
      const handleClick = () => {
        clicked = true;
      };

      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" onClick={handleClick} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      fireEvent.click(blockDiv!);

      expect(clicked).toBe(true);
    });

    it('calls onMouseEnter when mouse enters', () => {
      let mouseEntered = false;
      const handleMouseEnter = () => {
        mouseEntered = true;
      };

      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" onMouseEnter={handleMouseEnter} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      fireEvent.mouseEnter(blockDiv!);

      expect(mouseEntered).toBe(true);
    });

    it('calls onMouseLeave when mouse leaves', () => {
      let mouseLeft = false;
      const handleMouseLeave = () => {
        mouseLeft = true;
      };

      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" onMouseLeave={handleMouseLeave} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      fireEvent.mouseLeave(blockDiv!);

      expect(mouseLeft).toBe(true);
    });
  });

  describe('Compact mode', () => {
    it('applies compact padding when compact is true', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" compact={true} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      expect(blockDiv?.className).toContain('py-1');
      expect(blockDiv?.className).toContain('px-1.5');
    });

    it('applies regular padding when compact is false', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" compact={false} />
      );

      const blockDiv = container.querySelector('.flex.items-center');
      expect(blockDiv?.className).toContain('py-1.5');
      expect(blockDiv?.className).toContain('px-2');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <BlockDisplay label="Round 1" blockType="round" className="custom-class" />
      );

      const blockDiv = container.querySelector('.custom-class');
      expect(blockDiv).toBeTruthy();
    });
  });
});

describe('MetricList', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const mockMetrics: IMetric[] = [
    { type: 'rep', origin: 'parser', value: 10, image: '10' },
    { type: 'action', origin: 'parser', value: 'Push-ups', image: 'Push-ups' },
  ];

  describe('Basic rendering', () => {
    it('renders metrics when provided', () => {
      const { container } = render(<MetricList metrics={mockMetrics} />);

      expect(container.firstChild).toBeTruthy();
    });

    it('renders null when metrics array is empty', () => {
      const { container } = render(<MetricList metrics={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders null when metrics is undefined', () => {
      const { container } = render(<MetricList metrics={undefined as any} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Compact mode', () => {
    it('applies compact gap styling when compact is true', () => {
      const { container } = render(<MetricList metrics={mockMetrics} compact={true} />);

      const metricList = container.firstChild;
      expect(metricList?.className).toContain('gap-0.5');
    });

    it('applies regular gap styling when compact is false', () => {
      const { container } = render(<MetricList metrics={mockMetrics} compact={false} />);

      const metricList = container.firstChild;
      expect(metricList?.className).toContain('gap-1');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MetricList metrics={mockMetrics} className="custom-class" />
      );

      const metricList = container.querySelector('.custom-class');
      expect(metricList).toBeTruthy();
    });
  });
});
