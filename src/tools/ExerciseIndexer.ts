import { Exercise, Muscle, Equipment, Category, Level, Force, Mechanic } from '../exercise';
import { Measure, Fields } from '../measure';

export interface ExerciseCard {
  id: string;
  name: string;
  primaryMuscles: Muscle[];
  equipment?: Equipment;
  level: Level;
  category: Category;
  force?: Force;
  mechanic?: Mechanic;
  variationCount: number;
  hasImages: boolean;
  searchTerms: string[];
}

export interface ExerciseGroup {
  rootExercise: string;
  baseExercise: Exercise;
  variations: Exercise[];
  card: ExerciseCard;
  categories: Category[];
  equipment: Equipment[];
  levels: Level[];
  primaryMuscles: Muscle[];
  allMuscles: Muscle[];
}

export interface ExerciseIndex {
  groups: ExerciseGroup[];
  cards: ExerciseCard[];
  groupsByName: Record<string, ExerciseGroup>;
  groupsByMuscle: Record<Muscle, ExerciseGroup[]>;
  groupsByEquipment: Record<Equipment, ExerciseGroup[]>;
  groupsByCategory: Record<Category, ExerciseGroup[]>;
  groupsByLevel: Record<Level, ExerciseGroup[]>;
}

export interface IndexingOptions {
  includeAliases?: boolean;
  maxVariationsToShow?: number;
  minSearchTermLength?: number;
}

export class ExerciseIndexer {
  private exercises: Map<string, Exercise> = new Map();
  private groups: Map<string, Exercise[]> = new Map();

  constructor(private options: IndexingOptions = {}) {}

  /**
   * Add an exercise to the indexer
   */
  addExercise(id: string, exercise: Exercise): void {
    this.exercises.set(id, exercise);
    const rootName = this.extractRootExerciseName(exercise.name);

    if (!this.groups.has(rootName)) {
      this.groups.set(rootName, []);
    }
    this.groups.get(rootName)!.push(exercise);
  }

  /**
   * Extract the root exercise name from variations
   * Examples: "Barbell Ab Rollout - On Knees" -> "Barbell Ab Rollout"
   *          "Dumbbell Bicep Curl" -> "Dumbbell Bicep Curl"
   */
  private extractRootExerciseName(name: string): string {
    // Remove common variation patterns
    const patterns = [
      /\s*[-–—]\s*.*$/, // Everything after dash
      /\s*\(([^)]+)\)$/, // Everything in parentheses
      /\s+(with|on|from|to|for|and|or)\s+.*$/i, // Prepositional phrases
    ];

    let rootName = name;
    for (const pattern of patterns) {
      const match = rootName.match(pattern);
      if (match) {
        rootName = rootName.replace(pattern, '').trim();
      }
    }

    return rootName;
  }

  /**
   * Generate search terms for an exercise
   */
  private generateSearchTerms(exercise: Exercise): string[] {
    const terms: string[] = [];

    // Add name variations
    terms.push(exercise.name.toLowerCase());

    // Add root exercise name
    const rootName = this.extractRootExerciseName(exercise.name);
    terms.push(rootName.toLowerCase());

    // Add equipment terms
    if (exercise.equipment) {
      terms.push(exercise.equipment.toLowerCase().replace(/\s+/g, ' '));
    }

    // Add muscle terms
    exercise.primaryMuscles.forEach(muscle => {
      terms.push(muscle.toLowerCase().replace(/\s+/g, ' '));
    });

    exercise.secondaryMuscles.forEach(muscle => {
      terms.push(muscle.toLowerCase().replace(/\s+/g, ' '));
    });

    // Add category
    terms.push(exercise.category.toLowerCase());

    // Add level
    terms.push(exercise.level.toLowerCase());

    // Add force if available
    if (exercise.force) {
      terms.push(exercise.force.toLowerCase());
    }

    // Add mechanic if available
    if (exercise.mechanic) {
      terms.push(exercise.mechanic.toLowerCase());
    }

    // Add aliases if available
    if (this.options.includeAliases && exercise.aliases) {
      exercise.aliases.forEach(alias => {
        terms.push(alias.toLowerCase());
      });
    }

    // Filter by minimum length if specified
    const minLength = this.options.minSearchTermLength || 2;
    return terms.filter(term => term.length >= minLength);
  }

  /**
   * Create an exercise card for typeahead display
   */
  private createExerciseCard(rootName: string, exercises: Exercise[]): ExerciseCard {
    const baseExercise = exercises[0]; // Use first exercise as base
    const hasImages = true; // Assume all exercises have images based on directory structure

    const searchTerms = exercises.flatMap(exercise =>
      this.generateSearchTerms(exercise)
    );

    // Remove duplicates
    const uniqueTerms = Array.from(new Set(searchTerms));

    return {
      id: rootName.toLowerCase().replace(/\s+/g, '-'),
      name: rootName,
      primaryMuscles: baseExercise.primaryMuscles,
      equipment: baseExercise.equipment,
      level: baseExercise.level,
      category: baseExercise.category,
      force: baseExercise.force,
      mechanic: baseExercise.mechanic,
      variationCount: exercises.length,
      hasImages,
      searchTerms: uniqueTerms
    };
  }

  /**
   * Create an exercise group with all variations
   */
  private createExerciseGroup(rootName: string, exercises: Exercise[]): ExerciseGroup {
    const baseExercise = exercises[0];
    const card = this.createExerciseCard(rootName, exercises);

    // Collect all unique values
    const categories = Array.from(new Set(exercises.map(e => e.category)));
    const equipment = Array.from(new Set(exercises.map(e => e.equipment).filter(Boolean) as Equipment[]));
    const levels = Array.from(new Set(exercises.map(e => e.level)));
    const primaryMuscles = Array.from(new Set(exercises.flatMap(e => e.primaryMuscles)));
    const allMuscles = Array.from(new Set([
      ...exercises.flatMap(e => e.primaryMuscles),
      ...exercises.flatMap(e => e.secondaryMuscles)
    ]));

    return {
      rootExercise: rootName,
      baseExercise,
      variations: exercises,
      card,
      categories,
      equipment,
      levels,
      primaryMuscles,
      allMuscles
    };
  }

  /**
   * Build the complete exercise index
   */
  buildIndex(): ExerciseIndex {
    const groups: ExerciseGroup[] = [];
    const cards: ExerciseCard[] = [];
    const groupsByName: Record<string, ExerciseGroup> = {};
    const groupsByMuscle: Record<Muscle, ExerciseGroup[]> = {} as any;
    const groupsByEquipment: Record<Equipment, ExerciseGroup[]> = {} as any;
    const groupsByCategory: Record<Category, ExerciseGroup[]> = {} as any;
    const groupsByLevel: Record<Level, ExerciseGroup[]> = {} as any;

    // Create groups
    for (const [rootName, exercises] of this.groups.entries()) {
      // Sort exercises by level (beginner first) and name
      exercises.sort((a, b) => {
        const levelOrder = { beginner: 0, intermediate: 1, expert: 2 };
        const levelDiff = levelOrder[a.level] - levelOrder[b.level];
        if (levelDiff !== 0) return levelDiff;
        return a.name.localeCompare(b.name);
      });

      const group = this.createExerciseGroup(rootName, exercises);
      groups.push(group);
      cards.push(group.card);
      groupsByName[rootName.toLowerCase()] = group;

      // Index by muscle
      group.primaryMuscles.forEach(muscle => {
        if (!groupsByMuscle[muscle]) groupsByMuscle[muscle] = [];
        groupsByMuscle[muscle].push(group);
      });

      // Index by equipment
      group.equipment.forEach(equipment => {
        if (!groupsByEquipment[equipment]) groupsByEquipment[equipment] = [];
        groupsByEquipment[equipment].push(group);
      });

      // Index by category
      group.categories.forEach(category => {
        if (!groupsByCategory[category]) groupsByCategory[category] = [];
        groupsByCategory[category].push(group);
      });

      // Index by level
      group.levels.forEach(level => {
        if (!groupsByLevel[level]) groupsByLevel[level] = [];
        groupsByLevel[level].push(group);
      });
    }

    // Sort groups alphabetically
    groups.sort((a, b) => a.rootExercise.localeCompare(b.rootExercise));
    cards.sort((a, b) => a.name.localeCompare(b.name));

    return {
      groups,
      cards,
      groupsByName,
      groupsByMuscle,
      groupsByEquipment,
      groupsByCategory,
      groupsByLevel
    };
  }

  /**
   * Search exercises by query string
   */
  searchExerciseCards(query: string, cards: ExerciseCard[]): ExerciseCard[] {
    if (!query.trim()) return cards;

    const searchTerms = query.toLowerCase().split(/\s+/);

    return cards.filter(card => {
      const searchText = `${card.name} ${card.searchTerms.join(' ')}`.toLowerCase();
      return searchTerms.every(term => searchText.includes(term));
    });
  }

  /**
   * Get exercises filtered by multiple criteria
   */
  filterExercises(
    cards: ExerciseCard[],
    filters: {
      muscles?: Muscle[];
      equipment?: Equipment[];
      categories?: Category[];
      levels?: Level[];
      search?: string;
    }
  ): ExerciseCard[] {
    let filtered = cards;

    if (filters.muscles?.length) {
      filtered = filtered.filter(card =>
        filters.muscles!.some(muscle => card.primaryMuscles.includes(muscle))
      );
    }

    if (filters.equipment?.length) {
      filtered = filtered.filter(card =>
        card.equipment && filters.equipment!.includes(card.equipment)
      );
    }

    if (filters.categories?.length) {
      filtered = filtered.filter(card =>
        filters.categories!.includes(card.category)
      );
    }

    if (filters.levels?.length) {
      filtered = filtered.filter(card =>
        filters.levels!.includes(card.level)
      );
    }

    if (filters.search) {
      filtered = this.searchExerciseCards(filters.search, filtered);
    }

    return filtered;
  }
}