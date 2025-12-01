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

      // TODO: Handle inheritance rules when needed
    }

    // Recursively process children
    if (statement.children) {
      // children is number[][] - we need to handle this appropriately
      // For now, hints are added to statements, not child IDs
      // The actual child statements would be processed separately
      // when they are compiled
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
