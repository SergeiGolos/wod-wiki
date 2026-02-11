export const PLAYGROUND_CONTENT = `# Playground

Welcome to the WOD.WIKI!
This is your local notebook where you can experiment with workout scripts.

\`\`\`wod
Timer 10:00
  - 10 Pushups
  - 10 Situps
  - 10 Squats
\`\`\`
`;

export const getDailyTitle = () => `Daily Log - ${new Date().toLocaleDateString()}`;

export const getDailyTemplate = () => `# ${getDailyTitle()}

## Goals
- [ ] 

## Notes

`;
