import { Compartment, Extension } from "@codemirror/state";

/**
 * Compartment for dynamic theme switching.
 */
export const themeCompartment = new Compartment();

/**
 * Compartment for dynamic language switching (e.g. plain Markdown vs Markdown + WodScript).
 */
export const languageCompartment = new Compartment();

/**
 * Compartment for editor mode (Edit, Track, Data).
 */
export const modeCompartment = new Compartment();

/**
 * Helper to reconfigure multiple compartments at once.
 */
export function reconfigureCompartments(view: any, config: {
  theme?: Extension,
  language?: Extension,
  mode?: Extension
}) {
  const effects = [];
  if (config.theme) effects.push(themeCompartment.reconfigure(config.theme));
  if (config.language) effects.push(languageCompartment.reconfigure(config.language));
  if (config.mode) effects.push(modeCompartment.reconfigure(config.mode));
  
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
}
