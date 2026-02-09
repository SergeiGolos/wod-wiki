/**
 * Hook for parsing WOD block content
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WodBlock, ParseError } from '../types';
import { sharedParser } from '../../parser/parserInstance';
import { MdTimerRuntime } from '../../parser/md-timer';
import { ICodeStatement } from '../../core/models/CodeStatement';
import { parseWodBlock } from '../utils/parseWodBlock';

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
      parserRef.current = sharedParser;
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
      const result = parseWodBlock(block.content, parserRef.current);
      
      setStatements(result.statements);
      setErrors(result.errors);
      setStatus(result.success ? 'success' : 'error');
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
