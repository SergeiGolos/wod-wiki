import React from 'react';
import { CollectionSpan } from '../../CollectionSpan';

interface LabelAnchorProps {
  span?: CollectionSpan;
  template?: string;
  variant?: 'badge' | 'title' | 'subtitle' | 'next-up' | 'default';
  className?: string;
}

const resolveTemplate = (template: string, data: CollectionSpan) => {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const value = (data as any)[key.trim()];
    return value !== undefined ? String(value) : match;
  });
};

// Component for displaying metric information in a nice formatted way
export const LabelDisplay: React.FC<LabelAnchorProps> = ({
  span,
  template,
  variant = 'default',
  className,
}) => {
  const variantClasses = {
    default: "text-gray-600 text-lg font-medium leading-normal",
    badge: "inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-3 py-1 rounded-full mb-2",
    title: "text-gray-900 text-4xl font-bold leading-tight tracking-tight mb-2",
    subtitle: "text-gray-600 text-lg font-medium leading-normal",
    'next-up': "text-emerald-600 text-lg font-medium leading-normal mb-12",
  };

  // Check if there are any metrics to display
  if (!span?.metrics || span.metrics.length === 0) {
    return (
      <div className={`mx-auto flex items-center justify-center ${variantClasses[variant]} ${className || ""}`}>
        <span className="text-2xl md:text-3xl text-gray-400">No exercise</span>
      </div>
    );
  }

  return (
    <div className={`mx-auto flex flex-col items-start space-y-3 ${variantClasses[variant]} ${className || ""}`}>
      {span.metrics.map((metric, metricIndex) => {
        const effortText = template ? resolveTemplate(template, span) : 
                          span.blockKey || `Exercise ${metricIndex + 1}`;
        
        // Extract values by type
        const reps = metric.values?.find(v => v.type === 'repetitions');
        const resistance = metric.values?.find(v => v.type === 'resistance');
        const distance = metric.values?.find(v => v.type === 'distance');
        
        return (
          <div key={`${metric.sourceId}-${metricIndex}`} className="w-full">
            <div className="flex flex-wrap items-center gap-2 text-lg md:text-xl">
              {/* Repetitions with icon and styling */}
              {reps && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                  <span className="mr-1">🔄</span>
                  {reps.value}
                </span>
              )}
              
              {/* Effort text */}
              <span className="font-semibold text-gray-800">
                {effortText}
              </span>
              
              {/* Resistance with icon and styling */}
              {resistance && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                  <span className="mr-1">💪</span>
                  {resistance.value}{resistance.unit || ''}
                </span>
              )}
              
              {/* Distance with icon and styling */}
              {distance && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                  <span className="mr-1">📏</span>
                  {distance.value}{distance.unit || ''}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Component that displays label information for a span
export const LabelAnchor: React.FC<LabelAnchorProps> = ({
  span,
  template,
  variant = 'default',
  className,
}) => {
  return (
    <LabelDisplay
      span={span}
      template={template}
      variant={variant}
      className={className}
    />
  );
};
