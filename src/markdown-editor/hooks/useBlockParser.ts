/**
 * Hook for parsing WOD block content
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WodBlock, ParseError } from '../types';
import { MdTimerRuntime } from '../../parser/md-timer';
import { ICodeStatement } from '../../CodeStatement';

export interface UseBlockParserOptions {
  /** Debounce delay (default: 500ms) */
  debounceMs?: number;
  
  /** Whether to auto-parse on content change */
  autoParse?: boolean;
}

export interface UseBlockParserResult {
  /** Parsed statements */
  statements: ICodeStatement[];
  
  /** Parse errors */
  errors: ParseError[];
  
  /** Parse status */
  status: 'idle' | 'parsing' | 'success' | 'error';
  
  /** Trigger manual parse */
  parse: () => void;
  
  /** Clear parse results */
  clear: () => void;
}

/**
 * Hook for parsing a single WOD block
 */
export function useBlockParser(
  block: WodBlock | null,
  options: UseBlockParserOptions = {}
): UseBlockParserResult {
  const {
    debounceMs = 500,
    autoParse = true
  } = options;

  const [statements, setStatements] = useState<ICodeStatement[]>([]);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const parserRef = useRef<MdTimerRuntime | null>(null);
  const previousBlockIdRef = useRef<string | null>(null);

  // Initialize parser for this block
  useEffect(() => {
    if (block && !parserRef.current) {
      parserRef.current = new MdTimerRuntime();
    }
    
    return () => {
      // Cleanup parser on unmount
      parserRef.current = null;
    };
  }, [block]);

  // Parse function
  const parse = useCallback(() => {
    if (!block || !parserRef.current) {
      setStatements([]);
      setErrors([]);
      setStatus('idle');
      return;
    }

    setStatus('parsing');

    try {
      const script = parserRef.current.read(block.content);
      
      // Extract statements
      const parsedStatements = script.statements || [];
      
      // Extract errors
      const parseErrors: ParseError[] = (script.errors || []).map((err: any) => ({
        line: err.token?.startLine,
        column: err.token?.startColumn,
        message: err.message || 'Parse error',
        severity: 'error' as const
      }));

      setStatements(parsedStatements);
      setErrors(parseErrors);
      setStatus(parseErrors.length > 0 ? 'error' : 'success');
    } catch (error: any) {
      console.error('[useBlockParser] Parse error:', error);
      const errorMsg = error?.message || 'Unknown parse error';
      setErrors([{
        message: errorMsg,
        severity: 'error'
      }]);
      setStatements([]);
      setStatus('error');
    }
  }, [block]);

  // Auto-parse on block content change (debounced)
  useEffect(() => {
    if (!autoParse || !block) {
      // Clear state when block is null
      if (!block) {
        setStatements([]);
        setErrors([]);
        setStatus('idle');
      }
      return;
    }

    // Check if this is a new block (block ID changed)
    const isNewBlock = previousBlockIdRef.current !== block.id;
    previousBlockIdRef.current = block.id;

    // Clear existing timer
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
    }

    // Parse immediately for new blocks, debounce for content changes
    if (isNewBlock) {
      // Small delay to ensure parser is initialized
      parseTimerRef.current = setTimeout(parse, 50);
    } else {
      // Debounce content changes
      parseTimerRef.current = setTimeout(parse, debounceMs);
    }

    return () => {
      if (parseTimerRef.current) {
        clearTimeout(parseTimerRef.current);
      }
    };
  }, [block, block?.content, autoParse, debounceMs, parse]);

  // Clear function
  const clear = useCallback(() => {
    setStatements([]);
    setErrors([]);
    setStatus('idle');
  }, []);

  return {
    statements,
    errors,
    status,
    parse,
    clear
  };
}
