import { describe, it, expect } from 'vitest';
import { parseQuery, isFindQuery, isRowsQuery, QueryService, type FactQueryStore } from '../src/index';

describe('@wod-wiki/wql', () => {
  it('parses find and rows queries', () => {
    const findAst = parseQuery('find pullups where reps > 10');
    expect(isFindQuery(findAst)).toBe(true);
    expect(findAst.target).toBe('pullups');

    const rowsAst = parseQuery('rows workouts limit 5');
    expect(isRowsQuery(rowsAst)).toBe(true);
    expect(rowsAst.target).toBe('workouts');
  });

  it('executes query with injected fact store', async () => {
    const mockStore: FactQueryStore = {
      getFacts: async () => [
        { line: 1, text: '21 pullups', metrics: [{ name: 'pullups', type: 'reps', value: 21 }] },
      ],
    };

    const service = new QueryService({ factStore: mockStore });
    const result = await service.executeQuery('find pullups');

    expect(result.count).toBe(1);
    expect(result.data.length).toBe(1);
  });
});
