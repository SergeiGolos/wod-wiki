import { buildExerciseIndex } from './buildExerciseIndex';
import { join } from 'path';

// Test the indexing tool with a sample of exercises
export function testExerciseIndexer(): void {
  console.log('Testing Exercise Indexer...\n');

  try {
    const index = buildExerciseIndex({
      exercisesPath: join(__dirname, '../../public/exercises'),
      indexingOptions: {
        includeAliases: true,
        minSearchTermLength: 2
      }
    });

    // Test search functionality
    console.log('\n=== Testing Search ===');

    // Search for "barbell"
    const barbellResults = index.cards.filter(card =>
      card.searchTerms.some(term => term.includes('barbell'))
    );
    console.log(`Barbell exercises: ${barbellResults.length}`);
    barbellResults.slice(0, 5).forEach(card => {
      console.log(`  - ${card.name} (${card.variationCount} variations)`);
    });

    // Search for "abdominals"
    const abResults = index.cards.filter(card =>
      card.primaryMuscles.some(muscle => muscle.includes('abdominals'))
    );
    console.log(`Abdominal exercises: ${abResults.length}`);
    abResults.slice(0, 5).forEach(card => {
      console.log(`  - ${card.name} (${card.primaryMuscles.join(', ')})`);
    });

    // Test filtering
    console.log('\n=== Testing Filtering ===');
    const beginnerStrength = index.cards.filter(card =>
      card.level === 'beginner' && card.category === 'strength'
    );
    console.log(`Beginner strength exercises: ${beginnerStrength.length}`);

    const bodyweightExercises = index.cards.filter(card =>
      card.equipment === 'body only'
    );
    console.log(`Bodyweight exercises: ${bodyweightExercises.length}`);

    // Test grouping
    console.log('\n=== Testing Grouping ===');

    // Find groups with multiple variations
    const multiVariationGroups = index.groups.filter(group => group.variations.length > 1);
    console.log(`Groups with multiple variations: ${multiVariationGroups.length}`);

    multiVariationGroups.slice(0, 5).forEach(group => {
      console.log(`\n${group.rootExercise}:`);
      console.log(`  Base: ${group.baseExercise.name}`);
      console.log(`  Variations (${group.variations.length}):`);
      group.variations.forEach(variation => {
        console.log(`    - ${variation.name} (${variation.level})`);
      });
    });

    // Test muscle grouping
    console.log('\n=== Testing Muscle Grouping ===');
    Object.entries(index.groupsByMuscle)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 5)
      .forEach(([muscle, groups]) => {
        console.log(`${muscle}: ${groups.length} groups`);
        groups.slice(0, 3).forEach(group => {
          console.log(`  - ${group.rootExercise}`);
        });
      });

    // Test equipment grouping
    console.log('\n=== Testing Equipment Grouping ===');
    Object.entries(index.groupsByEquipment)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 5)
      .forEach(([equipment, groups]) => {
        console.log(`${equipment}: ${groups.length} groups`);
      });

    console.log('\n✅ Exercise Indexer test completed successfully!');

  } catch (error) {
    console.error('❌ Exercise Indexer test failed:', error);
    process.exit(1);
  }
}

// If run directly
if (require.main === module) {
  testExerciseIndexer();
}
