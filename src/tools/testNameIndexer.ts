import { ExerciseNameIndexer } from './ExerciseNameIndexer';
import { Exercise, Muscle, Equipment, Category, Level } from '../exercise';

// Sample exercises for testing
const sampleExercises: Exercise[] = [
  {
    name: "Squat",
    primaryMuscles: [Muscle.quadriceps],
    secondaryMuscles: [Muscle.glutes, Muscle.hamstrings],
    level: Level.beginner,
    category: Category.strength,
    instructions: ["Basic squat movement"]
  },
  {
    name: "Barbell Squat",
    primaryMuscles: [Muscle.quadriceps],
    secondaryMuscles: [Muscle.glutes, Muscle.hamstrings],
    level: Level.intermediate,
    equipment: Equipment.barbell,
    category: Category.strength,
    instructions: ["Squat with barbell"]
  },
  {
    name: "Barbell Front Squat",
    primaryMuscles: [Muscle.quadriceps],
    secondaryMuscles: [Muscle.glutes, Muscle.hamstrings],
    level: Level.expert,
    equipment: Equipment.barbell,
    category: Category.strength,
    instructions: ["Front squat with barbell"]
  },
  {
    name: "Dumbbell Bench Press",
    primaryMuscles: [Muscle.chest],
    secondaryMuscles: [Muscle.shoulders, Muscle.triceps],
    level: Level.intermediate,
    equipment: Equipment.dumbbell,
    category: Category.strength,
    instructions: ["Bench press with dumbbells"]
  },
  {
    name: "Bench Press",
    primaryMuscles: [Muscle.chest],
    secondaryMuscles: [Muscle.shoulders, Muscle.triceps],
    level: Level.intermediate,
    equipment: Equipment.barbell,
    category: Category.strength,
    instructions: ["Basic bench press"]
  },
  {
    name: "Incline Bench Press",
    primaryMuscles: [Muscle.chest],
    secondaryMuscles: [Muscle.shoulders, Muscle.triceps],
    level: Level.intermediate,
    category: Category.strength,
    instructions: ["Incline bench press"]
  },
  {
    name: "Deadlift",
    primaryMuscles: [Muscle.lower_back, Muscle.glutes, Muscle.hamstrings],
    secondaryMuscles: [Muscle.quadriceps],
    level: Level.intermediate,
    equipment: Equipment.barbell,
    category: Category.strength,
    instructions: ["Basic deadlift"]
  },
  {
    name: "Romanian Deadlift",
    primaryMuscles: [Muscle.hamstrings, Muscle.glutes],
    secondaryMuscles: [Muscle.lower_back],
    level: Level.intermediate,
    equipment: Equipment.barbell,
    category: Category.strength,
    instructions: ["Romanian deadlift"]
  },
  {
    name: "Push Up",
    primaryMuscles: [Muscle.chest, Muscle.shoulders, Muscle.triceps],
    secondaryMuscles: [],
    level: Level.beginner,
    equipment: Equipment.body,
    category: Category.strength,
    instructions: ["Basic push up"]
  },
  {
    name: "Diamond Push Up",
    primaryMuscles: [Muscle.triceps, Muscle.chest, Muscle.shoulders],
    secondaryMuscles: [],
    level: Level.intermediate,
    equipment: Equipment.body,
    category: Category.strength,
    instructions: ["Diamond push up"]
  }
];

export function testNameIndexer(): void {
  console.log('Testing Exercise Name Indexer...\n');

  const indexer = new ExerciseNameIndexer({
    minRootNameLength: 2,
    sortVariationsBy: 'name'
  });

  // Add sample exercises
  for (const exercise of sampleExercises) {
    indexer.addExercise(exercise);
  }

  // Build index
  const index = indexer.buildNameIndex();

  console.log('=== Index Statistics ===');
  const stats = indexer.getIndexStats(index);
  console.log(`Total exercises: ${stats.totalExercises}`);
  console.log(`Total groups: ${stats.totalGroups}`);
  console.log(`Groups with variations: ${stats.groupsWithVariations}`);
  console.log(`Largest group size: ${stats.largestGroupSize}`);
  console.log(`Average group size: ${stats.averageGroupSize.toFixed(2)}`);

  console.log('\n=== Exercise Groups ===');
  for (const group of index.groups) {
    console.log(`\n"${group.rootName}" (${group.exercises.length} variations):`);
    group.exercises.forEach(exercise => {
      console.log(`  - ${exercise.name}`);
    });
  }

  console.log('\n=== Groups with Variations ===');
  const variationGroups = indexer.getExercisesWithVariations(index.groups);
  console.log(`Found ${variationGroups.length} groups with multiple variations:\n`);

  for (const group of variationGroups) {
    console.log(`🏋️ ${group.rootName}:`);
    console.log(`   Variations: ${group.card.variations.join(', ')}`);
    console.log(`   Muscles: ${group.card.primaryMuscles.join(', ')}`);
    if (group.card.equipment) {
      console.log(`   Equipment: ${group.card.equipment}`);
    }
    console.log('');
  }

  console.log('=== Search Tests ===');

  // Test searches
  const searchTests = [
    "squat",
    "bench press",
    "push up",
    "deadlift",
    "barbell"
  ];

  for (const query of searchTests) {
    const results = indexer.searchByName(query, index.cards);
    console.log(`Search "${query}": ${results.length} results`);
    results.slice(0, 3).forEach(card => {
      console.log(`  - ${card.name} (${card.totalVariations} variations)`);
    });
    if (results.length > 3) {
      console.log(`  ... and ${results.length - 3} more`);
    }
    console.log('');
  }

  console.log('✅ Exercise Name Indexer test completed!');
}

// If run directly
if (require.main === module) {
  testNameIndexer();
}
