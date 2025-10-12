import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ExerciseIndexer, ExerciseIndex } from './ExerciseIndexer';
import { Exercise } from '../exercise';

export interface BuildIndexOptions {
  exercisesPath: string;
  outputPath?: string;
  indexingOptions?: {
    includeAliases?: boolean;
    maxVariationsToShow?: number;
    minSearchTermLength?: number;
  };
}

/**
 * Recursively get all exercise directories
 */
function getExerciseDirectories(basePath: string): string[] {
  const directories: string[] = [];

  function scanDirectory(currentPath: string) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Check if this directory contains exercise.json
        const exerciseFile = join(fullPath, 'exercise.json');
        try {
          statSync(exerciseFile);
          directories.push(fullPath);
        } catch {
          // Not an exercise directory, scan deeper
          scanDirectory(fullPath);
        }
      }
    }
  }

  scanDirectory(basePath);
  return directories;
}

/**
 * Load exercise from JSON file
 */
function loadExercise(exercisePath: string): { id: string; exercise: Exercise } {
  const exerciseFile = join(exercisePath, 'exercise.json');
  const content = readFileSync(exerciseFile, 'utf-8');
  const exercise: Exercise = JSON.parse(content);

  // Generate ID from directory name
  const id = exercisePath.split(/[/\\]/).pop() || '';

  return { id, exercise };
}

/**
 * Build exercise index from filesystem
 */
export function buildExerciseIndex(options: BuildIndexOptions): ExerciseIndex {
  const { exercisesPath, indexingOptions } = options;

  console.log('Building exercise index...');
  console.log(`Scanning exercises in: ${exercisesPath}`);

  // Get all exercise directories
  const exerciseDirectories = getExerciseDirectories(exercisesPath);
  console.log(`Found ${exerciseDirectories.length} exercise directories`);

  // Create indexer
  const indexer = new ExerciseIndexer(indexingOptions);

  // Load and add exercises
  let loadedCount = 0;
  for (const directory of exerciseDirectories) {
    try {
      const { id, exercise } = loadExercise(directory);
      indexer.addExercise(id, exercise);
      loadedCount++;

      if (loadedCount % 100 === 0) {
        console.log(`Loaded ${loadedCount} exercises...`);
      }
    } catch (error) {
      console.warn(`Failed to load exercise from ${directory}:`, error);
    }
  }

  console.log(`Successfully loaded ${loadedCount} exercises`);

  // Build index
  console.log('Building index structure...');
  const index = indexer.buildIndex();

  console.log(`Index built successfully!`);
  console.log(`- Groups: ${index.groups.length}`);
  console.log(`- Cards: ${index.cards.length}`);
  console.log(`- Unique root exercises: ${Object.keys(index.groupsByName).length}`);

  // Show some statistics
  const muscleCounts = Object.entries(index.groupsByMuscle)
    .map(([muscle, groups]) => `${muscle}: ${groups.length}`)
    .slice(0, 5);
  console.log(`- Top muscles: ${muscleCounts.join(', ')}...`);

  const equipmentCounts = Object.entries(index.groupsByEquipment)
    .map(([equipment, groups]) => `${equipment}: ${groups.length}`)
    .slice(0, 5);
  console.log(`- Top equipment: ${equipmentCounts.join(', ')}...`);

  return index;
}

/**
 * Save index to file
 */
export function saveIndexToFile(index: ExerciseIndex, outputPath: string): void {
  const content = JSON.stringify(index, null, 2);
  require('fs').writeFileSync(outputPath, content, 'utf-8');
  console.log(`Index saved to: ${outputPath}`);
}

/**
 * CLI function to build and save index
 */
export function buildAndSaveIndex(options: BuildIndexOptions): ExerciseIndex {
  const index = buildExerciseIndex(options);

  if (options.outputPath) {
    saveIndexToFile(index, options.outputPath);
  }

  return index;
}

// If run directly
if (require.main === module) {
  const exercisesPath = process.argv[2] || './public/exercises';
  const outputPath = process.argv[3] || './exercise-index.json';

  buildAndSaveIndex({
    exercisesPath,
    outputPath,
    indexingOptions: {
      includeAliases: true,
      minSearchTermLength: 2
    }
  });
}