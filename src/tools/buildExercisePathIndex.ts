import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { ExercisePathIndexer, ExercisePathIndex } from './ExercisePathIndexer';

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

export interface BuildPathIndexOptions {
  exercisesPath: string;
  outputPath?: string;
  basePath?: string;              // Base path for relative paths
  indexingOptions?: {
    minRootNameLength?: number;
    includeEquipmentInSearch?: boolean;
    includeMusclesInSearch?: boolean;
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
 * Generate additional search terms from exercise data
 */
function generateAdditionalSearchTerms(exercise: SimpleExercise, options: any): string[] {
  const terms: string[] = [];

  // Add equipment if enabled
  if (options.includeEquipmentInSearch && exercise.equipment) {
    terms.push(exercise.equipment);
  }

  // Add muscles if enabled
  if (options.includeMusclesInSearch) {
    exercise.primaryMuscles.forEach(muscle => terms.push(muscle));
    exercise.secondaryMuscles.forEach(muscle => terms.push(muscle));
  }

  // Add category
  terms.push(exercise.category);

  // Add level
  terms.push(exercise.level);

  return terms;
}

/**
 * Build exercise path index from filesystem
 */
export function buildExercisePathIndex(options: BuildPathIndexOptions): ExercisePathIndex {
  const { exercisesPath, basePath = exercisesPath, indexingOptions } = options;

  console.log('Building exercise path index...');
  console.log(`Scanning exercises in: ${exercisesPath}`);
  console.log(`Base path for relative paths: ${basePath}`);

  // Get all exercise directories
  const exerciseDirectories = getExerciseDirectories(exercisesPath);
  console.log(`Found ${exerciseDirectories.length} exercise directories`);

  // Create indexer
  const indexer = new ExercisePathIndexer(indexingOptions);

  // Load and add exercises
  let loadedCount = 0;
  for (const directory of exerciseDirectories) {
    try {
      const exercise = loadExercise(directory);
      const relativePath = relative(basePath, directory).replace(/\\/g, '/'); // Normalize path separators

      // Generate additional search terms
      const additionalTerms = generateAdditionalSearchTerms(exercise, indexingOptions || {});

      indexer.addExercise(exercise.name, relativePath, additionalTerms);
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
  console.log('Building path-based index structure...');
  const index = indexer.buildPathIndex();

  // Get statistics
  const stats = indexer.getIndexStats(index);

  console.log(`Index built successfully!`);
  console.log(`- Total exercises: ${stats.totalExercises}`);
  console.log(`- Total groups: ${stats.totalGroups}`);
  console.log(`- Groups with variations: ${stats.groupsWithVariations}`);
  console.log(`- Largest group size: ${stats.largestGroupSize}`);
  console.log(`- Average group size: ${stats.averageGroupSize.toFixed(2)}`);

  // Show some example groups with variations
  const variationGroups = index.groups.filter(g => g.variations.length > 1);
  console.log(`\nSample groups with variations:`);
  variationGroups.slice(0, 10).forEach(group => {
    console.log(`- ${group.rootName} (${group.variations.length} variations)`);
    group.variations.slice(0, 3).forEach(variation => {
      console.log(`  • ${variation.name} -> ${variation.path}`);
    });
    if (group.variations.length > 3) {
      console.log(`  • ... and ${group.variations.length - 3} more`);
    }
  });

  return index;
}

/**
 * Save index to file
 */
export function savePathIndexToFile(index: ExercisePathIndex, outputPath: string): void {
  const content = JSON.stringify(index, null, 2);
  require('fs').writeFileSync(outputPath, content, 'utf-8');
  console.log(`\nPath index saved to: ${outputPath}`);
}

/**
 * CLI function to build and save path index
 */
export function buildAndSavePathIndex(options: BuildPathIndexOptions): ExercisePathIndex {
  const index = buildExercisePathIndex(options);

  if (options.outputPath) {
    savePathIndexToFile(index, options.outputPath);
  }

  return index;
}

// If run directly
if (require.main === module) {
  const exercisesPath = process.argv[2] || './public/exercises';
  const outputPath = process.argv[3] || './exercise-path-index.json';

  buildAndSavePathIndex({
    exercisesPath,
    outputPath,
    indexingOptions: {
      minRootNameLength: 2,
      includeEquipmentInSearch: true,
      includeMusclesInSearch: true
    }
  });
}