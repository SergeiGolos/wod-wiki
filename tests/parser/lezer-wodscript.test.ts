import { describe, it, expect } from 'bun:test';
import { EditorState } from "@codemirror/state";
import { wodscriptLanguage } from "../../src/parser/wodscript-language";
import { extractStatements } from "../../src/parser/lezer-mapper";
import { MetricType } from "../../src/core/models/Metric";

describe('Lezer WodScript Parser', () => {
  const parse = (code: string) => {
    const state = EditorState.create({
      doc: code,
      extensions: [wodscriptLanguage]
    });
    return extractStatements(state);
  };

  it('should parse a simple exercise', () => {
    const code = `21 95lb Thrusters\n`;
    const statements = parse(code);
    
    expect(statements.length).toBe(1);
    const s = statements[0];
    expect(s.metrics.length).toBe(3);
    
    expect(s.metrics[0].metricType).toBe(MetricType.Rep);
    expect(s.metrics[0].value).toBe(21);
    
    expect(s.metrics[1].metricType).toBe(MetricType.Resistance);
    expect((s.metrics[1] as any).value).toEqual({ amount: 95, units: "lb" });
    
    expect(s.metrics[2].metricType).toBe(MetricType.Effort);
    expect(s.metrics[2].value).toBe("Thrusters");
  });

  it('should parse a complex workout with nesting', () => {
    const code = `5:00 AMRAP\n - 10 Pullups\n - 10 Pushups\n`;
    const statements = parse(code);
    
    expect(statements.length).toBe(3);
    
    // 5:00 AMRAP
    expect(statements[0].metrics[0].metricType).toBe(MetricType.Duration);
    expect(statements[0].metrics[0].image).toBe("5:00");
    expect(statements[0].metrics[1].value).toBe("AMRAP");
    
    // - 10 Pullups
    expect(statements[1].parent).toBe(statements[0].id);
    expect(statements[1].metrics[0].metricType).toBe(MetricType.Group);
    expect((statements[1].metrics[0] as any).group).toBe('round');
    
    // - 10 Pushups
    expect(statements[2].parent).toBe(statements[0].id);
  });

  it('should parse collectible metrics', () => {
    const code = `:? KB Swings ?kg\n`;
    const statements = parse(code);
    
    expect(statements[0].metrics[0].metricType).toBe(MetricType.Duration);
    expect(statements[0].metrics[0].value).toBeUndefined();
    
    expect(statements[0].metrics[2].metricType).toBe(MetricType.Resistance);
    expect((statements[0].metrics[2] as any).value.amount).toBeUndefined();
  });

  it('should handle rounds sequences', () => {
    const code = `(21-15-9)\n - Thrusters\n`;
    const statements = parse(code);
    
    expect(statements[0].metrics[0].metricType).toBe(MetricType.Rounds);
    expect(statements[0].metrics[0].value).toBe(3);
    expect(statements[0].metrics[1].metricType).toBe(MetricType.Rep);
    expect(statements[0].metrics[1].value).toBe(21);
    expect(statements[0].metrics[2].metricType).toBe(MetricType.Rep);
    expect(statements[0].metrics[2].value).toBe(15);
    expect(statements[0].metrics[3].metricType).toBe(MetricType.Rep);
    expect(statements[0].metrics[3].value).toBe(9);
  });

  it('should parse actions and comments', () => {
    const code = `[:Rest] // take it easy\n`;
    const statements = parse(code);
    
    expect(statements[0].metrics[0].metricType).toBe(MetricType.Action);
    expect(statements[0].metrics[0].value).toBe("Rest");
    
    expect(statements[0].metrics[1].metricType).toBe(MetricType.Text);
    expect(statements[0].metrics[1].value).toEqual({ text: "take it easy", level: undefined });
  });

  it('should parse Simple & Sinister session 1 correctly', () => {
    const code = `5:00 100 KB Swings ?kg\n  - (10)\n    10 KB Swings ?kg\n\n10:00 10 Turkish Getups ?kg\n  - 5 Turkish Getups Left ?kg\n  - 5 Turkish Getups Right ?kg\n`;
    const statements = parse(code);
    
    expect(statements.length).toBe(6);
    
    // Check first block
    expect(statements[0].metrics[0].metricType).toBe(MetricType.Duration);
    expect(statements[0].metrics[1].value).toBe(100);
    expect(statements[0].metrics[2].value).toBe("KB Swings");
    expect(statements[0].metrics[3].metricType).toBe(MetricType.Resistance);
    
    // Check nesting of (10)
    expect(statements[1].parent).toBe(statements[0].id);
    expect(statements[1].metrics[0].metricType).toBe(MetricType.Group);
    expect(statements[1].metrics[1].metricType).toBe(MetricType.Rounds);
    
    // Check nesting of 10 KB Swings ?kg
    expect(statements[2].parent).toBe(statements[1].id);
  });

  it('should populate metricMeta with source locations', () => {
    const code = `21 95lb Thrusters\n`;
    const statements = parse(code);
    
    expect(statements.length).toBe(1);
    const s = statements[0];
    expect(s.metrics.length).toBe(3);
    
    expect(s.metricMeta).toBeDefined();
    expect(s.metricMeta.size).toBe(3);
    
    const repFrag = s.metrics[0];
    const weightFrag = s.metrics[1];
    const effortFrag = s.metrics[2];
    
    const repMeta = s.metricMeta.get(repFrag);
    expect(repMeta).toBeDefined();
    expect(repMeta?.raw).toBe("21");
    expect(repMeta?.startOffset).toBe(0);
    expect(repMeta?.endOffset).toBe(2);
    
    const weightMeta = s.metricMeta.get(weightFrag);
    expect(weightMeta).toBeDefined();
    expect(weightMeta?.raw).toBe("95lb");
    expect(weightMeta?.startOffset).toBe(3);
    
    const effortMeta = s.metricMeta.get(effortFrag);
    expect(effortMeta).toBeDefined();
    expect(effortMeta?.raw).toBe("Thrusters");
  });

  it('should parse "*" inject-rest modifier', () => {
    const code = `*:45 Rest\n`;
    const statements = parse(code);
    
    expect(statements.length).toBe(1);
    expect(statements[0].metrics[0].metricType).toBe(MetricType.Duration);
    expect(statements[0].metrics[0].image).toBe(":45");
    expect(statements[0].hints?.has('behavior.inject_rest')).toBe(true);
  });
});
