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
