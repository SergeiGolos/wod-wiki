import React from 'react';
import { CollectionSpan } from '../../CollectionSpan';
import { TimeDisplay } from '../components/TimeDisplay';
import { useStopwatch } from '../hooks/useStopwatch';

interface ClockAnchorProps {
  span?: CollectionSpan;
}

export const ClockAnchor: React.FC<ClockAnchorProps> = ({ span }) => {
  const timeUnits = useStopwatch(span?.timeSpans || []);

  const renderPlaceholder = () => (
    <TimeDisplay timeUnits={[{ value: '--', label: 'Minutes' }, { value: '--', label: 'Seconds' }]} />
  );

  if (!span || span.timeSpans.length === 0) {
    return renderPlaceholder();
  }

  return (
    <TimeDisplay timeUnits={timeUnits} />
  );
};
