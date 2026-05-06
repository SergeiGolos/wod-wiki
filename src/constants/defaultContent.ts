export const PLAYGROUND_CONTENT = `# My Workout Notebook

Welcome to the **WOD.WIKI** playground. 
This editor uses **Whiteboard Script**, a markdown-based language for defining workouts.

## Getting Started
1. Hover over a code block below.
2. Click **Run** to start the interactive timer.
3. Track your progress with checkboxes and metrics.

## Example Workout
\`\`\`wod
Timer 12:00
  - 10 Pushups
  - 10 Situps
  - 10 Squats
  - [ ] 200m Run { intensity: 80% }
\`\`\`

## Advanced: Repeaters
\`\`\`wod
3x
  - 10 Kettlebell Swings (24kg)
  - 5 Burpees
  - 30s Rest
\`\`\`
`;


export const getDailyTitle = () => `Daily Log - ${new Date().toLocaleDateString()}`;

export const getDailyTemplate = () => `# ${getDailyTitle()}

## Goals
- [ ] 

## Notes

`;
