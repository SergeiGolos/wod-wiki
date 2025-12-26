import React from 'react';
import { IDisplayCardEntry } from '../types/DisplayTypes';

/**
 * Props passed to all card components.
 */
export interface CardComponentProps {
  /** The card entry containing display configuration */
  entry: IDisplayCardEntry;
  
  /** Callback when a button is clicked */
  onButtonClick?: (eventName: string, payload?: Record<string, unknown>) => void;
}

/**
 * Type for a card component that can be registered.
 */
export type CardComponent = React.ComponentType<CardComponentProps>;

/**
 * Registry for custom card components.
 * 
 * Allows registration of custom React components for different card types
 * or custom component IDs. The Clock UI uses this registry to render
 * the appropriate component based on the card entry.
 * 
 * Built-in card types have default components, but can be overridden:
 * - 'idle-start' - Shows "Start Workout" message
 * - 'idle-complete' - Shows "View Analytics" message  
 * - 'active-block' - Shows current block metrics
 * - 'rest-period' - Shows rest period info
 * - 'custom' - Uses componentId to look up a registered component
 */
class CardComponentRegistryClass {
  private components: Map<string, CardComponent> = new Map();

  /**
   * Register a custom card component.
   * 
   * @param id The component ID or card type to register for
   * @param component The React component to render
   * 
   * @example
   * ```tsx
   * // Register a custom component
   * CardComponentRegistry.register('my-custom-card', MyCustomCardComponent);
   * 
   * // Override a built-in type
   * CardComponentRegistry.register('idle-start', MyCustomIdleStartCard);
   * ```
   */
  register(id: string, component: CardComponent): void {
    this.components.set(id, component);
  }

  /**
   * Unregister a card component.
   * 
   * @param id The component ID to unregister
   */
  unregister(id: string): void {
    this.components.delete(id);
  }

  /**
   * Get a registered component by ID.
   * 
   * @param id The component ID or card type
   * @returns The registered component or undefined
   */
  get(id: string): CardComponent | undefined {
    return this.components.get(id);
  }

  /**
   * Check if a component is registered.
   * 
   * @param id The component ID or card type
   * @returns True if registered
   */
  has(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Get a component for a card entry, resolving type and componentId.
   * 
   * Resolution order:
   * 1. If type is 'custom' and componentId is set, look up by componentId
   * 2. Look up by card type
   * 3. Return undefined if not found
   * 
   * @param entry The card entry to resolve
   * @returns The resolved component or undefined
   */
  resolve(entry: IDisplayCardEntry): CardComponent | undefined {
    // Custom components use componentId
    if (entry.type === 'custom' && entry.componentId) {
      const custom = this.components.get(entry.componentId);
      if (custom) return custom;
    }

    // Fall back to type-based lookup
    return this.components.get(entry.type);
  }

  /**
   * List all registered component IDs.
   * 
   * @returns Array of registered IDs
   */
  list(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Clear all registered components.
   */
  clear(): void {
    this.components.clear();
  }
}

/**
 * Global singleton registry for card components.
 */
export const CardComponentRegistry = new CardComponentRegistryClass();
