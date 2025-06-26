# Clock Components

The clock functionality is built as a set of React components and hooks that work together to display time, labels, and metrics based on `CollectionSpan` data.

## Core Components

### `ClockAnchor`

Displays a formatted time based on the `timeSpans` property of a `CollectionSpan` object. It uses the `useTimespan` hook to calculate the elapsed time and renders it using the `TimeDisplay` component.

-   **Props**:
    -   `span?: CollectionSpan`: The data source for the clock. If the span is not provided or has no timeSpans, it will render a placeholder (`--:--`).

### `LabelAnchor`

Displays customizable text labels. It can extract data from the provided `CollectionSpan` using a simple template system.

-   **Props**:
    -   `span?: CollectionSpan`: The data source.
    -   `template?: string`: A string with `{{key}}` placeholders (e.g., `{{blockKey}}`) that get replaced with values from the `span` object.
    -   `variant?: 'badge' | 'title' | 'subtitle' | 'next-up' | 'default'`: Applies different styling to the label.
    -   `className?: string`: Allows for additional custom styling.

### `MetricAnchor`

Aggregates and displays metric data from a `CollectionSpan`.

-   **Props**:
    -   `span?: CollectionSpan`: The data source.
    -   `sourceId?: number`: Filters metrics by their `sourceId`.
    -   `metricType?: string`: Filters metrics by their `type`.
    -   `aggregator?: 'sum' | 'avg' | 'min' | 'max' | 'count'`: Determines how the metric values are aggregated. Defaults to `sum`.

## UI Components

-   **`TimeDisplay`**: Renders a series of `TimeUnit` components with separators, creating the full clock face (e.g., `HH:MM:SS`).
-   **`TimeUnit`**: Displays a single time value and its corresponding label (e.g., "42" and "Seconds").

## Hooks

### `useTimespan`

A React hook that calculates the total duration from an array of `TimeSpan` objects.

-   It correctly handles running timers (where `stop` time is not defined) by updating on a set interval.
-   It returns an array of `TimeValue` objects, which includes the formatted time value and its label (e.g., `{ value: '05', label: 'Minutes' }`).
-   The hook dynamically determines which time units to display (e.g., it won't show "Hours" if the duration is less than an hour).

## Example Usage

Here's a basic example of how to use the anchor components, taken from the project's Storybook:

```tsx
import React from 'react';
import { ClockAnchor } from '../../src/clock/anchors/ClockAnchor';
import { LabelAnchor } from '../../src/clock/anchors/LabelAnchor';
import { CollectionSpan } from '../../src/CollectionSpan';

const MyWorkoutDisplay = () => {
    const mySpan: CollectionSpan = {
      blockKey: 'Jumping Jacks',
      duration: 185000, // 3 minutes 5 seconds
      timeSpans: [{ start: new Date(Date.now() - 185000), stop: new Date() }],
      metrics: [],
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <ClockAnchor span={mySpan} />
            <div className="mb-12 text-center mt-8">
                <LabelAnchor span={mySpan} variant="badge" template="Warm-up" />
                <LabelAnchor span={mySpan} variant="title" template="{{blockKey}}" />
                <LabelAnchor span={mySpan} variant="subtitle" template="30 seconds" />
            </div>
            <LabelAnchor span={mySpan} variant="next-up" template="Next up: 30s Plank" />
        </div>
    );
}
```