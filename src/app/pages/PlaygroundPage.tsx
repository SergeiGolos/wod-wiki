import React from 'react';
import { Workbench } from '@/components/layout/Workbench';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';

const PLAYGROUND_CONTENT = `# Playground

Welcome to the WOD Wiki Playground!
This is a static environment where you can experiment with workout scripts.

\`\`\`wod
Timer 10:00
  - 10 Pushups
  - 10 Situps
  - 10 Squats
\`\`\`
`;

export const PlaygroundPage: React.FC = () => {
  const navigate = useNavigate();
  const commandStrategy = useMemo(() => new WodNavigationStrategy(navigate), [navigate]);

  return (
    <Workbench
      initialContent={PLAYGROUND_CONTENT}
      mode="static"
      commandStrategy={commandStrategy}
    />
  );
};
