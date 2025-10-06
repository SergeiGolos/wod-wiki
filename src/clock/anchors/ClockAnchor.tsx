import React, { useMemo } from 'react';
import { TimeDisplay, TimeValue } from '../components/TimeDisplay';
import { useTimerElapsed } from '../../runtime/hooks/useTimerElapsed';

interface ClockAnchorProps {
  blockKey: string;
}

export const ClockAnchor: React.FC<ClockAnchorProps> = ({ blockKey }) => {
  const { elapsed } = useTimerElapsed(blockKey);

  const renderPlaceholder = () => (
    <TimeDisplay timeUnits={[{ value: '--', label: 'Minutes' }, { value: '--', label: 'Seconds' }]} />
  );

  // Format time units (recalculates when elapsed changes)
  const timeUnits = useMemo(() => {
    const totalSeconds = Math.floor(elapsed / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const units: TimeValue[] = [];
    if (days > 0) {
      units.push({ value: String(days).padStart(2, '0'), label: 'Days' });
    }
    if (hours > 0 || days > 0) {
      units.push({ value: String(hours).padStart(2, '0'), label: 'Hours' });
    }
    if (minutes > 0 || hours > 0 || days > 0) {
      units.push({ value: String(minutes).padStart(2, '0'), label: 'Minutes' });
    }
    units.push({ value: String(seconds).padStart(2, '0'), label: 'Seconds' });

    return units;
  }, [elapsed]);

  if (elapsed === 0) {
    return renderPlaceholder();
  }

  return (
    <TimeDisplay timeUnits={timeUnits} />
  );
};
