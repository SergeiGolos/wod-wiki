# Exercise Name-Based Indexing Tool

This tool groups exercises based on their names, identifying root exercises and their variations. It analyzes exercise names to find relationships where one exercise name is a subset of another, creating meaningful groupings for typeahead search and exercise organization.

## Key Features

- **Name-Based Grouping**: Groups exercises where names share common words and one is a subset of another
- **Root Exercise Identification**: Automatically identifies the most fundamental exercise name in each group
- **Smart Variations**: Handles equipment prefixes, positional modifiers, and grip variations
- **Typeahead Optimization**: Creates simplified cards perfect for autocomplete functionality
- **Search-Friendly**: Generates comprehensive search terms from exercise names, equipment, and muscles

## How It Works

The algorithm analyzes exercise names by:

1. **Tokenization**: Breaks exercise names into individual words
2. **Subset Detection**: Identifies when one exercise name contains all words of another
3. **Similarity Scoring**: Uses Jaccard similarity to avoid false positives
4. **Root Name Selection**: Chooses the most fundamental name as the group root
5. **Group Formation**: Combines related exercises into meaningful groups

### Example Groupings

**Barbell Squat Group (6 variations):**
- Barbell Squat (root)
- Barbell Full Squat
- Barbell Side Split Squat
- Front Barbell Squat
- One Leg Barbell Squat
- Wide Stance Barbell Squat

**Bench Press Group (3 variations):**
- Bench Press (root)
- Incline Bench Press
- Cable Chest Press

## Quick Start

### Generate Exercise Name Index

```bash
# Generate name-based index
npm run generate-exercise-name-index

# Or run directly
node dist/buildExerciseNameIndex.js public/exercises exercise-name-index.json
```

## API Reference

### ExerciseNameCard

The primary interface for typeahead display:

```typescript
interface ExerciseNameCard {
  id: string;                    // Unique identifier (e.g., "barbell-squat")
  name: string;                  // Root exercise name
  variations: string[];          // All exercise names in the group
  totalVariations: number;       // Number of variations
  primaryMuscles: string[];      // Target muscles
  equipment?: string;            // Required equipment
  level: string;                 // Difficulty level
  category: string;              // Exercise category
  force?: string;                // Force type (push/pull/static)
  mechanic?: string;             // Compound or isolation
  searchTerms: string[];         // Search keywords
}
```

### ExerciseNameGroup

Complete information about an exercise group:

```typescript
interface ExerciseNameGroup {
  rootName: string;              // Root exercise name
  exercises: Exercise[];         // All exercises in the group
  card: ExerciseNameCard;        // Card representation
}
```

### ExerciseNameIndex

The complete index structure:

```typescript
interface ExerciseNameIndex {
  groups: ExerciseNameGroup[];                   // All exercise groups
  cards: ExerciseNameCard[];                     // All cards for typeahead
  groupsByName: Record<string, ExerciseNameGroup>; // Quick lookup by name
  allExerciseNames: string[];                    // All exercise names
}
```

## Usage Examples

### 1. Typeahead Search Component

```typescript
import { ExerciseNameIndexer } from './src/tools/ExerciseNameIndexer';

class ExerciseTypeahead {
  private index: ExerciseNameIndex;
  private indexer: ExerciseNameIndexer;

  constructor(index: ExerciseNameIndex) {
    this.index = index;
    this.indexer = new ExerciseNameIndexer();
  }

  search(query: string, limit: number = 10): ExerciseNameCard[] {
    const results = this.indexer.searchByName(query, this.index.cards);
    return results.slice(0, limit);
  }

  // Search for exercises with variations
  searchWithVariations(query: string): ExerciseNameCard[] {
    const results = this.indexer.searchByName(query, this.index.cards);
    return results.filter(card => card.totalVariations > 1);
  }
}
```

### 2. Exercise Browser with Grouping

```typescript
function ExerciseBrowser() {
  const [selectedGroup, setSelectedGroup] = useState<ExerciseNameGroup | null>(null);
  const index = require('./exercise-name-index.json');

  // Groups with multiple variations
  const variationGroups = index.groups.filter(g => g.exercises.length > 1);

  return (
    <div>
      {/* List groups with variations */}
      <div>
        <h2>Exercise Groups with Variations</h2>
        {variationGroups.map(group => (
          <div key={group.card.id}>
            <h3>{group.rootName} ({group.card.totalVariations} variations)</h3>
            <p>Muscles: {group.card.primaryMuscles.join(', ')}</p>
            {group.card.equipment && <p>Equipment: {group.card.equipment}</p>}

            {/* Show all variations */}
            <div>
              {group.card.variations.map(variation => (
                <div key={variation}>{variation}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Individual exercise search */}
      <div>
        <h2>All Exercises</h2>
        {/* Search and display functionality */}
      </div>
    </div>
  );
}
```

### 3. Advanced Search and Filtering

```typescript
function AdvancedExerciseSearch() {
  const index = require('./exercise-name-index.json');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVariationsOnly, setShowVariationsOnly] = useState(false);

  const filterExercises = () => {
    let filtered = index.cards;

    // Search by name
    if (searchQuery) {
      const indexer = new ExerciseNameIndexer();
      filtered = indexer.searchByName(searchQuery, filtered);
    }

    // Show only exercises with variations
    if (showVariationsOnly) {
      filtered = filtered.filter(card => card.totalVariations > 1);
    }

    return filtered;
  };

  const results = filterExercises();

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search exercises..."
      />

      <label>
        <input
          type="checkbox"
          checked={showVariationsOnly}
          onChange={(e) => setShowVariationsOnly(e.target.checked)}
        />
        Show only exercises with variations
      </label>

      <div>
        {results.map(card => (
          <ExerciseCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
```

## Index Statistics

Current exercise database statistics (as of last generation):

- **Total Exercises**: 873 individual exercises
- **Unique Groups**: 707 unique root exercises
- **Groups with Variations**: 93 groups have multiple variations
- **Largest Group**: 9 exercises (likely "Squat" or similar)
- **Average Group Size**: 1.23 exercises per group

### Top Groups by Variation Count

The algorithm successfully identifies these major exercise families:

- **Barbell Squat** (6 variations)
- **Box Squat** (5 variations)
- **Cable Crunch** (3 variations)
- **Cable Shoulder Press** (3 variations)
- **Cable Crossover** (3 variations)

## Configuration Options

The indexer supports various configuration options:

```typescript
interface NameIndexingOptions {
  minRootNameLength?: number;        // Minimum length for root names (default: 2)
  includeExactMatches?: boolean;     // Include exact name matches
  sortVariationsBy?: 'name' | 'level' | 'equipment'; // Sort order for variations
}
```

Example with custom options:

```typescript
const indexer = new ExerciseNameIndexer({
  minRootNameLength: 3,
  sortVariationsBy: 'level'
});
```

## Performance

The name-based indexing is optimized for:

- **Fast Grouping**: Efficient subset detection and similarity scoring
- **Memory Efficient**: Shared exercise data across groups and cards
- **Search Performance**: Pre-built search terms for quick lookups
- **Load Time**: Index loads in milliseconds from JSON file

## Comparison with Original Exercise Index

| Feature | Original Index | Name-Based Index |
|---------|----------------|------------------|
| Grouping Method | Manual patterns | Name subset analysis |
| Groups | 743 | 707 |
| Groups with Variations | 62 | 93 |
| Focus | Exercise properties | Name relationships |
| Best For | Equipment/muscle filtering | Exercise typeahead |

## Regenerating the Index

To regenerate the name-based index when exercises are added or modified:

```bash
# Using npm script
npm run generate-exercise-name-index

# Or run directly
node dist/buildExerciseNameIndex.js [exercises-path] [output-path]
```

The tool will:
1. Scan all exercise directories
2. Load and analyze exercise names
3. Group exercises by name relationships
4. Generate search terms and cards
5. Save the index to a JSON file

## File Structure

The generated index contains:

- `groups`: Array of all exercise groups with variations
- `cards`: Simplified card objects for typeahead display
- `groupsByName`: Quick lookup by exercise name
- `allExerciseNames`: Complete list of all exercise names

This structure provides efficient searching, grouping, and display of exercise data focused on name-based relationships.