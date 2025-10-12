import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ExerciseNameIndexer, ExerciseNameIndex } from './ExerciseNameIndexer';

// Simple Exercise interface for file loading
interface SimpleExercise {
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  level: string;
  category: string;
  equipment?: string;
  force?: string;
  mechanic?: string;
  instructions: string[];
}

export interface BuildNameIndexOptions {
  exercisesPath: string;
  outputPath?: string;
  indexingOptions?: {
    minRootNameLength?: number;
    includeExactMatches?: boolean;
    sortVariationsBy?: 'name' | 'level' | 'equipment';
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
function loadExercise(exercisePath: string): SimpleExercise {
  const exerciseFile = join(exercisePath, 'exercise.json');
  const content = readFileSync(exerciseFile, 'utf-8');
  return JSON.parse(content) as SimpleExercise;
}

/**
 * Convert SimpleExercise to the format expected by ExerciseNameIndexer
 */
function convertToExerciseFormat(exercise: SimpleExercise): any {
  return {
    name: exercise.name,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    level: exercise.level,
    category: exercise.category,
    equipment: exercise.equipment,
    force: exercise.force,
    mechanic: exercise.mechanic,
    instructions: exercise.instructions
  };
}

/**
 * Build exercise name index from filesystem
 */
export function buildExerciseNameIndex(options: BuildNameIndexOptions): ExerciseNameIndex {
  const { exercisesPath, indexingOptions } = options;

  console.log('Building exercise name index...');
  console.log(`Scanning exercises in: ${exercisesPath}`);

  // Get all exercise directories
  const exerciseDirectories = getExerciseDirectories(exercisesPath);
  console.log(`Found ${exerciseDirectories.length} exercise directories`);

  // Create indexer
  const indexer = new ExerciseNameIndexer(indexingOptions);

  // Load and add exercises
  let loadedCount = 0;
  for (const directory of exerciseDirectories) {
    try {
      const exercise = loadExercise(directory);
      const convertedExercise = convertToExerciseFormat(exercise);
      indexer.addExercise(convertedExercise);
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
  console.log('Building name-based index structure...');
  const index = indexer.buildNameIndex();

  // Get statistics
  const stats = indexer.getIndexStats(index);

  console.log(`Index built successfully!`);
  console.log(`- Total exercises: ${stats.totalExercises}`);
  console.log(`- Total groups: ${stats.totalGroups}`);
  console.log(`- Groups with variations: ${stats.groupsWithVariations}`);
  console.log(`- Largest group size: ${stats.largestGroupSize}`);
  console.log(`- Average group size: ${stats.averageGroupSize.toFixed(2)}`);

  // Show some example groups with variations
  const variationGroups = indexer.getExercisesWithVariations(index.groups);
  console.log(`\nSample groups with variations:`);
  variationGroups.slice(0, 10).forEach(group => {
    console.log(`- ${group.rootName} (${group.exercises.length} variations)`);
    group.exercises.slice(0, 3).forEach(exercise => {
      console.log(`  • ${exercise.name}`);
    });
    if (group.exercises.length > 3) {
      console.log(`  • ... and ${group.exercises.length - 3} more`);
    }
  });

  return index;
}

/**
 * Save index to file
 */
export function saveNameIndexToFile(index: ExerciseNameIndex, outputPath: string): void {
  const content = JSON.stringify(index, null, 2);
  require('fs').writeFileSync(outputPath, content, 'utf-8');
  console.log(`\nName index saved to: ${outputPath}`);
}

/**
 * CLI function to build and save name index
 */
export function buildAndSaveNameIndex(options: BuildNameIndexOptions): ExerciseNameIndex {
  const index = buildExerciseNameIndex(options);

  if (options.outputPath) {
    saveNameIndexToFile(index, options.outputPath);
  }

  return index;
}

// If run directly
if (require.main === module) {
  const exercisesPath = process.argv[2] || './public/exercises';
  const outputPath = process.argv[3] || './exercise-name-index.json';

  buildAndSaveNameIndex({
    exercisesPath,
    outputPath,
    indexingOptions: {
      minRootNameLength: 2,
      sortVariationsBy: 'name'
    }
  });
}