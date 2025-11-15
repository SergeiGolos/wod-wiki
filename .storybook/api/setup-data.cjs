const fs = require('fs');
const path = require('path');

/**
 * Setup script to copy exercise data from public/ to API data directory
 * Run this before starting the API server
 */

const publicDir = path.join(__dirname, '../../public');
const dataDir = path.join(__dirname, 'data');

console.log('📦 Setting up API server data...');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Copy exercise-path-index.json
const indexSource = path.join(publicDir, 'exercise-path-index.json');
const indexDest = path.join(dataDir, 'exercise-path-index.json');

if (fs.existsSync(indexSource)) {
  if (!fs.existsSync(indexDest)) {
    console.log('   Copying exercise-path-index.json...');
    fs.copyFileSync(indexSource, indexDest);
  } else {
    console.log('   ✓ exercise-path-index.json already exists');
  }
} else {
  console.warn('   ⚠ Warning: exercise-path-index.json not found in public/');
}

// Copy or symlink exercises directory
const exercisesSource = path.join(publicDir, 'exercises');
const exercisesDest = path.join(dataDir, 'exercises');

if (fs.existsSync(exercisesSource)) {
  // Remove existing symlink/directory if it exists but is invalid
  if (fs.existsSync(exercisesDest)) {
    try {
      const stats = fs.lstatSync(exercisesDest);
      if (stats.isSymbolicLink()) {
        const target = fs.readlinkSync(exercisesDest);
        // Check if symlink target exists, if not, remove it
        if (!fs.existsSync(path.resolve(path.dirname(exercisesDest), target))) {
          console.log('   Removing invalid symlink...');
          fs.unlinkSync(exercisesDest);
        } else {
          console.log('   ✓ exercises directory already exists');
          return;
        }
      } else {
        console.log('   ✓ exercises directory already exists');
        return;
      }
    } catch (error) {
      // If we can't check, try to remove and recreate
      console.log('   Checking exercises directory...');
    }
  }
  
  if (!fs.existsSync(exercisesDest)) {
    console.log('   Creating symlink to exercises directory...');
    try {
      // Try to create symlink first (faster and no disk space duplication)
      fs.symlinkSync(exercisesSource, exercisesDest, 'dir');
      console.log('   ✓ Symlinked exercises directory');
    } catch (error) {
      // If symlink fails (e.g., on Windows without admin), copy the directory
      console.log('   Symlink failed, copying exercises directory (this may take a moment)...');
      copyDirRecursive(exercisesSource, exercisesDest);
      console.log('   ✓ Copied exercises directory');
    }
  }
} else {
  console.warn('   ⚠ Warning: exercises directory not found in public/');
}

console.log('✅ API server data setup complete');

/**
 * Recursively copy directory
 * @param {string} src Source directory
 * @param {string} dest Destination directory
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
