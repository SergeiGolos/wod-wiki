#!/usr/bin/env node

import { buildAndSaveIndex, BuildIndexOptions } from './buildExerciseIndex';
import { join } from 'path';

const DEFAULT_EXERCISES_PATH = './public/exercises';
const DEFAULT_OUTPUT_PATH = './exercise-index.json';

function main() {
  const args = process.argv.slice(2);
  const exercisesPath = args[0] || DEFAULT_EXERCISES_PATH;
  const outputPath = args[1] || DEFAULT_OUTPUT_PATH;

  console.log('🏋️ Exercise Index Generator');
  console.log('============================\n');

  const options: BuildIndexOptions = {
    exercisesPath,
    outputPath,
    indexingOptions: {
      includeAliases: true,
      minSearchTermLength: 2
    }
  };

  try {
    const index = buildAndSaveIndex(options);

    console.log('\n📊 Generation Summary:');
    console.log(`✅ Total exercise groups: ${index.groups.length}`);
    console.log(`✅ Total cards for typeahead: ${index.cards.length}`);
    console.log(`✅ Groups with variations: ${index.groups.filter(g => g.variations.length > 1).length}`);
    console.log(`✅ Index saved to: ${outputPath}`);

    console.log('\n🎯 Top Stats:');
    const topMuscles = Object.entries(index.groupsByMuscle)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 3)
      .map(([muscle, groups]) => `${muscle} (${groups.length})`)
      .join(', ');
    console.log(`   Muscles: ${topMuscles}`);

    const topEquipment = Object.entries(index.groupsByEquipment)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 3)
      .map(([equipment, groups]) => `${equipment} (${groups.length})`)
      .join(', ');
    console.log(`   Equipment: ${topEquipment}`);

    console.log('\n🎉 Exercise index generation completed successfully!');

  } catch (error) {
    console.error('\n❌ Failed to generate exercise index:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}