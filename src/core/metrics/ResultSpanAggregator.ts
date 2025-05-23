import { ResultSpan } from "../ResultSpan";
import { IResultSpanAggregate } from "./IResultSpanAggregate";

/**
 * Service class for aggregating statistics from ResultSpans using a collection
 * of IResultSpanAggregate implementations.
 */
export class ResultSpanAggregator {
  private _aggregators: IResultSpanAggregate[] = [];

  /**
   * Creates a new instance of ResultSpanAggregator.
   * 
   * @param aggregators - Optional initial collection of aggregators
   */
  constructor(aggregators: IResultSpanAggregate[] = []) {
    this._aggregators = [...aggregators];
  }

  /**
   * Gets the current collection of aggregators.
   */
  public get aggregators(): IResultSpanAggregate[] {
    return [...this._aggregators];
  }

  /**
   * Adds an aggregator to the collection.
   * 
   * @param aggregator - The aggregator to add
   * @returns This instance for method chaining
   */
  public addAggregator(aggregator: IResultSpanAggregate): ResultSpanAggregator {
    if (!this._aggregators.some(a => a.id === aggregator.id)) {
      this._aggregators.push(aggregator);
    }
    return this;
  }

  /**
   * Adds multiple aggregators to the collection.
   * 
   * @param aggregators - The aggregators to add
   * @returns This instance for method chaining
   */
  public addAggregators(aggregators: IResultSpanAggregate[]): ResultSpanAggregator {
    aggregators.forEach(aggregator => this.addAggregator(aggregator));
    return this;
  }

  /**
   * Removes an aggregator from the collection by its ID.
   * 
   * @param id - The ID of the aggregator to remove
   * @returns This instance for method chaining
   */
  public removeAggregator(id: string): ResultSpanAggregator {
    this._aggregators = this._aggregators.filter(a => a.id !== id);
    return this;
  }

  /**
   * Clears all aggregators from the collection.
   * 
   * @returns This instance for method chaining
   */
  public clearAggregators(): ResultSpanAggregator {
    this._aggregators = [];
    return this;
  }

  /**
   * Processes a collection of ResultSpan objects using all registered aggregators.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns An object containing all aggregated statistics keyed by aggregator ID
   */
  public aggregate(spans: ResultSpan[]): Record<string, any> {
    const results: Record<string, any> = {};

    this._aggregators.forEach(aggregator => {
      const aggregateResult = aggregator.aggregate(spans);
      results[aggregator.id] = {
        displayName: aggregator.displayName,
        data: aggregateResult
      };
    });

    return results;
  }
}