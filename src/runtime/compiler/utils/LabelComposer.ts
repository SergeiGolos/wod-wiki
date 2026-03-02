import { ICodeStatement } from "../../../core/models/CodeStatement";
import { FragmentType, ICodeFragment } from "../../../core/models/CodeFragment";

export interface LabelOptions {
  includeMetric?: boolean;
  includeLogic?: boolean;
  includeIdentity?: boolean;
  includeAttributes?: boolean;
  defaultLabel?: string;
  format?: 'metric-first' | 'logic-first' | 'identity-first';
}

/**
 * Utility for composing standardized labels for runtime blocks from parsed statements.
 *
 * Standardized Pattern: [Logic] [Metric] [Identity] [Attributes]
 */
export class LabelComposer {
  /**
   * Builds a descriptive label from a set of statements.
   */
  static build(statements: ICodeStatement[], options: LabelOptions = {}): string {
    const {
      includeMetric = true,
      includeLogic = true,
      includeIdentity = true,
      includeAttributes = true,
      defaultLabel = "Block",
      format = 'logic-first'
    } = options;

    const allFragments = statements
      .flatMap(s => s.fragments)
      .filter(f => f.origin !== 'runtime');

    if (allFragments.length === 0) return defaultLabel;

    // 1. Check for explicit Label fragment
    const explicitLabel = allFragments.find(f => f.fragmentType === FragmentType.Label);
    if (explicitLabel) return explicitLabel.image || explicitLabel.value?.toString() || defaultLabel;

    const metric = includeMetric ? this.getPrimaryMetric(allFragments) : undefined;
    const logic = includeLogic ? this.getLogicKeyword(statements, allFragments) : undefined;
    const identity = includeIdentity ? this.getIdentityText(allFragments) : undefined;
    const attributes = includeAttributes ? this.getAttributesText(allFragments) : undefined;

    const parts: string[] = [];

    if (format === 'logic-first') {
        if (logic) parts.push(logic);
        if (metric) parts.push(metric);
        if (identity) parts.push(identity);
        if (attributes) parts.push(attributes);
    } else if (format === 'metric-first') {
        if (metric) parts.push(metric);
        if (logic) parts.push(logic);
        if (identity) parts.push(identity);
        if (attributes) parts.push(attributes);
    } else { // identity-first
        if (identity) parts.push(identity);
        if (metric) parts.push(metric);
        if (logic) parts.push(logic);
        if (attributes) parts.push(attributes);
    }

    // Fallback: If no structured parts, join all non-runtime fragments
    if (parts.length === 0) {
      return allFragments
        .filter(f => {
            if (!f.image) return false;
            // Filter out structural symbols from fallback label
            const type = f.fragmentType || f.type;
            return type !== FragmentType.Lap && type !== FragmentType.Group && type !== 'lap' && type !== 'group';
        })
        .map(f => f.image)
        .join(" ") || defaultLabel;
    }

    return parts.join(" ").trim().replace(/\s+/g, ' ');
  }

  private static getPrimaryMetric(fragments: ICodeFragment[]): string | undefined {
    // Priority 1: Rounds sequence (21-15-9) or Rounds count
    const rounds = fragments.find(f => f.fragmentType === FragmentType.Rounds);
    if (rounds && rounds.image) return rounds.image;

    // Priority 2: Duration (5:00, :30)
    const duration = fragments.find(f => f.fragmentType === FragmentType.Duration);
    if (duration && duration.image) return duration.image;

    // Note: We don't use Rep fragments here if they are part of the identity (e.g. "100 Swings")
    // Unless there is NO identity.
    return undefined;
  }

  private static getLogicKeyword(statements: ICodeStatement[], fragments: ICodeFragment[]): string | undefined {
    // Check hints first (from Dialect analysis)
    if (statements.some(s => s.hints?.has('workout.amrap'))) return 'AMRAP';
    if (statements.some(s => s.hints?.has('workout.emom'))) return 'EMOM';
    if (statements.some(s => s.hints?.has('workout.tabata'))) return 'TABATA';
    if (statements.some(s => s.hints?.has('workout.for_time'))) return 'FOR TIME';

    // Fallback: Check for keywords in fragments
    const keywords = ['AMRAP', 'EMOM', 'TABATA', 'FOR TIME'];
    for (const frag of fragments) {
      const val = (frag.image || frag.value?.toString() || "").toUpperCase();
      if (keywords.includes(val)) return val;
    }

    return undefined;
  }

  private static getIdentityText(fragments: ICodeFragment[]): string | undefined {
    const logicKeywords = ['AMRAP', 'EMOM', 'TABATA', 'FOR TIME'];
    
    // Filter fragments that contribute to the identity
    // We include Reps here if they are interleaved (e.g. "100 KB Swings")
    const identityFragments = fragments.filter(f => {
      if (f.fragmentType === FragmentType.Duration || f.fragmentType === FragmentType.Rounds || 
          f.fragmentType === FragmentType.Resistance || f.fragmentType === FragmentType.Distance ||
          f.fragmentType === FragmentType.Lap || f.fragmentType === FragmentType.Group) {
          return false;
      }
      const val = (f.image || f.value?.toString() || "").toUpperCase();
      return !logicKeywords.includes(val);
    });

    if (identityFragments.length === 0) return undefined;
    return identityFragments.map(f => f.image).join(" ").trim();
  }

  private static getAttributesText(fragments: ICodeFragment[]): string | undefined {
    const attrFragments = fragments.filter(f => 
      f.fragmentType === FragmentType.Resistance || 
      f.fragmentType === FragmentType.Distance
    );

    if (attrFragments.length === 0) return undefined;
    return attrFragments.map(f => f.image).join(" ").trim();
  }
}
