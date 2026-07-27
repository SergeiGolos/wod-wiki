export interface DemoWidget {
  key: string;
  type: 'value' | 'timeseries' | 'bar' | 'toplist' | 'stacked';
  title: string;
  question: string;
  query: string;
  span?: string;
  unit?: string;
  label?: string;
  limit?: number;
  thresholds?: { green: [number, number]; red: [number, number] };
}

export const DASHBOARD_SOURCE = `# Coaching Dashboard — Training Block Review
\`\`\`dashboard
title: Training Block Review
range: past_16_weeks
widgets:
  - type: query_value
    title: Avg TIS
    query: avg:tis{}
  - type: query_value
    title: Total volume
    query: sum:totalVolume{}
  - type: query_value
    title: Total reps
    query: sum:totalReps{}
  - type: toplist
    title: Volume by effort
    query: sum:totalVolume{} by {effort}
    limit: 6
  - type: timeseries
    title: Weekly tonnage
    query: sum:totalVolume{} by {week}.rollup(1w)
  - type: timeseries
    title: TIS trend
    query: avg:tis{} by {week}.rollup(1w)
  - type: bar
    title: Reps by effort
    query: sum:totalReps{} by {effort}
  - type: stacked_bar
    title: Load by intensity
    query: sum:sessionLoad{} by {intensity}.rollup(1w)
  - type: bar
    title: Distance by discipline
    query: sum:totalDistance{} by {discipline}
  - type: timeseries
    title: Session load trend
    query: sum:sessionLoad{} by {week}.rollup(1w)
\`\`\`
`;

export const DEMO_WIDGETS: DemoWidget[] = [
  { key: 'avgTis', type: 'value', title: 'Avg TIS', question: 'How hard are sessions?', query: 'avg:tis{}', unit: 'pts', label: 'average intensity score' },
  { key: 'totalVolume', type: 'value', title: 'Total volume', question: 'How much total work?', query: 'sum:totalVolume{}', unit: 'kg', label: 'total lifted / moved' },
  { key: 'totalReps', type: 'value', title: 'Total reps', question: 'How many reps?', query: 'sum:totalReps{}', unit: 'reps', label: 'repetitions in range' },
  { key: 'volumeByEffort', type: 'toplist', title: 'Volume by effort', question: 'Where does the volume go?', query: 'sum:totalVolume{} by {effort}', unit: 'kg', limit: 6 },
  { key: 'weeklyTonnage', type: 'timeseries', title: 'Weekly tonnage', question: 'Is volume rising?', query: 'sum:totalVolume{} by {week}.rollup(1w)', unit: 'kg', span: 'md:col-span-2' },
  { key: 'tisTrend', type: 'timeseries', title: 'TIS trend', question: 'Is intensity consistent?', query: 'avg:tis{} by {week}.rollup(1w)', unit: 'pts', span: 'md:col-span-2' },
  { key: 'repsByEffort', type: 'bar', title: 'Reps by effort', question: 'Which moves dominate?', query: 'sum:totalReps{} by {effort}', unit: 'reps', span: 'md:col-span-2 xl:col-span-1' },
  { key: 'loadByIntensity', type: 'stacked', title: 'Load by intensity', question: 'Is training polarized?', query: 'sum:sessionLoad{} by {intensity}.rollup(1w)', unit: 'AU', span: 'md:col-span-2 xl:col-span-1' },
  { key: 'distanceByDiscipline', type: 'bar', title: 'Distance by discipline', question: 'Where is the mileage?', query: 'sum:totalDistance{} by {discipline}', unit: 'm', span: 'md:col-span-2' },
  { key: 'loadTrend', type: 'timeseries', title: 'Session load trend', question: 'Is load building?', query: 'sum:sessionLoad{} by {week}.rollup(1w)', unit: 'AU', span: 'md:col-span-2' },
];
