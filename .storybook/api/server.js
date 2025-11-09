const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.API_PORT || 6007;

// Enable CORS for Storybook
app.use(cors({
  origin: ['http://localhost:6006', 'http://127.0.0.1:6006'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Helper to load workout data
const loadWorkoutData = (category) => {
  const filePath = path.join(__dirname, 'data', `${category}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${category} workouts:`, error);
    return null;
  }
};

// Helper to load exercise index
const loadExerciseIndex = () => {
  const filePath = path.join(__dirname, 'data', 'exercise-path-index.json');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading exercise index:', error);
    return null;
  }
};

// Helper to load specific exercise data
const loadExerciseData = (exercisePath) => {
  // Validate path to prevent directory traversal
  if (exercisePath.includes('..') || exercisePath.startsWith('/')) {
    return null;
  }
  
  const filePath = path.join(__dirname, 'data', 'exercises', exercisePath, 'exercise.json');
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading exercise data from ${exercisePath}:`, error);
    return null;
  }
};

// API Routes

// Get all workout categories
app.get('/api/workouts/categories', (req, res) => {
  res.json({
    categories: ['crossfit', 'swimming', 'strongfirst', 'dan-john']
  });
});

// Get all workouts for a category
app.get('/api/workouts/:category', (req, res) => {
  const { category } = req.params;
  const workouts = loadWorkoutData(category);
  
  if (!workouts) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  res.json(workouts);
});

// Get a specific workout by category and name
app.get('/api/workouts/:category/:name', (req, res) => {
  const { category, name } = req.params;
  const workouts = loadWorkoutData(category);
  
  if (!workouts) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const workout = workouts[name];
  if (!workout) {
    return res.status(404).json({ error: 'Workout not found' });
  }
  
  res.json(workout);
});

// Get exercise index
app.get('/api/exercises/index', (req, res) => {
  const index = loadExerciseIndex();
  
  if (!index) {
    return res.status(500).json({ error: 'Failed to load exercise index' });
  }
  
  res.json(index);
});

// Search exercises by query
app.get('/api/exercises/search', (req, res) => {
  const { q, limit = 50 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  const index = loadExerciseIndex();
  if (!index) {
    return res.status(500).json({ error: 'Failed to load exercise index' });
  }
  
  const normalizedQuery = q.toLowerCase().trim();
  const maxResults = Math.min(parseInt(limit) || 50, 100);
  
  // Simple search implementation
  const results = index.allEntries
    .filter(entry => {
      const nameLower = entry.name.toLowerCase();
      return nameLower.includes(normalizedQuery) || 
             entry.searchTerms.some(term => term.toLowerCase().includes(normalizedQuery));
    })
    .slice(0, maxResults);
  
  res.json({ results, query: q, count: results.length });
});

// Get specific exercise data by path (e.g., /api/exercises/3-4-sit-up)
// Using regex to match paths with or without slashes
app.get(/^\/api\/exercises\/(.+)$/, (req, res) => {
  // Extract exercise path from the regex match
  const exercisePath = req.params[0];
  
  // Skip if it's 'index' or 'search' (those are handled by specific routes above)
  if (exercisePath === 'index' || exercisePath === 'search') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  if (!exercisePath) {
    return res.status(400).json({ error: 'Exercise path is required' });
  }
  
  const exercise = loadExerciseData(exercisePath);
  
  if (!exercise) {
    return res.status(404).json({ error: 'Exercise not found' });
  }
  
  res.json(exercise);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🏋️  Workout API server running at http://localhost:${PORT}`);
  console.log(`📚 Available endpoints:`);
  console.log(`   GET /api/health - Health check`);
  console.log(`   GET /api/workouts/categories - List all categories`);
  console.log(`   GET /api/workouts/:category - Get all workouts in category`);
  console.log(`   GET /api/workouts/:category/:name - Get specific workout`);
  console.log(`   GET /api/exercises/index - Get exercise index`);
  console.log(`   GET /api/exercises/search?q=<query>&limit=<n> - Search exercises`);
  console.log(`   GET /api/exercises/:exercisePath - Get specific exercise data`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
