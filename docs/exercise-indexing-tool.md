# Exercise Indexing Tool

This tool indexes all exercise JSON files in the `public/exercises/` directory and creates a structured index useful for building typeahead search functionality and exercise card displays.

## Features

- **Automatic Grouping**: Groups exercise variations by their root exercise name
- **Typeahead Cards**: Creates simplified card objects with search terms for UI components
- **Multiple Indexes**: Provides indexes by muscle, equipment, category, and level
- **Search Functionality**: Built-in search and filtering capabilities
- **Performance Optimized**: Efficient data structures for fast lookups

## Quick Start

### Generate Exercise Index

```bash
# Generate index with default paths
npm run generate-exercise-index

# Or run directly
node dist/generateExerciseIndex.js public/exercises exercise-index.json
```

This will create an `exercise-index.json` file containing the complete indexed exercise data.

### Basic Usage

```typescript
import { ExerciseIndexer, ExerciseCard } from './src/tools/ExerciseIndexer';

// Load the generated index
const index = require('./exercise-index.json');

// Search for exercises
const searchResults = index.cards.filter(card =>
  card.searchTerms.some(term => term.includes('barbell'))
);

// Filter by muscle
const chestExercises = index.groupsByMuscle.chest || [];

// Filter by equipment
const barbellExercises = index.groupsByEquipment.barbell || [];
```

## API Reference

### ExerciseCard

The primary interface for typeahead display:

```typescript
interface ExerciseCard {
  id: string;                    // Unique identifier (e.g., "barbell-squat")
  name: string;                  // Root exercise name
  primaryMuscles: Muscle[];      // Target muscles
  equipment?: Equipment;         // Required equipment
  level: Level;                  // Difficulty level
  category: Category;            // Exercise category
  force?: Force;                 // Force type (push/pull/static)
  mechanic?: Mechanic;           // Compound or isolation
  variationCount: number;        // Number of variations
  hasImages: boolean;            // Whether images are available
  searchTerms: string[];         // Search keywords
}
```

### ExerciseGroup

Complete information about an exercise and its variations:

```typescript
interface ExerciseGroup {
  rootExercise: string;          // Root exercise name
  baseExercise: Exercise;        // Primary exercise data
  variations: Exercise[];        // All exercise variations
  card: ExerciseCard;            // Card representation
  categories: Category[];        // All categories in group
  equipment: Equipment[];        // All equipment used in group
  levels: Level[];               // All difficulty levels
  primaryMuscles: Muscle[];      // Primary muscles targeted
  allMuscles: Muscle[];          // All muscles worked
}
```

### ExerciseIndex

The complete index structure:

```typescript
interface ExerciseIndex {
  groups: ExerciseGroup[];                          // All exercise groups
  cards: ExerciseCard[];                            // All cards for typeahead
  groupsByName: Record<string, ExerciseGroup>;      // Quick lookup by name
  groupsByMuscle: Record<Muscle, ExerciseGroup[]>;  // Index by muscle
  groupsByEquipment: Record<Equipment, ExerciseGroup[]>; // Index by equipment
  groupsByCategory: Record<Category, ExerciseGroup[]>;   // Index by category
  groupsByLevel: Record<Level, ExerciseGroup[]>;         // Index by level
}
```

## Usage Examples

### 1. Typeahead Search Component

```typescript
import { ExerciseIndexer } from './src/tools/ExerciseIndexer';

class ExerciseTypeahead {
  private index: ExerciseIndex;
  private indexer: ExerciseIndexer;

  constructor(index: ExerciseIndex) {
    this.index = index;
    this.indexer = new ExerciseIndexer();
  }

  search(query: string, limit: number = 10): ExerciseCard[] {
    const results = this.indexer.searchExerciseCards(query, this.index.cards);
    return results.slice(0, limit);
  }

  searchWithFilters(
    query: string,
    filters: {
      muscles?: Muscle[];
      equipment?: Equipment[];
      levels?: Level[];
    }
  ): ExerciseCard[] {
    return this.indexer.filterExercises(this.index.cards, {
      search: query,
      ...filters
    });
  }
}
```

### 2. Exercise Detail Component

```typescript
function ExerciseDetail({ exerciseId }: { exerciseId: string }) {
  const group = index.groupsByName[exerciseId.toLowerCase()];

  if (!group) return <div>Exercise not found</div>;

  return (
    <div>
      <h1>{group.rootExercise}</h1>

      {/* Primary exercise */}
      <ExerciseCard exercise={group.baseExercise} />

      {/* Variations */}
      {group.variations.length > 1 && (
        <div>
          <h3>Variations ({group.variations.length})</h3>
          {group.variations.map(variation => (
            <ExerciseCard key={variation.name} exercise={variation} />
          ))}
        </div>
      )}

      {/* Muscles worked */}
      <MuscleMap muscles={group.allMuscles} />
    </div>
  );
}
```

### 3. Exercise Browser

```typescript
function ExerciseBrowser() {
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  let exercises = index.cards;

  if (selectedMuscle) {
    exercises = index.groupsByMuscle[selectedMuscle]?.flatMap(g => g.card) || [];
  }

  if (selectedEquipment) {
    exercises = exercises.filter(card => card.equipment === selectedEquipment);
  }

  return (
    <div>
      <Filters>
        <MuscleFilter
          muscles={Object.keys(index.groupsByMuscle)}
          selected={selectedMuscle}
          onChange={setSelectedMuscle}
        />
        <EquipmentFilter
          equipment={Object.keys(index.groupsByEquipment)}
          selected={selectedEquipment}
          onChange={setSelectedEquipment}
        />
      </Filters>

      <ExerciseGrid exercises={exercises} />
    </div>
  );
}
```

## Configuration Options

The indexer supports various configuration options:

```typescript
interface IndexingOptions {
  includeAliases?: boolean;        // Include exercise aliases in search
  maxVariationsToShow?: number;    // Limit variations displayed
  minSearchTermLength?: number;    // Minimum length for search terms
}
```

Example with custom options:

```typescript
const indexer = new ExerciseIndexer({
  includeAliases: true,
  minSearchTermLength: 3
});
```

## Performance

The index is optimized for performance:

- **Memory Efficient**: Shared references and minimal duplication
- **Fast Lookups**: O(1) lookup by name, O(log n) for most indexes
- **Search Performance**: Optimized search terms and indexing
- **Load Time**: Pre-built index loads in milliseconds

## Statistics

Current exercise database statistics (as of last generation):

- **Total Exercises**: 873 individual exercises
- **Exercise Groups**: 743 unique root exercises
- **Groups with Variations**: 62
- **Top Muscles**: Quadriceps (133), Shoulders (109), Abdominals (88)
- **Top Equipment**: Barbell (141), Other (117), Dumbbell (106)

## Regenerating the Index

To regenerate the index when exercises are added or modified:

```bash
# Using npm script (if configured)
npm run generate-exercise-index

# Or run directly
node dist/generateExerciseIndex.js [exercises-path] [output-path]
```

The tool will scan all exercise directories, load the JSON files, and generate a new index file.

## File Structure

The generated index file contains:

- `groups`: Array of all exercise groups with variations
- `cards`: Simplified card objects for typeahead display
- `groupsByName`: Quick lookup by exercise name
- `groupsByMuscle`, `groupsByEquipment`, etc.: Pre-built indexes for filtering

This structure allows for efficient searching, filtering, and display of exercise data in UI components.