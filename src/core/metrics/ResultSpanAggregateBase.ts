import { ResultSpan } from "../ResultSpan";
import { IResultSpanAggregate } from "./IResultSpanAggregate";

/**
 * Base class for ResultSpan aggregators.
 * Provides common functionality for all aggregator implementations.
 */
export abstract class ResultSpanAggregateBase implements IResultSpanAggregate {
  private _id: string;
  private _displayName: string;

  /**
   * Creates a new instance of ResultSpanAggregateBase.
   * 
   * @param id - Unique identifier for this aggregator
   * @param displayName - Human-readable display name for this aggregator
   */
  constructor(id: string, displayName: string) {
    this._id = id;
    this._displayName = displayName;
  }

  /**
   * Gets the unique identifier for this aggregator.
   */
  public get id(): string {
    return this._id;
  }

  /**
   * Gets the display name for this aggregator.
   */
  public get displayName(): string {
    return this._displayName;
  }

  /**
   * Process a collection of ResultSpan objects to calculate aggregated statistics.
   * This method must be implemented by derived classes.
   * 
   * @param spans - Collection of ResultSpan objects to aggregate
   * @returns An object containing the aggregated statistics
   */
  public abstract aggregate(spans: ResultSpan[]): Record<string, any>;
}