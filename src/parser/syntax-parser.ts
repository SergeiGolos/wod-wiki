import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

import * as terms from '../grammar/parser.terms';
import {
  ActionPrimitive,
  DurationPrimitive,
  EffortPrimitive,
  LapPrimitive,
  QuantityPrimitive,
  RoundsPrimitive,
  SyntaxFacts,
  SyntaxMeta,
  SyntaxPrimitive,
  SyntaxStatement,
  TextPrimitive,
} from './syntax-facts';

export function extractSyntaxFacts(state: EditorState): SyntaxFacts {
  const tree = syntaxTree(state);
  const source = state.doc.toString();
  const statements: SyntaxStatement[] = [];

  tree.iterate({
    enter(node) {
      if (node.name !== 'Block') return;

      const statementMeta = createMeta(state, node.from, node.to, source.slice(node.from, node.to));
      const statement: SyntaxStatement = {
        id: statementMeta.line,
        line: statementMeta.line,
        meta: statementMeta,
        primitives: [],
        children: [],
        isLeaf: true,
      };

      const cursor = node.node.cursor();
      if (cursor.firstChild()) {
        do {
          const child = cursor.node;
          const childRaw = source.slice(child.from, child.to);

          if (child.type.id === terms.Lap) {
            const lapPrimitive: LapPrimitive = {
              kind: 'lap',
              raw: childRaw,
              meta: createMeta(state, child.from, child.to, childRaw),
              lapType: childRaw === '+' ? 'compose' : 'round',
            };
            statement.primitives.push(lapPrimitive);
            continue;
          }

          if (child.type.id !== terms.Fragment || !child.firstChild) {
            continue;
          }

          const fragmentNode = child.firstChild;
          const primitive = mapFragmentToPrimitive(state, source, fragmentNode as any);
          if (primitive) statement.primitives.push(primitive);
        } while (cursor.nextSibling());
      }

      statements.push(statement);
    },
  });

  applyIndentationNesting(statements);

  return { statements };
}

function mapFragmentToPrimitive(
  state: EditorState,
  source: string,
  node: { from: number; to: number; type: { id: number }; getChild: (name: string) => any }
): SyntaxPrimitive | null {
  const raw = source.slice(node.from, node.to);
  const meta = createMeta(state, node.from, node.to, raw);

  switch (node.type.id) {
    case terms.Duration: {
      const trend = node.getChild('Trend');
      const timerNode = node.getChild('Timer') || node.getChild('CollectibleTimer');

      const primitive: DurationPrimitive = {
        kind: 'duration',
        raw,
        meta,
        timerRaw: timerNode ? source.slice(timerNode.from, timerNode.to) : undefined,
        hasTrend: !!trend,
        isRequired: raw.includes('*'),
      };
      return primitive;
    }

    case terms.Rounds: {
      const sequence = node.getChild('Sequence');
      const label = node.getChild('Identifier');

      const primitive: RoundsPrimitive = {
        kind: 'rounds',
        raw,
        meta,
        sequence: sequence ? source.slice(sequence.from, sequence.to).split('-').map((n) => parseInt(n.trim(), 10)) : undefined,
        label: label ? source.slice(label.from, label.to) : undefined,
      };
      return primitive;
    }

    case terms.Action: {
      const primitive: ActionPrimitive = {
        kind: 'action',
        raw,
        meta,
        hasColonPrefix: raw.startsWith('[:'),
      };
      return primitive;
    }

    case terms.Text: {
      const primitive: TextPrimitive = {
        kind: 'text',
        raw,
        meta,
      };
      return primitive;
    }

    case terms.Quantity: {
      const hasAtSign = !!node.getChild('AtSign');
      const hasWeightUnit = !!node.getChild('WeightUnit');
      const hasDistanceUnit = !!node.getChild('DistanceUnit');
      const numberNode = node.getChild('Number');
      const unitNode = node.getChild('WeightUnit') || node.getChild('DistanceUnit');

      const primitive: QuantityPrimitive = {
        kind: 'quantity',
        raw,
        meta,
        value: numberNode ? parseFloat(source.slice(numberNode.from, numberNode.to)) : undefined,
        unit: unitNode ? source.slice(unitNode.from, unitNode.to) : '',
        hasAtSign,
        hasWeightUnit,
        hasDistanceUnit,
      };
      return primitive;
    }

    case terms.Effort: {
      const primitive: EffortPrimitive = {
        kind: 'effort',
        raw,
        meta,
      };
      return primitive;
    }

    default:
      return null;
  }
}

function applyIndentationNesting(statements: SyntaxStatement[]): void {
  const parentChildMap = new Map<number, number[]>();
  let stack: Array<{ columnStart: number; statement: SyntaxStatement }> = [];

  for (const statement of statements) {
    stack = stack.filter((item) => item.columnStart < statement.meta.columnStart);

    if (stack.length > 0) {
      for (const parent of stack) {
        if (!parentChildMap.has(parent.statement.id)) {
          parentChildMap.set(parent.statement.id, []);
        }
        parentChildMap.get(parent.statement.id)!.push(statement.id);
        statement.parentId = parent.statement.id;
      }
    }

    stack.push({ columnStart: statement.meta.columnStart, statement });
  }

  for (const statement of statements) {
    const flatChildren = parentChildMap.get(statement.id) ?? [];
    statement.children = groupChildrenByLap(flatChildren, statements);
    statement.isLeaf = statement.children.length === 0;
  }
}

function groupChildrenByLap(childIds: number[], statements: SyntaxStatement[]): number[][] {
  if (childIds.length === 0) return [];

  const byId = new Map(statements.map((statement) => [statement.id, statement]));
  const groups: number[][] = [];

  for (const childId of childIds) {
    const statement = byId.get(childId);
    const lap = statement?.primitives.find((primitive) => primitive.kind === 'lap') as LapPrimitive | undefined;

    if (lap?.lapType === 'compose' && groups.length > 0) {
      groups[groups.length - 1].push(childId);
    } else {
      groups.push([childId]);
    }
  }

  return groups;
}

function createMeta(state: EditorState, from: number, to: number, raw: string): SyntaxMeta {
  const line = state.doc.lineAt(from);

  return {
    line: line.number,
    startOffset: from,
    endOffset: to,
    columnStart: from - line.from,
    columnEnd: to - line.from,
    length: to - from,
    raw,
  };
}
