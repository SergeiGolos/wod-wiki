import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { OverviewPage } from './OverviewPage';

const meta: Meta<typeof OverviewPage> = {
  title: 'Overview',
  component: OverviewPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Project Overview highlighting key features and navigation.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Detailed Story Placeholders
const DetailPage: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-12 max-w-4xl mx-auto">
    <header className="mb-8">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <div className="h-1 w-24 bg-primary rounded-full mb-8" />
    </header>
    <div className="prose prose-slate max-w-none">
      {children}
    </div>
    <div className="mt-12 pt-8 border-t flex gap-4">
      <button 
        onClick={() => { if (window.parent) window.parent.location.href = './?path=/story/overview--default'; }}
        className="text-primary hover:underline text-sm font-semibold uppercase tracking-widest"
      >
        &larr; Back to Overview
      </button>
    </div>
  </div>
);

export const Planning: Story = {
  render: () => (
    <DetailPage title="Intelligent Planning">
      <p className="text-xl text-muted-foreground leading-relaxed mb-6">
        Plan workouts with precision using Markdown. WOD Wiki allows you to define complex logic that traditional trackers struggle with.
      </p>
      <h3 className="text-2xl font-bold mb-4">Features</h3>
      <ul className="list-disc pl-6 space-y-4 text-lg">
        <li><strong>Markdown Syntax:</strong> Human-readable workout files that live in your repository.</li>
        <li><strong>LLM Integration:</strong> Convert natural language descriptions into structured workout logic.</li>
        <li><strong>Complex Loops:</strong> Nested rounds, AMRAPs, and EMOMs defined in simple text.</li>
        <li><strong>Metrics:</strong> Define exactly what you want to track for each movement.</li>
      </ul>
    </DetailPage>
  )
};

export const Tracking: Story = {
  render: () => (
    <DetailPage title="Real-time Tracking">
      <p className="text-xl text-muted-foreground leading-relaxed mb-6">
        Execute your plan with a robust runtime engine that handles the timing and metric collection automatically.
      </p>
      <h3 className="text-2xl font-bold mb-4">Features</h3>
      <ul className="list-disc pl-6 space-y-4 text-lg">
        <li><strong>Precise Engine:</strong> Handles countdowns, count-ups, and interval transitions with millisecond accuracy.</li>
        <li><strong>Automated Metrics:</strong> Focus on the workout, not the logging. The system records your performance as you go.</li>
        <li><strong>Live Feedback:</strong> Visual indicators for your current block, progress through rounds, and target metrics.</li>
        <li><strong>Flexible Execution:</strong> Pause, resume, or skip blocks as needed during your session.</li>
      </ul>
    </DetailPage>
  )
};

export const Review: Story = {
  render: () => (
    <DetailPage title="Analytics & Review">
      <p className="text-xl text-muted-foreground leading-relaxed mb-6">
        Analyze your performance with powerful data tools that turn workout outputs into actionable insights.
      </p>
      <h3 className="text-2xl font-bold mb-4">Features</h3>
      <ul className="list-disc pl-6 space-y-4 text-lg">
        <li><strong>Review Grid:</strong> A powerful data table to filter and pivot your workout history.</li>
        <li><strong>Visual Trends:</strong> Integrated Recharts graphs showing performance over time.</li>
        <li><strong>Export Ready:</strong> Save your data in structured formats for use in other analytics tools.</li>
        <li><strong>Historical Context:</strong> Compare today's performance with past results directly in the review screen.</li>
      </ul>
    </DetailPage>
  )
};

export const Chromecast: Story = {
  render: () => (
    <DetailPage title="Chromecast Display">
      <p className="text-xl text-muted-foreground leading-relaxed mb-6">
        Bring your workouts to the big screen. Cast your session to any Chromecast-enabled TV.
      </p>
      <h3 className="text-2xl font-bold mb-4">Features</h3>
      <ul className="list-disc pl-6 space-y-4 text-lg">
        <li><strong>10-Foot UI:</strong> Interface specifically designed for visibility from across the gym.</li>
        <li><strong>Remote Navigation:</strong> Full support for D-Pad remotes to navigate the workout without touching your phone.</li>
        <li><strong>Synchronized State:</strong> The sender (phone/tablet) and receiver (TV) stay perfectly in sync.</li>
        <li><strong>Low Latency:</strong> Real-time updates ensure the timer on the TV matches the runtime state exactly.</li>
      </ul>
    </DetailPage>
  )
};

export const DataOwnership: Story = {
  render: () => (
    <DetailPage title="Data Ownership">
      <p className="text-xl text-muted-foreground leading-relaxed mb-6">
        Your workout data is too important to be locked in a proprietary cloud service.
      </p>
      <h3 className="text-2xl font-bold mb-4">Our Philosophy</h3>
      <ul className="list-disc pl-6 space-y-4 text-lg">
        <li><strong>Markdown-First:</strong> Every workout is a text file. You can read it, edit it, and version control it with Git.</li>
        <li><strong>Local Storage:</strong> Your history stays on your device by default. You choose where to sync it.</li>
        <li><strong>No Lock-in:</strong> Move your data to any other platform whenever you want.</li>
        <li><strong>Privacy:</strong> No forced cloud accounts or data harvesting. Your performance is your business.</li>
      </ul>
    </DetailPage>
  )
};
