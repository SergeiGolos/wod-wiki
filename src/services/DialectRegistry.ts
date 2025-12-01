import { ICodeStatement } from "../core/models/CodeStatement";
import { IDialect, DialectAnalysis } from "../core/models/Dialect";

/**
 * Registry service for managing and processing dialects.
 * Dialects are processed in registration order, and each dialect
 * can add semantic hints to statements before JIT compilation.
 */
export class DialectRegistry {
  private dialects: Map<string, IDialect> = new Map();

  /**
   * Register a dialect for processing
   */
  register(dialect: IDialect): void {
    this.dialects.set(dialect.id, dialect);
  }

  /**
   * Unregister a dialect
   */
  unregister(dialectId: string): void {
    this.dialects.delete(dialectId);
  }

  /**
   * Get a registered dialect by ID
   */
  get(dialectId: string): IDialect | undefined {
    return this.dialects.get(dialectId);
  }

  /**
   * Get all registered dialect IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.dialects.keys());
  }

  /**
   * Process a statement through all registered dialects.
   * Dialects are processed in registration order.
   * Results are accumulated onto the statement's hints set.
   * 
   * Note: Child statements (referenced by IDs in statement.children) are processed
   * separately when they are compiled through the JIT compiler, which calls
   * processAll() on each batch of statements being compiled.
   * 
   * @param statement The statement to process
   */
  process(statement: ICodeStatement): void {
    // Ensure hints set exists
    if (!statement.hints) {
      statement.hints = new Set();
    }

    for (const dialect of this.dialects.values()) {
      const analysis: DialectAnalysis = dialect.analyze(statement);

      // Add hints from dialect analysis
      for (const hint of analysis.hints) {
        statement.hints.add(hint);
      }

      // Note: Inheritance rules (analysis.inheritance) are designed for future use
      // to allow parent blocks to influence child behavior (see Dialect.ts for details).
      // Current implementation focuses on hint generation only.
    }
  }

  /**
   * Process multiple statements through all registered dialects
   */
  processAll(statements: ICodeStatement[]): void {
    for (const statement of statements) {
      this.process(statement);
    }
  }

  /**
   * Clear all registered dialects
   */
  clear(): void {
    this.dialects.clear();
  }
}
