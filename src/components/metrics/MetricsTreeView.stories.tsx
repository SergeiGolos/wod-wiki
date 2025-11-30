import type { Meta, StoryObj } from '@storybook/react';
import { MetricsTreeView, MetricItem } from './MetricsTreeView';
import { Clock, Play, Activity } from 'lucide-react';

const meta: Meta<typeof MetricsTreeView> = {
  title: 'Metrics/MetricsTreeView',
  component: MetricsTreeView,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof MetricsTreeView>;

const Tag = ({ icon, text, color = "blue" }: { icon?: string, text: string, color?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-mono border bg-${color}-100 border-${color}-200 text-${color}-800 dark:bg-${color}-900/50 dark:border-${color}-800 dark:text-${color}-100 bg-opacity-60 shadow-sm`}>
    {icon && <span className="text-base leading-none">{icon}</span>}
    <span>{text}</span>
  </span>
);

const trackItems: MetricItem[] = [
  {
    id: '1',
    parentId: null,
    lane: 0,
    title: '20:00 AMRAP',
    icon: <Clock className="h-3 w-3 text-blue-500 animate-pulse" />,
    tags: <Tag icon="⏱️" text="20:00 AMRAP" />,
    footer: <span>0s</span>
  },
  {
    id: '2',
    parentId: '1',
    lane: 0,
    title: 'Workout Started',
    icon: <Play className="h-3 w-3 text-primary" />,
    tags: <Tag icon="⏱️" text="12:09:46 PM" />,
    footer: <span>0s</span>
  },
  {
    id: '3',
    parentId: '1',
    lane: 0,
    title: 'Effort',
    icon: <Clock className="h-3 w-3 text-blue-500 animate-pulse" />,
    tags: <Tag icon="🏃" text="Effort" color="yellow" />,
    footer: <span>0s</span>
  },
  {
    id: '4',
    parentId: '3',
    lane: 1,
    title: 'Workout',
    icon: <Clock className="h-3 w-3 text-blue-500 animate-pulse" />,
    tags: <Tag text="Workout" color="gray" />,
    footer: <span>0s</span>
  }
];

export const TrackView: Story = {
  args: {
    items: trackItems,
    className: "w-[400px] h-[600px] border-r",
    selectedIds: new Set(['1'])
  },
};

const analyzeItems: MetricItem[] = [
  {
    id: 'root',
    parentId: null,
    lane: 0,
    title: 'Full Session',
    icon: <Activity className="h-3 w-3 text-primary" />,
    tags: (
      <>
        <Tag text="root" color="gray" />
        <Tag icon="⏱️" text="20m 0s" />
        <Tag icon="💪" text="169W" color="red" />
      </>
    ),
    footer: <div className="flex gap-1"><span>169W</span><span>144♥</span></div>
  },
  {
    id: 'warmup',
    parentId: 'root',
    lane: 1,
    title: 'Warmup',
    icon: <Activity className="h-3 w-3 text-yellow-500" />,
    tags: (
      <>
        <Tag text="warmup" color="gray" />
        <Tag icon="⏱️" text="5m 0s" />
        <Tag icon="💪" text="100W" color="red" />
      </>
    ),
    footer: <div className="flex gap-1"><span>100W</span><span>107♥</span></div>
  },
  {
    id: 'ramp',
    parentId: 'warmup',
    lane: 2,
    title: 'Spin Up',
    icon: <Activity className="h-3 w-3 text-purple-500" />,
    tags: (
      <>
        <Tag text="ramp" color="gray" />
        <Tag icon="⏱️" text="1m 20s" />
        <Tag icon="💪" text="100W" color="red" />
      </>
    ),
    footer: <div className="flex gap-1"><span>100W</span><span>111♥</span></div>
  },
  {
    id: 'work',
    parentId: 'root',
    lane: 1,
    title: 'Main Set',
    icon: <Activity className="h-3 w-3 text-red-500" />,
    tags: (
      <>
        <Tag text="work" color="gray" />
        <Tag icon="⏱️" text="10m 0s" />
        <Tag icon="💪" text="232W" color="red" />
      </>
    ),
    footer: <div className="flex gap-1"><span>232W</span><span>174♥</span></div>
  },
  {
    id: 'int1',
    parentId: 'work',
    lane: 2,
    title: 'Interval 1',
    icon: <Activity className="h-3 w-3 text-orange-500" />,
    tags: (
      <>
        <Tag text="interval" color="gray" />
        <Tag icon="⏱️" text="2m 0s" />
        <Tag icon="💪" text="278W" color="red" />
      </>
    ),
    footer: <div className="flex gap-1"><span>278W</span><span>187♥</span></div>
  }
];

export const AnalyzeView: Story = {
  args: {
    items: analyzeItems,
    className: "w-[400px] h-[600px] border-r",
    selectedIds: new Set(['root'])
  },
};
