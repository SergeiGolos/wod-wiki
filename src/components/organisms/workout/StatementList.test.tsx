import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { StatementList } from './StatementList';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import { MetricContainer } from '@/core/models/MetricContainer';

describe('StatementList', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  const mockStatements: ICodeStatement[] = [
    {
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
    } as ICodeStatement,
    {
      id: 2,
      raw: '20 Push-ups',
      type: 'rep',
      metrics: new MetricContainer([
        { type: 'rep', origin: 'parser', value: 20, image: '20' },
        { type: 'action', origin: 'parser', value: 'Push-ups', image: 'Push-ups' },
      ]),
      meta: { line: 2 },
      metricMeta: new Map(),
      children: [],
    } as ICodeStatement,
  ];

  describe('Basic rendering', () => {
    it('renders all statements in order', () => {
      const { container } = render(<StatementList statements={mockStatements} />);

      // Target the direct children of the wrapper - the statement divs
      const wrapper = container.querySelector('.space-y-1');
      const statementDivs = wrapper?.children;
      expect(statementDivs?.length).toBe(2);
    });

    it('displays statement line numbers from meta', () => {
      const { container } = render(<StatementList statements={mockStatements} />);

      const wrapper = container.querySelector('.space-y-1');
      const lineNumbers = wrapper?.querySelectorAll('.text-\\[10px\\]');
      expect(lineNumbers?.[0]?.textContent).toBe('1');
      expect(lineNumbers?.[1]?.textContent).toBe('2');
    });

    it('falls back to 1-based index when meta.line is missing', () => {
      const statementsWithoutLines: ICodeStatement[] = [
        {
          id: 1,
          raw: 'Test',
          type: 'unknown',
          metrics: new MetricContainer([]),
          metricMeta: new Map(),
          children: [],
        } as ICodeStatement,
        {
          id: 2,
          raw: 'Test 2',
          type: 'unknown',
          metrics: new MetricContainer([]),
          metricMeta: new Map(),
          children: [],
        } as ICodeStatement,
      ];

      const { container } = render(<StatementList statements={statementsWithoutLines} />);

      const wrapper = container.querySelector('.space-y-1');
      const lineNumbers = wrapper?.querySelectorAll('.text-\\[10px\\]');
      expect(lineNumbers?.[0]?.textContent).toBe('1');
      expect(lineNumbers?.[1]?.textContent).toBe('2');
    });

    it('renders MetricVisualizer for each statement', () => {
      const { container } = render(<StatementList statements={mockStatements} />);

      const wrapper = container.querySelector('.space-y-1');
      const metricVisualizers = wrapper?.querySelectorAll('.flex-1.min-w-0');
      expect(metricVisualizers?.length).toBe(2);
    });
  });

  describe('Active statement highlighting', () => {
    it('highlights statements in activeStatementIds set', () => {
      const activeIds = new Set([1]);
      const { container } = render(
        <StatementList statements={mockStatements} activeStatementIds={activeIds} />
      );

      const wrapper = container.querySelector('.space-y-1');
      const statements = wrapper?.querySelectorAll('.p-1.rounded');
      expect(statements?.length).toBe(2);

      const firstStatement = statements?.[0];
      const secondStatement = statements?.[1];

      expect(firstStatement?.className).toContain('bg-blue-500/10');
      expect(firstStatement?.className).toContain('border-l-2');
      expect(firstStatement?.className).toContain('border-blue-500');

      expect(secondStatement?.className).not.toContain('bg-blue-500/10');
      expect(secondStatement?.className).not.toContain('border-l-2');
    });

    it('highlights multiple active statements', () => {
      const activeIds = new Set([1, 2]);
      const { container } = render(
        <StatementList statements={mockStatements} activeStatementIds={activeIds} />
      );

      const wrapper = container.querySelector('.space-y-1');
      const statements = wrapper?.querySelectorAll('.p-1.rounded');
      expect(statements?.length).toBe(2);

      statements?.forEach((statement) => {
        expect(statement?.className).toContain('bg-blue-500/10');
        expect(statement?.className).toContain('border-l-2');
      });
    });

    it('does not highlight any statements when activeStatementIds is empty', () => {
      const activeIds = new Set<number>();
      const { container } = render(
        <StatementList statements={mockStatements} activeStatementIds={activeIds} />
      );

      const wrapper = container.querySelector('.space-y-1');
      const statements = wrapper?.querySelectorAll('.p-1.rounded');
      statements?.forEach((statement) => {
        expect(statement?.className).not.toContain('bg-blue-500/10');
        expect(statement?.className).not.toContain('border-l-2');
      });
    });

    it('defaults to empty set when activeStatementIds is not provided', () => {
      const { container } = render(<StatementList statements={mockStatements} />);

      const wrapper = container.querySelector('.space-y-1');
      const statements = wrapper?.querySelectorAll('.p-1.rounded');
      statements?.forEach((statement) => {
        expect(statement?.className).not.toContain('bg-blue-500/10');
        expect(statement?.className).not.toContain('border-l-2');
      });
    });
  });

  describe('Styling and layout', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <StatementList statements={mockStatements} className="custom-class" />
      );

      const wrapper = container.querySelector('.space-y-1');
      expect(wrapper?.className).toContain('custom-class');
    });

    it('maintains vertical spacing between statements', () => {
      const { container } = render(<StatementList statements={mockStatements} />);

      const wrapper = container?.querySelector('.space-y-1');
      expect(wrapper).toBeTruthy();
    });

    it('applies transition-colors class for smooth highlighting', () => {
      const { container } = render(<StatementList statements={mockStatements} />);

      const wrapper = container.querySelector('.space-y-1');
      const statements = wrapper?.querySelectorAll('.p-1.rounded');
      statements?.forEach((statement) => {
        expect(statement?.className).toContain('transition-colors');
      });
    });
  });

  describe('Edge cases', () => {
    it('renders empty list when statements array is empty', () => {
      const { container } = render(<StatementList statements={[]} />);

      const wrapper = container.querySelector('.space-y-1');
      expect(wrapper?.children.length).toBe(0);
    });

    it('handles statements with empty metrics', () => {
      const emptyMetricStatement: ICodeStatement[] = [
        {
          id: 1,
          raw: '',
          type: 'unknown',
          metrics: new MetricContainer([]),
          meta: { line: 1 },
          metricMeta: new Map(),
          children: [],
        } as ICodeStatement,
      ];

      const { container } = render(<StatementList statements={emptyMetricStatement} />);

      const wrapper = container.querySelector('.space-y-1');
      const statementDivs = wrapper?.querySelectorAll('.p-1.rounded');
      expect(statementDivs?.length).toBe(1);
    });

    it('handles statements without id field (uses index as key)', () => {
      const statementsWithoutId: ICodeStatement[] = [
        {
          raw: 'Test',
          type: 'unknown',
          metrics: new MetricContainer([]),
          metricMeta: new Map(),
          children: [],
        } as ICodeStatement,
      ];

      const { container } = render(<StatementList statements={statementsWithoutId} />);

      const wrapper = container.querySelector('.space-y-1');
      const statementDivs = wrapper?.querySelectorAll('.p-1.rounded');
      expect(statementDivs?.length).toBe(1);
    });
  });
});
