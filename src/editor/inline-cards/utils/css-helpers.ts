/**
 * CSS Helper Utilities
 * 
 * Utilities for reading CSS custom properties from TypeScript.
 * This allows TypeScript calculations to stay in sync with CSS design tokens.
 */

/**
 * Read a CSS custom property value from the document root
 * 
 * @param name - CSS variable name (including '--' prefix)
 * @param fallback - Fallback value if CSS variable is not defined or invalid
 * @returns The numeric value of the CSS variable in pixels
 * 
 * @example
 * const headerHeight = getCSSVariable('--wod-card-header-height', 32);
 */
export function getCSSVariable(name: string, fallback: number): number {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return fallback;
    }

    try {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(name)
            .trim();

        if (!value) {
            return fallback;
        }

        // Parse the value (remove 'px' suffix if present)
        const parsed = parseFloat(value.replace('px', ''));

        // Return fallback if parsing failed or resulted in NaN
        return isNaN(parsed) ? fallback : parsed;
    } catch (error) {
        console.warn(`Failed to read CSS variable ${name}, using fallback:`, error);
        return fallback;
    }
}

/**
 * Cache for CSS variable values to avoid repeated DOM reads
 */
const cssVariableCache = new Map<string, number>();

/**
 * Read a CSS custom property with caching
 * 
 * @param name - CSS variable name (including '--' prefix)
 * @param fallback - Fallback value if CSS variable is not defined or invalid
 * @returns The numeric value of the CSS variable in pixels
 * 
 * @example
 * const headerHeight = getCachedCSSVariable('--wod-card-header-height', 32);
 */
export function getCachedCSSVariable(name: string, fallback: number): number {
    if (cssVariableCache.has(name)) {
        return cssVariableCache.get(name)!;
    }

    const value = getCSSVariable(name, fallback);
    cssVariableCache.set(name, value);
    return value;
}

/**
 * Clear the CSS variable cache
 * Call this if CSS variables have been updated dynamically
 */
export function clearCSSVariableCache(): void {
    cssVariableCache.clear();
}

/**
 * Read multiple CSS variables at once
 * 
 * @param variables - Map of variable names to fallback values
 * @returns Map of variable names to their resolved values
 * 
 * @example
 * const values = getCSSVariables({
 *   '--wod-card-header-height': 32,
 *   '--wod-preview-header-height': 40,
 * });
 */
export function getCSSVariables(
    variables: Record<string, number>
): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [name, fallback] of Object.entries(variables)) {
        result[name] = getCSSVariable(name, fallback);
    }

    return result;
}
