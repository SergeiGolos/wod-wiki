import React from 'react';
import { Workbench } from '@/components/layout/Workbench';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { WodNavigationStrategy } from '@/components/command-palette/strategies/WodNavigationStrategy';

import { PLAYGROUND_CONTENT } from '@/constants/defaultContent';

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
