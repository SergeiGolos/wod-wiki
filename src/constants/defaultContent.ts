export const PLAYGROUND_CONTENT = `\`\`\`widget:hero
{
  "intervalMs": 5000,
  "cards": [
    {
      "title": "WOD.WIKI",
      "subtitle": "Your Workout Notebook",
      "body": "Script, time, and analyse every training session — right here in your browser.",
      "cta": "See example →"
    },
    {
      "title": "Real-time Timer",
      "subtitle": "Built for athletes",
      "body": "Countdown, AMRAP, EMOM — every dialect supported with an inline timer that follows your script.",
      "badge": "Try it"
    },
    {
      "title": "Track Progress",
      "subtitle": "Log & reflect",
      "body": "Every session is stored locally. Review trends, notes, and results any time."
    }
  ]
}
\`\`\`

# Playground

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
