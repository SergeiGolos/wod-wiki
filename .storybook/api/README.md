# Workout API Server

This directory contains the API server that runs alongside Storybook in development mode to serve workout data via HTTP requests.

## Overview

The API server was created to improve Storybook performance by moving workout data out of JavaScript bundles and serving it on-demand via API endpoints. This prevents large data payloads from being bundled with the initial page load, significantly improving load times.

## Architecture

- **Server**: Express.js server (`server.js`)
- **Data**: JSON files in `data/` directory containing workout definitions
- **Port**: 6007 (configurable via `API_PORT` environment variable)
- **CORS**: Enabled for `http://localhost:6006` (Storybook)

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-09T16:00:00.000Z"
}
```

### Get All Categories
```
GET /api/workouts/categories
```
Returns list of all workout categories.

**Response:**
```json
{
  "categories": ["crossfit", "swimming", "strongfirst", "dan-john"]
}
```

### Get All Workouts in Category
```
GET /api/workouts/:category
```
Returns all workouts for a specific category.

**Example:**
```bash
curl http://localhost:6007/api/workouts/crossfit
```

**Response:**
```json
{
  "Fran": {
    "name": "Fran",
    "workout": "(21-15-9) \n  Thursters 95lb\n  Pullups"
  },
  "Annie": {
    "name": "Annie",
    "workout": "(50-40-30-20-10)\n  Double-Unders\n  Situps"
  },
  ...
}
```

### Get Specific Workout
```
GET /api/workouts/:category/:name
```
Returns a specific workout by category and name.

**Example:**
```bash
curl http://localhost:6007/api/workouts/crossfit/Fran
```

**Response:**
```json
{
  "name": "Fran",
  "workout": "(21-15-9) \n  Thursters 95lb\n  Pullups"
}
```

## Running the Server

### With Storybook (Recommended)
The server starts automatically when you run Storybook:
```bash
npm run storybook
```

### Standalone
You can also run the API server independently:
```bash
npm run api-server
```

### Custom Port
Set a custom port via environment variable:
```bash
API_PORT=8080 npm run api-server
```

## Data Format

Workout data files in `data/` directory follow this JSON structure:

```json
{
  "WorkoutName": {
    "name": "Display Name",
    "workout": "Workout definition using WOD Wiki syntax"
  }
}
```

## Adding New Workouts

1. Edit the appropriate JSON file in `data/` directory:
   - `crossfit.json` - CrossFit benchmark workouts
   - `swimming.json` - Swimming workouts
   - `strongfirst.json` - StrongFirst kettlebell workouts
   - `dan-john.json` - Dan John training programs

2. Follow the existing format:
```json
{
  "NewWorkout": {
    "name": "New Workout",
    "workout": "10:00 AMRAP\n  10 Pushups\n  20 Situps"
  }
}
```

3. Restart the server to load the new data.

## Client Usage

Stories can fetch workout data using the utilities in `stories/utils/workoutApi.ts`:

```typescript
import { fetchWorkout, fetchWorkoutsByCategory } from '../utils/workoutApi';

// Fetch a specific workout
const workout = await fetchWorkout('crossfit', 'Fran');

// Fetch all workouts in a category
const allCrossfitWorkouts = await fetchWorkoutsByCategory('crossfit');

// Check API health
const isHealthy = await checkApiHealth();
```

## Troubleshooting

### API Server Not Starting
- Check if port 6007 is already in use
- Verify Node.js version (requires Node 14+)
- Check server logs for specific errors

### CORS Errors
- Ensure Storybook is running on `http://localhost:6006`
- Check CORS configuration in `server.js`

### Workout Not Found
- Verify the workout exists in the appropriate JSON file
- Check spelling of category and workout name (case-sensitive)
- Restart the server after adding new workouts
