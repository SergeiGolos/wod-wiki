
Base interface for all code fragments parsed from workout scripts. Fragments represent the smallest meaningful units (e.g., time, reps, effort, distance) and are used to build up statements and metrics in the parsing and runtime pipeline.

## Original Location
`src/core/CodeFragment.ts`

## Properties
- `type: string` — Legacy string identifier for the fragment type
- `fragmentType: FragmentType` — Enum value for the fragment type (preferred)
- `meta?: CodeMetadata` — Optional metadata (source position, etc.)

## FragmentType Enum
- `Timer`, `Rep`, `Effort`, `Distance`, `Rounds`, `Action`, `Increment`, `Lap`, `Text`, `Resistance`

## Usage
All fragment classes (e.g., `TimerFragment`, `RepFragment`) implement this interface.

## Relationships
- Implemented by: [[TimerFragment]], [[RepFragment]], [[EffortFragment]], [[DistanceFragment]], [[RoundsFragment]], [[ActionFragment]], [[IncrementFragment]], [[LapFragment]], [[TextFragment]], [[ResistanceFragment]]
- Used in: [[JitStatement]], [[ICodeStatement]]
- Consumed by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

## Implementations

### ActionFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\ActionFragment.md -->
**Description**: Represents an action fragment (e.g., `[rest]`, `[transition]`) parsed from a workout script. Used to specify special actions or transitions in statements.

**Original Location**: `src/core/fragments/ActionFragment.ts`

#### Properties
- `action: string` — The action keyword or label
- `type: string = "action"`
- `fragmentType: FragmentType.Action`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for action-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### DistanceFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\DistanceFragment.md -->
**Description**: Represents a distance fragment (e.g., `400m`, `1 mile`) parsed from a workout script. Used to specify distance-based elements in statements.

**Original Location**: `src/core/fragments/DistanceFragment.ts`

#### Properties
- `value: string` — Distance value (e.g., `400`)
- `units: string` — Distance units (e.g., `m`, `mile`)
- `type: string = "distance"`
- `fragmentType: FragmentType.Distance`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for distance-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### EffortFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\EffortFragment.md -->
**Description**: Represents an effort/exercise fragment (e.g., `pushups`, `row`) parsed from a workout script. Used to specify the type of exercise or movement.

**Original Location**: `src/core/fragments/EffortFragment.ts`

#### Properties
- `effort: string` — Name of the exercise or effort
- `type: string = "effort"`
- `fragmentType: FragmentType.Effort`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for effort-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### IncrementFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\IncrementFragment.md -->
**Description**: Represents an increment/decrement fragment (e.g., `^`, `-`) parsed from a workout script. Used to specify increment or decrement actions in statements.

**Original Location**: `src/core/fragments/IncrementFragment.ts`

#### Properties
- `image: string` — The increment symbol (e.g., `^`)
- `increment: number` — The increment value (`1` for `^`, `-1` for `-`)
- `type: string = "increment"`
- `fragmentType: FragmentType.Increment`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for increment/decrement actions.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### LapFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\LapFragment.md -->
**Description**: Represents a lap fragment parsed from a workout script. Used to specify lap-based elements in statements (e.g., for interval or lap counting workouts).

**Original Location**: `src/core/fragments/LapFragment.ts`

#### Properties
- `type: string = "lap"`
- `fragmentType: FragmentType.Lap`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for lap-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### RepFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\RepFragment.md -->
**Description**: Represents a repetition count fragment (e.g., `10 reps`) parsed from a workout script. Used to specify how many times an action should be performed.

**Original Location**: `src/core/fragments/RepFragment.ts`

#### Properties
- `reps?: number` — Number of repetitions
- `type: string = "rep"`
- `fragmentType: FragmentType.Rep`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for repetition-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### ResistanceFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\ResistanceFragment.md -->
**Description**: Represents a resistance/weight fragment (e.g., `50kg`, `135lb`) parsed from a workout script. Used to specify resistance or weight in statements.

**Original Location**: `src/core/fragments/ResistanceFragment.ts`

#### Properties
- `value: string` — Resistance value (e.g., `50`)
- `units: string` — Resistance units (e.g., `kg`, `lb`)
- `type: string = "resistance"`
- `fragmentType: FragmentType.Resistance`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for resistance-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### RoundsFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\RoundsFragment.md -->
**Description**: Represents a rounds fragment (e.g., `(3)`) parsed from a workout script. Used to specify how many rounds a group of statements should be repeated.

**Original Location**: `src/core/fragments/RoundsFragment.ts`

#### Properties
- `count: number` — Number of rounds
- `type: string = "rounds"`
- `fragmentType: FragmentType.Rounds`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for round-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### TextFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\TextFragment.md -->
**Description**: Represents a text fragment (e.g., comments, labels) parsed from a workout script. Used for non-executable, descriptive, or label content in statements.

**Original Location**: `src/core/fragments/TextFragment.ts`

#### Properties
- `text: string` — The text content
- `level?: string` — Optional text level (e.g., heading)
- `type: string = "text"`
- `fragmentType: FragmentType.Text`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for descriptive or label content.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]

### TimerFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\TimerFragment.md -->
**Description**: Represents a time/duration fragment parsed from a workout script (e.g., `30s`, `1:00`, `2m`). Used to specify time-based elements in statements.

**Original Location**: `src/core/fragments/TimerFragment.ts`

#### Properties
- `days: number` — Days component
- `hours: number` — Hours component
- `minutes: number` — Minutes component
- `seconds: number` — Seconds component
- `original: number` — Total duration in milliseconds
- `type: string = "duration"` — Legacy type
- `fragmentType: FragmentType.Timer`
- `meta?: CodeMetadata`

#### Usage
Used in: [[JitStatement]], [[ICodeStatement]] for time-based statements.

#### Relationships
- Implements: [[ICodeFragment]]
- Used by: [[FragmentCompilationManager]], [[Compiler/IFragmentCompiler]]
