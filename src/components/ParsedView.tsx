import React, { useMemo, useState } from 'react';
import { Lexer } from 'chevrotain';
import { allTokens } from '../parser/timer.tokens';
import { MdTimerParse } from '../parser/timer.parser';
import { MdTimerInterpreter } from '../parser/timer.visitor';
import { WodScript } from '../parser/WodScript';
import { ICodeStatement } from '../core/models/CodeStatement';
import { WodScriptVisualizer } from './WodScriptVisualizer';

interface ParsedViewProps {
  wodscript: string;
  onSelectionChange?: (statementId: number | null) => void;
  activeStatementIds?: number[];
  selectedStatementId?: number | null;
}

const ParsedView: React.FC<ParsedViewProps> = ({
  wodscript,
  onSelectionChange,
  activeStatementIds,
  selectedStatementId,
}) => {
  const [error, setError] = useState<string | null>(null);

  const parsedScript = useMemo(() => {
    setError(null);
    if (!wodscript) return null;
    
    const trimmedScript = wodscript.trim();

    try {
      const lexer = new Lexer(allTokens);
      const lexingResult = lexer.tokenize(trimmedScript);
      
      if (lexingResult.errors.length > 0) {
        const msg = `Lexing errors: ${lexingResult.errors.map(e => e.message).join(', ')}`;
        console.error(msg);
        setError(msg);
        return null;
      }

      const parser = new MdTimerParse(lexingResult.tokens) as any;
      const cst = parser.wodMarkdown();

      if (parser.errors.length > 0) {
        const msg = `Parsing errors: ${parser.errors.map((e: any) => e.message).join(', ')}`;
        console.error(msg);
        setError(msg);
        return null;
      }

      const interpreter = new MdTimerInterpreter();
      const statements = interpreter.visit(cst) as ICodeStatement[];
      
      return new WodScript(trimmedScript, statements);
    } catch (e) {
      const msg = `Error parsing script: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      setError(msg);
      return null;
    }
  }, [wodscript]);

  if (error) {
    return <div className="text-red-500 p-4 border border-red-200 rounded bg-red-50">{error}</div>;
  }

  if (!parsedScript) {
    return <div className="text-gray-500">No script to display</div>;
  }

  return (
    <div className="flex flex-col gap-1 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg font-mono text-sm">
      <WodScriptVisualizer
        statements={parsedScript.statements}
        activeStatementIds={activeStatementIds ? new Set(activeStatementIds) : undefined}
        selectedStatementId={selectedStatementId}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
};

export default ParsedView;
