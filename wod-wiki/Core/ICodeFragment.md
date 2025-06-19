Base interface for all code fragments parsed from workout scripts. Fragments represent the smallest meaningful units (e.g., time, reps, effort, distance) and are used to build up statements and metrics in the parsing and runtime pipeline.

## Original Location
`src/CodeFragment.ts`

## Properties
- `image?: string` - Raw text representation of the fragment.
- `value?: any` - The primary value of the fragment.
- `type: string` — Legacy string identifier for the fragment type
- `fragmentType: FragmentType` — Enum value for the fragment type (preferred)
- `meta?: CodeMetadata` — Optional metadata (source position, etc.)

## FragmentType Enum
- `Timer`, `Rep`, `Effort`, `Distance`, `Rounds`, `Action`, `Increment`, `Lap`, `Text`, `Resistance`

## Usage
All fragment classes (e.g., `TimerFragment`, `RepFragment`) implement this interface.

## Relationships
- Implemented by: `TimerFragment`, `RepFragment`, `EffortFragment`, `DistanceFragment`, `RoundsFragment`, `ActionFragment`, `IncrementFragment`, `LapFragment`, `TextFragment`, `ResistanceFragment`
- Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md)
- Consumed by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

## Implementations

### ActionFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\ActionFragment.md -->
**Description**: Represents an action fragment (e.g., `[rest]`, `[transition]`) parsed from a workout script. Used to specify special actions or transitions in statements.

**Original Location**: `src/fragments/ActionFragment.ts`

#### Properties
- `value: string` — The action keyword or label.
- `image: string` — The action keyword or label.
- `type: string = "action"`
- `fragmentType: FragmentType.Action`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for action-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### DistanceFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\DistanceFragment.md -->
**Description**: Represents a distance fragment (e.g., `400m`, `1 mile`) parsed from a workout script. Used to specify distance-based elements in statements.

**Original Location**: `src/fragments/DistanceFragment.ts`

#### Properties
- `value: { amount: string, units: string }` — Object containing the distance value and units.
- `image: string` — Combined representation (e.g., "100 m").
- `type: string = "distance"`
- `fragmentType: FragmentType.Distance`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for distance-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### EffortFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\EffortFragment.md -->
**Description**: Represents an effort/exercise fragment (e.g., `pushups`, `row`) parsed from a workout script. Used to specify the type of exercise or movement.

**Original Location**: `src/fragments/EffortFragment.ts`

#### Properties
- `value: string` — Name of the exercise or effort.
- `image: string` — Name of the exercise or effort.
- `type: string = "effort"`
- `fragmentType: FragmentType.Effort`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for effort-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### IncrementFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\IncrementFragment.md -->
**Description**: Represents an increment/decrement fragment (e.g., `^`, `-`) parsed from a workout script. Used to specify increment or decrement actions in statements.

**Original Location**: `src/fragments/IncrementFragment.ts`

#### Properties
- `value: number` — The increment value (`1` for `^`, `-1` for `-`).
- `image: string` — The increment symbol (e.g., `^`).
- `type: string = "increment"`
- `fragmentType: FragmentType.Increment`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for increment/decrement actions.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### LapFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\LapFragment.md -->
**Description**: Represents a lap fragment parsed from a workout script. Used to specify lap-based elements in statements (e.g., for interval or lap counting workouts).

**Original Location**: `src/fragments/LapFragment.ts`

#### Properties
- `value: GroupType` — Grouping information.
- `image: string` — Raw text representation.
- `type: string = "lap"`
- `fragmentType: FragmentType.Lap`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for lap-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### RepFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\RepFragment.md -->
**Description**: Represents a repetition count fragment (e.g., `10 reps`) parsed from a workout script. Used to specify how many times an action should be performed.

**Original Location**: `src/fragments/RepFragment.ts`

#### Properties
- `value?: number` — Number of repetitions.
- `type: string = "rep"`
- `fragmentType: FragmentType.Rep`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for repetition-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### ResistanceFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\ResistanceFragment.md -->
**Description**: Represents a resistance/weight fragment (e.g., `50kg`, `135lb`) parsed from a workout script. Used to specify resistance or weight in statements.

**Original Location**: `src/fragments/ResistanceFragment.ts`

#### Properties
- `value: { amount: string, units: string }` — Object containing the resistance value and units.
- `image: string` — Combined representation (e.g., "45 lb").
- `type: string = "resistance"`
- `fragmentType: FragmentType.Resistance`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for resistance-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### RoundsFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\RoundsFragment.md -->
**Description**: Represents a rounds fragment (e.g., `(3)`) parsed from a workout script. Used to specify how many rounds a group of statements should be repeated.

**Original Location**: `src/fragments/RoundsFragment.ts`

#### Properties
- `value: number` — Number of rounds.
- `image: string` — String representation of the count.
- `type: string = "rounds"`
- `fragmentType: FragmentType.Rounds`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for round-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### TextFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\TextFragment.md -->
**Description**: Represents a text fragment (e.g., comments, labels) parsed from a workout script. Used for non-executable, descriptive, or label content in statements.

**Original Location**: `src/fragments/TextFragment.ts`

#### Properties
- `value: { text: string, level?: string }` — Object containing the text content and optional level.
- `image: string` — The text content.
- `type: string = "text"`
- `fragmentType: FragmentType.Text`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for descriptive or label content.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)

### TimerFragment

<!-- filepath: x:\\wod-wiki\\docs\\Interfaces\\Source\\Fragments\\TimerFragment.md -->
**Description**: Represents a time/duration fragment parsed from a workout script (e.g., `30s`, `1:00`, `2m`). Used to specify time-based elements in statements.

**Original Location**: `src/fragments/TimerFragment.ts`

#### Properties
- `value: number` — Total duration in milliseconds.
- `image: string` — The raw time string (e.g., "1:30:00").
- `type: string = "duration"` — Legacy type
- `fragmentType: FragmentType.Timer`
- `meta?: CodeMetadata`

#### Usage
Used in: [JitStatement](./Compiler/JitStatement.md), [ICodeStatement](./ICodeStatement.md) for time-based statements.

#### Relationships
- Implements: [ICodeFragment](./ICodeFragment.md)
- Used by: [FragmentCompilationManager](./Compiler/FragmentCompilationManager.md), [IFragmentCompiler](./Compiler/IFragmentCompiler.md)
