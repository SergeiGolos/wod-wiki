# WodScript Language Documentation

Complete documentation for the WOD Wiki domain-specific language for defining workout routines.

## Documentation Structure

### Core Language References

📖 **[Language Guide](./Guide.md)** - Comprehensive syntax documentation  
Complete reference covering all tokens, grammar rules, fragment types, and syntax patterns with detailed examples and cross-references to source code.

🚀 **[Quick Reference](./QuickReference.md)** - Syntax cheat sheet  
Fast lookup for common patterns, syntax rules, and fragment types. Perfect for developers actively writing WodScript.

🔗 **[Fragments and Metrics](./FragmentsAndMetrics.md)** - Fragment-to-metric mapping  
Detailed explanation of how parsed fragments convert to runtime metrics, including composition rules and inheritance patterns.

### Integration Documentation

🏗️ **[System Overview](../Overview.md)** - High-level architecture  
How the language fits into the overall WOD Wiki system including parsing, runtime, UI, and metrics collection.

⚙️ **[Runtime Documentation](../runtime/Runtime.md)** - Execution model  
How parsed WodScript programs execute, including deterministic timing and event handling.

📊 **[Metrics System](../metrics/Metrics.md)** - Metric collection and inheritance  
Details on metric types, composition strategies, and parent-child inheritance patterns.

🎨 **[UI Integration](../ui/Display.md)** - Editor and display components  
How WodScript integrates with Monaco Editor and UI components for authoring and visualization.

## Getting Started

### For Language Users
1. Start with the **[Quick Reference](./QuickReference.md)** for basic syntax
2. See **[real workout examples](../../stories/workouts/)** for inspiration
3. Use the **[Language Guide](./Guide.md)** for detailed syntax rules

### For Developers  
1. Read the **[System Overview](../Overview.md)** for architecture context
2. Study the **[Language Guide](./Guide.md)** for complete implementation details
3. Review **[Fragments and Metrics](./FragmentsAndMetrics.md)** for data flow understanding
4. Examine **[source code examples](../../src/parser/)** and **[tests](../../src/runtime/FragmentCompilationManager.test.ts)**

### For Contributors
1. Understand the complete **[Language Guide](./Guide.md)**
2. Run **[parser tests](../../src/WodScript.test.ts)** to see expected behavior
3. Explore **[Storybook examples](../../stories/parsing/)** for comprehensive usage patterns
4. Review **[compilation tests](../../src/runtime/FragmentCompilationManager.test.ts)** for fragment-to-metric conversion

## Quick Syntax Examples

### Basic Exercise
```
5 Deadlifts 225lb
```
→ RepFragment(5) + EffortFragment("Deadlifts") + ResistanceFragment("225", "lb")

### Round Structure  
```
(21-15-9)
  Thrusters 95lb
  Pullups
```
→ RoundsFragment(3) + RepFragments(21,15,9) + Child statements with inheritance

### Time-based Workout
```
20:00 AMRAP
  5 Pullups
  10 Pushups
```
→ TimerFragment("20:00") + EffortFragment("AMRAP") + Child exercises inherit time constraint

## Language Features

### Core Elements
- **Tokens**: Numbers, timers, identifiers, weight/distance units, symbols
- **Fragments**: Typed data structures for reps, effort, resistance, distance, timing
- **Grammar**: Structured parsing rules for workout components
- **Metrics**: Automatic conversion from fragments to measurable values
- **Inheritance**: Parent-child metric composition and inheritance

### Advanced Features
- **Complex rep schemes**: `(21-15-9)`, `(10-9-8-7-6-5-4-3-2-1)`
- **Time patterns**: AMRAP, EMOM, Tabata, intervals
- **Lap indicators**: `+` and `-` for workout flow control
- **Action notation**: `[Rest]`, `[:Transition]` for special behaviors
- **Unit support**: Multiple weight (lb, kg, bw) and distance (m, ft, km, mile) units

## Source Code Organization

### Parser Implementation
- **[timer.tokens.ts](../../src/parser/timer.tokens.ts)** - Lexical token definitions
- **[timer.parser.ts](../../src/parser/timer.parser.ts)** - Grammar rules and parsing logic
- **[timer.visitor.ts](../../src/parser/timer.visitor.ts)** - AST traversal and fragment creation
- **[md-timer.ts](../../src/parser/md-timer.ts)** - Runtime integration

### Fragment Types
- **[fragments/](../../src/fragments/)** - Fragment type definitions (RepFragment, TimerFragment, etc.)
- **[FragmentCompilationManager.ts](../../src/runtime/FragmentCompilationManager.ts)** - Fragment-to-metric compilation

### Testing and Examples
- **[WodScript.test.ts](../../src/WodScript.test.ts)** - Basic parsing tests
- **[FragmentCompilationManager.test.ts](../../src/runtime/FragmentCompilationManager.test.ts)** - Fragment compilation tests
- **[stories/parsing/](../../stories/parsing/)** - Comprehensive example workouts
- **[stories/workouts/](../../stories/workouts/)** - Real-world workout definitions

## Contributing to Language Documentation

When updating language features:

1. **Update core documentation**: Modify the [Language Guide](./Guide.md) for new syntax
2. **Update quick reference**: Add patterns to [Quick Reference](./QuickReference.md)
3. **Document metrics impact**: Update [Fragments and Metrics](./FragmentsAndMetrics.md) if metrics change
4. **Add examples**: Include real examples in [story files](../../stories/parsing/)
5. **Write tests**: Add test cases to verify new functionality
6. **Check links**: Run `npm run docs:check` to verify all references work

## See Also

- **[System Overview](../Overview.md)** - Complete system architecture
- **[Interface Documentation](../interfaces/)** - Core interface definitions
- **[Runtime Documentation](../runtime/)** - Execution engine details
- **[UI Documentation](../ui/)** - Editor and display integration
- **[Storybook](../../stories/)** - Interactive examples and component documentation